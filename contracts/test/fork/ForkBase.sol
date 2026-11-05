// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {
    IBorrowerOperations,
    ITroveManager,
    ISortedTroves,
    IHintHelpers,
    IPriceFeed
} from "../../src/interfaces/IMezoMUSD.sol";
import {AbsorberVault} from "../../src/AbsorberVault.sol";
import {ProtectedLoanFactory} from "../../src/ProtectedLoanFactory.sol";
import {ProtectedLoan} from "../../src/ProtectedLoan.sol";
import {FrontlineLens} from "../../src/FrontlineLens.sol";
import {IAbsorberVault, IProtectedLoanRegistry} from "../../src/interfaces/IFrontline.sol";

/// Deploys Frontline on a fork of Mezo testnet against the real MUSD contracts.
abstract contract ForkBase is Test {
    IBorrowerOperations constant BO = IBorrowerOperations(0xCdF7028ceAB81fA0C6971208e83fa7872994beE5);
    ITroveManager constant TM = ITroveManager(0xE47c80e8c23f6B4A1aE41c34837a0599D5D16bb0);
    ISortedTroves constant ST = ISortedTroves(0x722E4D24FD6Ff8b0AC679450F3D91294607268fA);
    IHintHelpers constant HH = IHintHelpers(0x4e4cBA3779d56386ED43631b4dCD6d8EacEcBCF6);
    IPriceFeed constant PF = IPriceFeed(0x86bCF0841622a5dAC14A313a15f96A95421b9366);
    IERC20 constant MUSD = IERC20(0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503);

    uint256 constant BAND_LOW = 1.12e18;
    uint256 constant BAND_HIGH = 1.15e18;
    uint256 constant STATUS_ACTIVE = 1;

    AbsorberVault vault;
    ProtectedLoanFactory factory;
    FrontlineLens lens;
    uint256 price;

    address keeper = makeAddr("keeper");
    address alice = makeAddr("alice"); // absorber
    address carol = makeAddr("carol"); // absorber
    address bob = makeAddr("bob"); // protected borrower
    address redeemer = makeAddr("redeemer");
    address stranger = makeAddr("stranger");

    function setUp() public virtual {
        // Pinned block so Foundry caches fork state; override with FORK_BLOCK.
        vm.createSelectFork("mezo_testnet", vm.envOr("FORK_BLOCK", uint256(16589905)));
        // PriceFeed's oracle is a Mezo precompile a local fork cannot run: read the live price
        // once over RPC and pin fetchPrice to it.
        bytes memory raw = vm.rpc("eth_call", string.concat('[{"to":"', vm.toString(address(PF)), '","data":"0x0fdb11cf"},"latest"]'));
        _setPrice(abi.decode(raw, (uint256)));

        vault = new AbsorberVault(BO, TM, PF, MUSD, 2, BAND_LOW, BAND_HIGH, keeper);
        factory = new ProtectedLoanFactory(IAbsorberVault(address(vault)), BO, TM, PF, MUSD);
        vault.setRegistry(IProtectedLoanRegistry(address(factory)));
        lens = new FrontlineLens(ST, TM, PF, IAbsorberVault(address(vault)), IProtectedLoanRegistry(address(factory)));

        vm.deal(alice, 10 ether);
        vm.deal(carol, 10 ether);
        vm.deal(bob, 10 ether);
        vm.deal(redeemer, 10 ether);
        vm.deal(stranger, 1 ether);
    }

    // ---------------------------------------------------------------- helpers

    function _setPrice(uint256 p) internal {
        price = p;
        vm.mockCall(address(PF), abi.encodeWithSelector(IPriceFeed.fetchPrice.selector), abi.encode(p));
    }

    function _hints(uint256 coll, uint256 totalDebt) internal view returns (address up, address low) {
        uint256 nicr = HH.computeNominalCR(coll, totalDebt);
        (address approx,,) = HH.getApproxHint(nicr, 40, 11);
        (up, low) = ST.findInsertPosition(nicr, approx, approx);
    }

    function _hint(uint256 coll, uint256 totalDebt) internal view returns (AbsorberVault.Hint memory h) {
        (h.upper, h.lower) = _hints(coll, totalDebt);
    }

    /// Hint for a trove whose ratio barely moves: its current neighbours.
    function _neighbourHint(address trove) internal view returns (AbsorberVault.Hint memory h) {
        h.upper = ST.getPrev(trove);
        h.lower = ST.getNext(trove);
    }

    function _feeRate() internal view returns (uint256) {
        return BO.getBorrowingFee(1e18);
    }

    /// openTrove debt argument that lands total debt at `coll * price / icr`.
    function _debtForIcr(uint256 coll, uint256 icr) internal view returns (uint256 debtArg, uint256 totalDebt) {
        totalDebt = (coll * price) / icr;
        debtArg = ((totalDebt - TM.MUSD_GAS_COMPENSATION()) * 1e18) / (1e18 + _feeRate());
    }

    function _deposit(address who, uint256 btc) internal returns (uint256 shares) {
        vm.prank(who);
        shares = vault.deposit{value: btc}();
    }

    /// Keeper opens absorber trove `i` with `btc` of idle BTC at `icr`.
    function _deployAt(uint256 i, uint256 btc, uint256 icr) internal {
        (uint256 debtArg, uint256 total) = _debtForIcr(btc, icr);
        AbsorberVault.Hint memory h = _hint(btc, total);
        vm.prank(keeper);
        vault.deploy(i, btc, debtArg, h);
    }

    function _openProtected(address who, uint256 btc, uint256 debt) internal returns (ProtectedLoan loan) {
        uint256 total = debt + BO.getBorrowingFee(debt) + TM.MUSD_GAS_COMPENSATION();
        (address up, address low) = _hints(btc, total);
        vm.prank(who);
        loan = ProtectedLoan(payable(factory.open{value: btc}(debt, up, low)));
    }

    /// The redeemer gets MUSD the honest way: its own trove at 400%.
    function _fundRedeemer(uint256 musdNeeded) internal {
        uint256 debtArg = musdNeeded + 200e18 < 2_000e18 ? 2_000e18 : musdNeeded + 200e18;
        uint256 total = debtArg + BO.getBorrowingFee(debtArg) + TM.MUSD_GAS_COMPENSATION();
        uint256 coll = (total * 4e18) / price + 1;
        (address up, address low) = _hints(coll, total);
        vm.deal(redeemer, redeemer.balance + coll);
        vm.prank(redeemer);
        BO.openTrove{value: coll}(debtArg, up, low);
    }

    function _redeem(uint256 amount) internal returns (uint256 truncated) {
        (address first, uint256 partialNICR, uint256 trunc) = HH.getRedemptionHints(amount, price, 0);
        truncated = trunc;
        if (trunc == 0) return 0;
        (address up, address low) = ST.findInsertPosition(partialNICR, first, first);
        vm.prank(redeemer);
        TM.redeemCollateral(trunc, first, up, low, partialNICR, 0);
    }

    function _trove(uint256 i) internal view returns (address) {
        return vault.troveAt(i);
    }

    function _icr(address t) internal view returns (uint256) {
        return TM.getCurrentICR(t, price);
    }

    function _debt(address t) internal view returns (uint256) {
        (, uint256 p, uint256 i,,,) = TM.getEntireDebtAndColl(t);
        return p + i;
    }

    function _coll(address t) internal view returns (uint256 c) {
        (c,,,,,) = TM.getEntireDebtAndColl(t);
    }

    function _hintsFor(uint256 n) internal view returns (AbsorberVault.Hint[] memory hs) {
        hs = new AbsorberVault.Hint[](n);
        for (uint256 i; i < n; ++i) {
            address t = _trove(i);
            if (TM.getTroveStatus(t) == STATUS_ACTIVE) hs[i] = _neighbourHint(t);
        }
    }
}
