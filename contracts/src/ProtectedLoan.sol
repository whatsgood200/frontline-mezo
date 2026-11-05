// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IBorrowerOperations, ITroveManager, IPriceFeed} from "./interfaces/IMezoMUSD.sol";
import {IAbsorberVault} from "./interfaces/IFrontline.sol";

interface ILoanFactory {
    function vault() external view returns (IAbsorberVault);
    function borrowerOperations() external view returns (IBorrowerOperations);
    function troveManager() external view returns (ITroveManager);
    function priceFeed() external view returns (IPriceFeed);
    function musd() external view returns (IERC20);
    function syncDebt(uint256 newDebt) external;
}

/// @title ProtectedLoan
/// @notice One borrower's MUSD trove behind the absorber layer. Deployed as a clone per owner
///         by ProtectedLoanFactory. Only the owner moves collateral or debt. Every action that
///         adds risk must leave the trove at or above PROTECTION_FLOOR, well above the absorber
///         band, so MUSD's redemption order reaches absorbers first.
///
///         The protection premium accrues per second on total debt at the vault's current rate.
///         Anyone may call `collectPremium`: it draws the premium as new MUSD debt on this trove
///         (like interest) and sends it to the vault. Collection that would push the trove under
///         the floor reverts, and the premium keeps accruing until the owner adds collateral.
contract ProtectedLoan is ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 internal constant WAD = 1e18;
    uint256 internal constant YEAR = 365 days;
    uint256 internal constant STATUS_ACTIVE = 1;
    uint256 public constant PROTECTION_FLOOR = 1.5e18;

    ILoanFactory public factory;
    address public owner;
    uint256 public premiumOwed;
    uint64 public lastAccrual;

    event Opened(address indexed owner, uint256 collateral, uint256 debt);
    event Adjusted(address indexed owner, int256 collateralDelta, int256 debtDelta, uint256 icr);
    event Closed(address indexed owner, uint256 collateralReturned, uint256 premiumPaid);
    event PremiumCollected(uint256 amount, uint256 icr);
    event SurplusClaimed(address indexed owner, uint256 btc);

    error AlreadyInitialized();
    error NotOwner();
    error NotFactory();
    error BelowProtectionFloor(uint256 icr);
    error NothingToCollect();
    error SendFailed();

    /// @dev Locks the implementation contract; clones start with empty storage.
    constructor() {
        factory = ILoanFactory(address(1));
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    /// @dev Receives BTC from ActivePool (withdrawals, close) and CollSurplusPool.
    receive() external payable {}

    function initialize(address owner_) external {
        if (address(factory) != address(0)) revert AlreadyInitialized();
        factory = ILoanFactory(msg.sender);
        owner = owner_;
    }

    /// @notice Called by the factory with the borrower's BTC; MUSD goes to the owner.
    function open(uint256 debt, address upperHint, address lowerHint) external payable nonReentrant {
        if (msg.sender != address(factory)) revert NotFactory();
        factory.borrowerOperations().openTrove{value: msg.value}(debt, upperHint, lowerHint);
        lastAccrual = uint64(block.timestamp);
        premiumOwed = 0;
        uint256 ratio = _requireAboveFloor();
        _sendMusd(owner, factory.musd().balanceOf(address(this)));
        _sync();
        emit Opened(owner, msg.value, debt);
        emit Adjusted(owner, int256(msg.value), int256(debt), ratio);
    }

    function addCollateral(address upperHint, address lowerHint) external payable onlyOwner nonReentrant {
        _accrue();
        factory.borrowerOperations().addColl{value: msg.value}(upperHint, lowerHint);
        emit Adjusted(owner, int256(msg.value), 0, _icr());
    }

    function withdrawCollateral(uint256 amount, address upperHint, address lowerHint) external onlyOwner nonReentrant {
        _accrue();
        factory.borrowerOperations().withdrawColl(amount, upperHint, lowerHint);
        uint256 ratio = _requireAboveFloor();
        _sendBtc(owner, address(this).balance);
        emit Adjusted(owner, -int256(amount), 0, ratio);
    }

    function borrow(uint256 amount, address upperHint, address lowerHint) external onlyOwner nonReentrant {
        _accrue();
        factory.borrowerOperations().withdrawMUSD(amount, upperHint, lowerHint);
        uint256 ratio = _requireAboveFloor();
        _sendMusd(owner, amount);
        _sync();
        emit Adjusted(owner, 0, int256(amount), ratio);
    }

    /// @notice Pulls `amount` MUSD from the owner (approve this loan first) and repays it.
    function repay(uint256 amount, address upperHint, address lowerHint) external onlyOwner nonReentrant {
        _accrue();
        factory.musd().safeTransferFrom(owner, address(this), amount);
        factory.borrowerOperations().repayMUSD(amount, upperHint, lowerHint);
        _sync();
        emit Adjusted(owner, 0, -int256(amount), _icr());
    }

    /// @notice Repays everything (debt minus MUSD's 200 gas deposit, plus premium owed) from the
    ///         owner's MUSD and returns all collateral to the owner.
    function close() external onlyOwner nonReentrant {
        _accrue();
        ITroveManager tm = factory.troveManager();
        (, uint256 principal, uint256 interest,,,) = tm.getEntireDebtAndColl(address(this));
        uint256 toBurn = principal + interest - tm.MUSD_GAS_COMPENSATION();
        uint256 premium = premiumOwed;
        uint256 needed = toBurn + premium;
        uint256 have = factory.musd().balanceOf(address(this));
        if (needed > have) factory.musd().safeTransferFrom(owner, address(this), needed - have);
        factory.borrowerOperations().closeTrove();
        premiumOwed = 0;
        if (premium > 0) _payPremium(premium);
        uint256 btc = address(this).balance;
        _sendBtc(owner, btc);
        uint256 leftover = factory.musd().balanceOf(address(this));
        if (leftover > 0) _sendMusd(owner, leftover);
        _sync();
        emit Closed(owner, btc, premium);
    }

    /// @notice After a redemption fully closed this trove, pulls the leftover BTC to the owner.
    function claimSurplus() external onlyOwner nonReentrant {
        factory.borrowerOperations().claimCollateral();
        uint256 btc = address(this).balance;
        _sendBtc(owner, btc);
        _sync();
        emit SurplusClaimed(owner, btc);
    }

    /// @notice Anyone may collect: draws the accrued premium as MUSD debt and pays the vault.
    function collectPremium(address upperHint, address lowerHint) external nonReentrant returns (uint256 amount) {
        _accrue();
        amount = premiumOwed;
        if (amount == 0) revert NothingToCollect();
        factory.borrowerOperations().withdrawMUSD(amount, upperHint, lowerHint);
        uint256 ratio = _requireAboveFloor();
        premiumOwed = 0;
        _payPremium(amount);
        _sync();
        emit PremiumCollected(amount, ratio);
    }

    // ------------------------------------------------------------------ views

    function isActive() public view returns (bool) {
        return factory.troveManager().getTroveStatus(address(this)) == STATUS_ACTIVE;
    }

    /// @notice Premium owed now, including what accrued since the last action.
    function premiumDue() external view returns (uint256) {
        return premiumOwed + _accrued();
    }

    function icr() external view returns (uint256) {
        return _icr();
    }

    // ------------------------------------------------------------------ internal

    function _accrued() internal view returns (uint256) {
        if (!isActive()) return 0;
        uint256 dt = block.timestamp - lastAccrual;
        if (dt == 0) return 0;
        (, uint256 principal, uint256 interest,,,) = factory.troveManager().getEntireDebtAndColl(address(this));
        return ((principal + interest) * factory.vault().premiumRate() * dt) / (WAD * YEAR);
    }

    function _accrue() internal {
        premiumOwed += _accrued();
        lastAccrual = uint64(block.timestamp);
    }

    function _icr() internal view returns (uint256) {
        return factory.troveManager().getCurrentICR(address(this), factory.priceFeed().fetchPrice());
    }

    function _requireAboveFloor() internal view returns (uint256 ratio) {
        ratio = _icr();
        if (ratio < PROTECTION_FLOOR) revert BelowProtectionFloor(ratio);
    }

    function _payPremium(uint256 amount) internal {
        IAbsorberVault v = factory.vault();
        factory.musd().safeTransfer(address(v), amount);
        v.notifyPremium(amount);
    }

    function _sync() internal {
        uint256 debt;
        if (isActive()) {
            (, uint256 principal, uint256 interest,,,) = factory.troveManager().getEntireDebtAndColl(address(this));
            debt = principal + interest;
        }
        factory.syncDebt(debt);
    }

    function _sendMusd(address to, uint256 amount) internal {
        if (amount > 0) factory.musd().safeTransfer(to, amount);
    }

    function _sendBtc(address to, uint256 amount) internal {
        if (amount == 0) return;
        (bool ok,) = to.call{value: amount}("");
        if (!ok) revert SendFailed();
    }
}
