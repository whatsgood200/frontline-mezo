// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test, console2} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {
    IBorrowerOperations,
    ITroveManager,
    ISortedTroves,
    IHintHelpers,
    IPriceFeed
} from "../../src/interfaces/IMezoMUSD.sol";

/// Throwaway spike: a contract that owns one trove and forwards owner calls.
/// The production proxies live in src/ and are written in Phase 3.
contract SpikeTroveProxy {
    address public immutable owner;
    IBorrowerOperations public immutable bo;
    IERC20 public immutable musd;

    constructor(IBorrowerOperations bo_, IERC20 musd_) {
        owner = msg.sender;
        bo = bo_;
        musd = musd_;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    receive() external payable {}

    function open(uint256 debt, address up, address low) external payable onlyOwner {
        bo.openTrove{value: msg.value}(debt, up, low);
    }

    function repay(uint256 amount, address up, address low) external onlyOwner {
        bo.repayMUSD(amount, up, low);
    }

    function borrow(uint256 amount, address up, address low) external onlyOwner {
        bo.withdrawMUSD(amount, up, low);
    }

    function addColl(address up, address low) external payable onlyOwner {
        bo.addColl{value: msg.value}(up, low);
    }

    function close() external onlyOwner {
        bo.closeTrove();
    }

    function claim() external onlyOwner {
        bo.claimCollateral();
    }

    function sweep(address to) external onlyOwner {
        musd.transfer(to, musd.balanceOf(address(this)));
        (bool ok,) = to.call{value: address(this).balance}("");
        require(ok, "sweep failed");
    }
}

contract ForkSpikes is Test {
    // Mezo testnet (matsnet) addresses from mezo-org/musd deployments.
    IBorrowerOperations constant BO = IBorrowerOperations(0xCdF7028ceAB81fA0C6971208e83fa7872994beE5);
    ITroveManager constant TM = ITroveManager(0xE47c80e8c23f6B4A1aE41c34837a0599D5D16bb0);
    ISortedTroves constant ST = ISortedTroves(0x722E4D24FD6Ff8b0AC679450F3D91294607268fA);
    IHintHelpers constant HH = IHintHelpers(0x4e4cBA3779d56386ED43631b4dCD6d8EacEcBCF6);
    IPriceFeed constant PF = IPriceFeed(0x86bCF0841622a5dAC14A313a15f96A95421b9366);
    IERC20 constant MUSD = IERC20(0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503);

    uint256 constant STATUS_ACTIVE = 1;
    uint256 constant STATUS_CLOSED_BY_REDEMPTION = 4;

    uint256 price;
    address redeemer = makeAddr("redeemer");

    function setUp() public {
        vm.createSelectFork("mezo_testnet");
        // The oracle behind PriceFeed is a Mezo precompile (0x7b7c...0015) that a local fork
        // cannot execute. Read the live price over RPC once, then pin fetchPrice to it.
        bytes memory raw =
            vm.rpc("eth_call", string.concat('[{"to":"', vm.toString(address(PF)), '","data":"0x0fdb11cf"},"latest"]'));
        price = abi.decode(raw, (uint256));
        require(price > 1_000e18, "implausible BTC price");
        vm.mockCall(address(PF), abi.encodeWithSelector(IPriceFeed.fetchPrice.selector), abi.encode(price));
    }

    // ---------- helpers ----------

    function _hints(uint256 coll, uint256 totalDebt) internal view returns (address up, address low) {
        uint256 nicr = HH.computeNominalCR(coll, totalDebt);
        (address approx,,) = HH.getApproxHint(nicr, 40, 7);
        (up, low) = ST.findInsertPosition(nicr, approx, approx);
    }

    /// Collateral needed for a target ICR (1e18 = 100%) on a given total debt.
    function _collFor(uint256 totalDebt, uint256 icr) internal view returns (uint256) {
        return (totalDebt * icr) / price + 1;
    }

    function _expectedTotalDebt(uint256 debtAmount) internal view returns (uint256) {
        return debtAmount + BO.getBorrowingFee(debtAmount) + TM.MUSD_GAS_COMPENSATION();
    }

    function _openViaProxy(uint256 debtAmount, uint256 icr) internal returns (SpikeTroveProxy p) {
        p = new SpikeTroveProxy(BO, MUSD);
        uint256 totalDebt = _expectedTotalDebt(debtAmount);
        uint256 coll = _collFor(totalDebt, icr);
        (address up, address low) = _hints(coll, totalDebt);
        vm.deal(address(this), address(this).balance + coll);
        uint256 g = gasleft();
        p.open{value: coll}(debtAmount, up, low);
        lastOpenGas = g - gasleft();
    }

    uint256 lastOpenGas;

    /// The redeemer gets MUSD the honest way: its own high-ratio trove.
    function _fundRedeemer(uint256 musdNeeded) internal {
        // Net debt must clear the 1,800 MUSD minimum.
        uint256 debtAmount = musdNeeded + 200e18 < 2_000e18 ? 2_000e18 : musdNeeded + 200e18;
        uint256 totalDebt = _expectedTotalDebt(debtAmount);
        uint256 coll = _collFor(totalDebt, 4e18); // 400%, far from the front of the line
        (address up, address low) = _hints(coll, totalDebt);
        vm.deal(redeemer, coll);
        vm.prank(redeemer);
        BO.openTrove{value: coll}(debtAmount, up, low);
    }

    function _redeem(uint256 amount) internal returns (uint256 truncated) {
        (address first, uint256 partialNICR, uint256 trunc) = HH.getRedemptionHints(amount, price, 0);
        truncated = trunc;
        if (trunc == 0) return 0;
        (address up, address low) = ST.findInsertPosition(partialNICR, first, first);
        vm.prank(redeemer);
        TM.redeemCollateral(trunc, first, up, low, partialNICR, 0);
    }

    function _lowestIcr() internal view returns (uint256) {
        return TM.getCurrentICR(ST.getLast(), price);
    }

    // ---------- S1: a contract can own and manage a trove ----------

    function test_S1_proxyOwnsTroveLifecycle() public {
        SpikeTroveProxy p = _openViaProxy(1_800e18, 2e18);
        console2.log("S1 openTrove gas (with hints)", lastOpenGas);
        uint256 g;
        assertEq(TM.getTroveStatus(address(p)), STATUS_ACTIVE, "trove not active");
        assertEq(MUSD.balanceOf(address(p)), 1_800e18, "proxy did not receive MUSD");

        // Borrow more, then repay it, with fresh hints each time.
        (uint256 coll, uint256 principal,,,,) = TM.getEntireDebtAndColl(address(p));
        (address up, address low) = _hints(coll, principal + 500e18);
        g = gasleft();
        p.borrow(500e18, up, low);
        console2.log("S1 withdrawMUSD gas", g - gasleft());

        (coll, principal,,,,) = TM.getEntireDebtAndColl(address(p));
        (up, low) = _hints(coll, principal - 500e18);
        g = gasleft();
        p.repay(500e18, up, low);
        console2.log("S1 repayMUSD gas", g - gasleft());

        // Closing needs the full debt minus gas compensation; top the proxy up from the redeemer.
        _fundRedeemer(1_000e18);
        vm.prank(redeemer);
        require(MUSD.transfer(address(p), 1_000e18), "transfer failed");
        g = gasleft();
        p.close();
        console2.log("S1 closeTrove gas", g - gasleft());
        assertEq(TM.getTroveStatus(address(p)), 2, "trove not closed by owner");
        assertGt(address(p).balance, 0, "collateral not returned to proxy");
    }

    // ---------- S2: redemptions hit the absorber first ----------

    function test_S2_redemptionHitsAbsorberNotProtected() public {
        uint256 lowest = _lowestIcr();
        console2.log("S2 lowest third-party ICR (1e16 = 1%)", lowest / 1e16);

        // Absorber sits under the current bottom of the line, protected sits well above it.
        uint256 absorberIcr = lowest > 1.13e18 ? lowest - 0.015e18 : 1.12e18;
        SpikeTroveProxy absorber = _openViaProxy(10_000e18, absorberIcr);
        SpikeTroveProxy protected_ = _openViaProxy(3_000e18, 2e18);
        assertEq(ST.getLast(), address(absorber), "absorber is not at the front of the line");

        uint256 protColl = TM.getTroveColl(address(protected_));
        uint256 protDebt = TM.getTroveDebt(address(protected_));
        uint256 absColl = TM.getTroveColl(address(absorber));

        _fundRedeemer(4_000e18);
        uint256 redeemed = _redeem(4_000e18);
        console2.log("S2 redeemed MUSD", redeemed / 1e18);

        assertGt(redeemed, 0, "nothing redeemed");
        assertLt(TM.getTroveColl(address(absorber)), absColl, "absorber was not hit");
        assertEq(TM.getTroveColl(address(protected_)), protColl, "protected collateral moved");
        assertEq(TM.getTroveDebt(address(protected_)), protDebt, "protected debt moved");
    }

    function test_S2_fullHitClosesAbsorberAndSurplusIsClaimable() public {
        uint256 lowest = _lowestIcr();
        uint256 absorberIcr = lowest > 1.13e18 ? lowest - 0.015e18 : 1.12e18;
        SpikeTroveProxy absorber = _openViaProxy(1_800e18, absorberIcr);
        SpikeTroveProxy protected_ = _openViaProxy(3_000e18, 2e18);
        uint256 protColl = TM.getTroveColl(address(protected_));

        // Redeem exactly the absorber's debt minus gas compensation: it closes by redemption.
        uint256 lot = TM.getTroveDebt(address(absorber)) - TM.MUSD_GAS_COMPENSATION();
        _fundRedeemer(lot);
        _redeem(lot);

        assertEq(TM.getTroveStatus(address(absorber)), STATUS_CLOSED_BY_REDEMPTION, "absorber not closed");
        assertEq(TM.getTroveColl(address(protected_)), protColl, "protected collateral moved");

        uint256 before = address(absorber).balance;
        absorber.claim();
        assertGt(address(absorber).balance, before, "no surplus BTC claimed");
        console2.log("S2 surplus BTC claimed (1e10)", (address(absorber).balance - before) / 1e10);
    }

    function test_S2_partialBelowMinimumStopsTheWholeRedemption() public {
        uint256 lowest = _lowestIcr();
        uint256 absorberIcr = lowest > 1.13e18 ? lowest - 0.015e18 : 1.12e18;
        // Absorber net debt about 2,500: a 1,000 MUSD hit would leave it under the 1,800 minimum.
        SpikeTroveProxy absorber = _openViaProxy(2_500e18, absorberIcr);
        SpikeTroveProxy protected_ = _openViaProxy(3_000e18, 2e18);
        uint256 absColl = TM.getTroveColl(address(absorber));
        uint256 protColl = TM.getTroveColl(address(protected_));

        _fundRedeemer(1_000e18);
        (address first,,) = HH.getRedemptionHints(1_000e18, price, 0);
        assertEq(first, address(absorber), "absorber is not first");
        // Send the raw amount (no truncation) with a stale partial hint: MUSD must cancel the partial.
        vm.prank(redeemer);
        vm.expectRevert(bytes("TroveManager: Unable to redeem any amount"));
        TM.redeemCollateral(1_000e18, address(absorber), address(0), address(0), 0, 0);

        assertEq(TM.getTroveColl(address(absorber)), absColl, "absorber changed");
        assertEq(TM.getTroveColl(address(protected_)), protColl, "protected changed");
    }

    // ---------- S5: held MUSD rescues an absorber after a price shock ----------

    function test_S5_priceShockThenInstantRepay() public {
        uint256 lowest = _lowestIcr();
        uint256 absorberIcr = lowest > 1.13e18 ? lowest - 0.015e18 : 1.12e18;
        SpikeTroveProxy absorber = _openViaProxy(5_000e18, absorberIcr);

        // BTC falls 3% in one move.
        uint256 shocked = (price * 97) / 100;
        vm.mockCall(address(PF), abi.encodeWithSelector(IPriceFeed.fetchPrice.selector), abi.encode(shocked));
        uint256 icrAfterShock = TM.getCurrentICR(address(absorber), shocked);
        console2.log("S5 ICR after 3% shock (1e16 = 1%)", icrAfterShock / 1e16);

        // The proxy repays from the MUSD it already holds, back to about 125%.
        (uint256 coll, uint256 principal, uint256 interest,,,) = TM.getEntireDebtAndColl(address(absorber));
        uint256 debt = principal + interest;
        uint256 targetDebt = (coll * shocked) / 1.25e18;
        uint256 repayAmt = debt - targetDebt;
        price = shocked;
        (address up, address low) = _hints(coll, principal - repayAmt);
        absorber.repay(repayAmt, up, low);

        uint256 icrAfterRepay = TM.getCurrentICR(address(absorber), shocked);
        console2.log("S5 ICR after repay (1e16 = 1%)", icrAfterRepay / 1e16);
        assertGt(icrAfterRepay, 1.2e18, "repay did not restore the ratio");

        vm.expectRevert();
        TM.liquidate(address(absorber));
    }
}
