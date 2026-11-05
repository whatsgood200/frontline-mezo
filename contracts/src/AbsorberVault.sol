// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {IBorrowerOperations, ITroveManager, IPriceFeed} from "./interfaces/IMezoMUSD.sol";
import {IProtectedLoanRegistry} from "./interfaces/IFrontline.sol";
import {AbsorberTrove} from "./AbsorberTrove.sol";
import {PremiumModel} from "./PremiumModel.sol";

/// @title AbsorberVault
/// @notice Absorbers deposit BTC and receive flABS shares. The vault keeps its MUSD troves
///         in a low collateral-ratio band, so MUSD's redemption order (lowest ratio first)
///         reaches them before any protected loan. It keeps every MUSD it borrows, which
///         lets anyone repay a trove drifting toward 110% at once (`protect`).
///
///         Net asset value, in MUSD:
///           idle BTC * price + trove collateral * price + MUSD held - sum(trove debt - gas deposit)
///         A redemption at the oracle price leaves NAV unchanged: it removes BTC and the same
///         dollar value of debt. Premiums from protected loans add MUSD and raise NAV.
///
///         The owner can set the keeper and the band inside hard bounds and pause deposits.
///         The owner cannot move or withdraw anyone's funds.
contract AbsorberVault is ERC20, ReentrancyGuard, Ownable2Step {
    using SafeERC20 for IERC20;

    uint256 internal constant WAD = 1e18;
    uint256 internal constant STATUS_ACTIVE = 1;
    /// @notice No band may start under this ratio (MUSD liquidates under 110%).
    uint256 public constant BAND_FLOOR = 1.115e18;
    uint256 public constant BAND_CEILING = 1.6e18;
    uint256 public constant MIN_DEPOSIT = 0.0001 ether;
    uint256 public constant PROTECT_BOUNTY = 1e18;
    uint256 public constant MAX_TROVES = 5;
    // Virtual shares and assets blunt first-depositor inflation (as in OpenZeppelin ERC4626).
    uint256 internal constant VIRTUAL_SHARES = 1e3;
    uint256 internal constant VIRTUAL_ASSETS = 1;

    IBorrowerOperations public immutable borrowerOperations;
    ITroveManager public immutable troveManager;
    IPriceFeed public immutable priceFeed;
    IERC20 public immutable musd;

    AbsorberTrove[] internal _troves;
    mapping(address => bool) public isAbsorberTrove;

    uint256 public bandLow;
    uint256 public bandHigh;
    address public keeper;
    IProtectedLoanRegistry public registry;
    bool public depositsPaused;

    struct Hint {
        address upper;
        address lower;
    }

    struct Stats {
        uint256 price;
        uint256 totalAssets;
        uint256 totalShares;
        uint256 idleBtc;
        uint256 musdHeld;
        uint256 troveCollateral;
        uint256 absorberDebt;
        uint256 protectedDebt;
        uint256 coverage;
        uint256 premiumRate;
        uint256 activeTroves;
    }

    event Deposited(address indexed account, uint256 btc, uint256 shares, uint256 price);
    event Withdrawn(address indexed account, uint256 shares, uint256 btc, uint256 musd);
    event Deployed(uint256 indexed trove, uint256 btc, uint256 debtIncrease, uint256 icr);
    event Rebalanced(uint256 indexed trove, uint256 icrBefore, uint256 icrAfter);
    event Protected(uint256 indexed trove, address indexed caller, uint256 repaid, uint256 icrAfter, uint256 bounty);
    event SurplusClaimed(uint256 indexed trove, uint256 btc);
    event PremiumReceived(address indexed loan, uint256 amount);
    event BandSet(uint256 low, uint256 high);
    event KeeperSet(address keeper);
    event RegistrySet(address registry);
    event DepositsPaused(bool paused);

    error NotKeeper();
    error NotRegisteredLoan();
    error DepositsArePaused();
    error DepositTooSmall();
    error ZeroShares();
    error BadBand();
    error TargetOutsideBand();
    error OutsideBand(uint256 icr);
    error NotUnderBand(uint256 icr);
    error Illiquid();
    error TroveInactive();
    error RegistryAlreadySet();
    error HintCount();
    error SendFailed();

    constructor(
        IBorrowerOperations borrowerOperations_,
        ITroveManager troveManager_,
        IPriceFeed priceFeed_,
        IERC20 musd_,
        uint256 troveCount_,
        uint256 bandLow_,
        uint256 bandHigh_,
        address keeper_
    ) ERC20("Frontline Absorber Share", "flABS") Ownable(msg.sender) {
        if (troveCount_ == 0 || troveCount_ > MAX_TROVES) revert BadBand();
        borrowerOperations = borrowerOperations_;
        troveManager = troveManager_;
        priceFeed = priceFeed_;
        musd = musd_;
        for (uint256 i; i < troveCount_; ++i) {
            AbsorberTrove t = new AbsorberTrove(borrowerOperations_, musd_);
            _troves.push(t);
            isAbsorberTrove[address(t)] = true;
        }
        _setBand(bandLow_, bandHigh_);
        keeper = keeper_;
        emit KeeperSet(keeper_);
    }

    /// @dev 18 + 3: the 1e3 virtual-share offset (inflation guard) keeps one whole share near 1 MUSD.
    function decimals() public pure override returns (uint8) {
        return 21;
    }

    modifier onlyKeeper() {
        if (msg.sender != keeper && msg.sender != owner()) revert NotKeeper();
        _;
    }

    /// @dev BTC arrives from absorber troves (withdrawals, closes, surplus claims).
    receive() external payable {}

    // ------------------------------------------------------------------ absorbers

    /// @notice Deposit BTC for flABS shares at the current net asset value. The BTC stays idle
    ///         until the keeper deploys it into an absorber trove.
    function deposit() external payable nonReentrant returns (uint256 shares) {
        if (depositsPaused) revert DepositsArePaused();
        if (msg.value < MIN_DEPOSIT) revert DepositTooSmall();
        uint256 price = priceFeed.fetchPrice();
        uint256 assetsBefore = _totalAssets(price, address(this).balance - msg.value);
        uint256 value = (msg.value * price) / WAD;
        shares = Math.mulDiv(value, totalSupply() + VIRTUAL_SHARES, assetsBefore + VIRTUAL_ASSETS);
        if (shares == 0) revert ZeroShares();
        _mint(msg.sender, shares);
        emit Deposited(msg.sender, msg.value, shares, price);
    }

    /// @notice Burn shares for their slice of every asset. Each absorber trove is unwound pro rata
    ///         (repay with held MUSD, take collateral); a trove whose remainder would fall under
    ///         MUSD's minimum debt is closed instead. Rounding favours the vault.
    ///         If closing needs more MUSD than the vault holds (MUSD's borrowing fee and interest
    ///         not yet covered by premiums, typically for the last absorber out), the shortfall is
    ///         pulled from the caller, who must approve it; anything left over comes back.
    /// @param hints one sorted-list hint pair per absorber trove, for its post-adjustment ratio.
    function withdraw(uint256 shares, Hint[] calldata hints) external nonReentrant returns (uint256 btcOut, uint256 musdOut) {
        if (hints.length != _troves.length) revert HintCount();
        if (shares == 0) revert ZeroShares();
        uint256 supply = totalSupply();
        uint256 price = priceFeed.fetchPrice();

        btcOut = (address(this).balance * shares) / supply;
        uint256 musdShare = (musd.balanceOf(address(this)) * shares) / supply;
        uint256 liabilityShare;

        for (uint256 i; i < _troves.length; ++i) {
            (uint256 collPart, uint256 debtPart, uint256 topUp) = _unwind(_troves[i], shares, supply, hints[i]);
            btcOut += collPart;
            liabilityShare += debtPart;
            musdShare += topUp;
        }

        if (musdShare >= liabilityShare) {
            musdOut = musdShare - liabilityShare;
        } else {
            // The user's share of MUSD did not cover their share of debt (interest and fees);
            // they settle the gap in BTC, which stays in the vault for everyone else.
            uint256 deficitBtc = Math.mulDiv(liabilityShare - musdShare, WAD, price, Math.Rounding.Ceil);
            btcOut = btcOut > deficitBtc ? btcOut - deficitBtc : 0;
        }

        _burn(msg.sender, shares);
        if (musdOut > 0) musd.safeTransfer(msg.sender, musdOut);
        if (btcOut > 0) {
            (bool ok,) = msg.sender.call{value: btcOut}("");
            if (!ok) revert SendFailed();
        }
        emit Withdrawn(msg.sender, shares, btcOut, musdOut);
    }

    // ------------------------------------------------------------------ keeper

    /// @notice Move idle BTC into absorber trove `i` and borrow, ending inside the band.
    function deploy(uint256 i, uint256 btc, uint256 debtIncrease, Hint calldata h) external onlyKeeper nonReentrant {
        AbsorberTrove t = _troves[i];
        if (btc > address(this).balance) revert Illiquid();
        if (troveManager.getTroveStatus(address(t)) != STATUS_ACTIVE) {
            t.open{value: btc}(debtIncrease, h.upper, h.lower);
        } else {
            t.adjust{value: btc}(0, debtIncrease, debtIncrease > 0, h.upper, h.lower);
        }
        uint256 icr = _requireInBand(t);
        emit Deployed(i, btc, debtIncrease, icr);
    }

    /// @notice Move trove `i` to `targetIcr` (inside the band): borrow more if it sits too high,
    ///         repay with held MUSD if it sits too low. Keeps absorbers at the front of the line.
    function rebalance(uint256 i, uint256 targetIcr, Hint calldata h) external onlyKeeper nonReentrant {
        if (targetIcr < bandLow || targetIcr > bandHigh) revert TargetOutsideBand();
        AbsorberTrove t = _troves[i];
        uint256 price = priceFeed.fetchPrice();
        uint256 before = troveManager.getCurrentICR(address(t), price);
        _moveTo(t, targetIcr, price, h);
        uint256 icr = _requireInBand(t);
        emit Rebalanced(i, before, icr);
    }

    /// @notice Anyone may call when trove `i` has drifted under the band (BTC fell). Repays it
    ///         to the middle of the band from held MUSD and pays the caller a small bounty.
    function protect(uint256 i, Hint calldata h) external nonReentrant returns (uint256 repaid) {
        AbsorberTrove t = _troves[i];
        if (troveManager.getTroveStatus(address(t)) != STATUS_ACTIVE) revert TroveInactive();
        uint256 price = priceFeed.fetchPrice();
        uint256 icr = troveManager.getCurrentICR(address(t), price);
        if (icr >= bandLow) revert NotUnderBand(icr);
        uint256 heldBefore = musd.balanceOf(address(this));
        _moveTo(t, (bandLow + bandHigh) / 2, price, h);
        repaid = heldBefore - musd.balanceOf(address(this));
        uint256 icrAfter = troveManager.getCurrentICR(address(t), price);
        uint256 bounty = Math.min(PROTECT_BOUNTY, musd.balanceOf(address(this)));
        if (bounty > 0) musd.safeTransfer(msg.sender, bounty);
        emit Protected(i, msg.sender, repaid, icrAfter, bounty);
    }

    /// @notice Anyone may pull leftover BTC after a redemption closed trove `i`.
    function claimSurplus(uint256 i) external nonReentrant {
        uint256 before = address(this).balance;
        _troves[i].claimSurplus();
        emit SurplusClaimed(i, address(this).balance - before);
    }

    /// @notice Protected loans send premiums here (MUSD already transferred).
    function notifyPremium(uint256 amount) external {
        if (address(registry) == address(0) || !registry.isLoan(msg.sender)) revert NotRegisteredLoan();
        emit PremiumReceived(msg.sender, amount);
    }

    // ------------------------------------------------------------------ owner

    function setKeeper(address keeper_) external onlyOwner {
        keeper = keeper_;
        emit KeeperSet(keeper_);
    }

    function setBand(uint256 low, uint256 high) external onlyOwner {
        _setBand(low, high);
    }

    function setRegistry(IProtectedLoanRegistry registry_) external onlyOwner {
        if (address(registry) != address(0)) revert RegistryAlreadySet();
        registry = registry_;
        emit RegistrySet(address(registry_));
    }

    function setDepositsPaused(bool paused) external onlyOwner {
        depositsPaused = paused;
        emit DepositsPaused(paused);
    }

    // ------------------------------------------------------------------ views

    function troveCount() external view returns (uint256) {
        return _troves.length;
    }

    function troveAt(uint256 i) external view returns (address) {
        return address(_troves[i]);
    }

    /// @notice Redeemable MUSD standing in front of protected loans (debt minus gas deposit).
    function absorberDebt() public view returns (uint256 total) {
        uint256 gasComp = troveManager.MUSD_GAS_COMPENSATION();
        for (uint256 i; i < _troves.length; ++i) {
            (bool active,, uint256 debt) = _troveState(_troves[i]);
            if (active) total += debt - gasComp;
        }
    }

    function protectedDebt() public view returns (uint256) {
        return address(registry) == address(0) ? 0 : registry.totalProtectedDebt();
    }

    function coverage() public view returns (uint256) {
        return PremiumModel.coverageOf(absorberDebt(), protectedDebt());
    }

    function premiumRate() external view returns (uint256) {
        return PremiumModel.rate(coverage());
    }

    function maxNewProtectedDebt() external view returns (uint256) {
        return PremiumModel.maxNewProtectedDebt(absorberDebt(), protectedDebt());
    }

    function totalAssets() public view returns (uint256) {
        return _totalAssets(priceFeed.fetchPrice(), address(this).balance);
    }

    /// @notice MUSD value (WAD) of one whole share (1e21 units).
    function sharePrice() external view returns (uint256) {
        return Math.mulDiv(1e21, totalAssets() + VIRTUAL_ASSETS, totalSupply() + VIRTUAL_SHARES);
    }

    function previewDeposit(uint256 btc) external view returns (uint256) {
        uint256 price = priceFeed.fetchPrice();
        return Math.mulDiv((btc * price) / WAD, totalSupply() + VIRTUAL_SHARES, _totalAssets(price, address(this).balance) + VIRTUAL_ASSETS);
    }

    function stats() external view returns (Stats memory s) {
        s.price = priceFeed.fetchPrice();
        s.idleBtc = address(this).balance;
        s.musdHeld = musd.balanceOf(address(this));
        s.totalShares = totalSupply();
        uint256 gasComp = troveManager.MUSD_GAS_COMPENSATION();
        for (uint256 i; i < _troves.length; ++i) {
            (bool active, uint256 coll, uint256 debt) = _troveState(_troves[i]);
            if (!active) continue;
            s.activeTroves++;
            s.troveCollateral += coll;
            s.absorberDebt += debt - gasComp;
        }
        s.totalAssets = _totalAssets(s.price, s.idleBtc);
        s.protectedDebt = protectedDebt();
        s.coverage = PremiumModel.coverageOf(s.absorberDebt, s.protectedDebt);
        s.premiumRate = PremiumModel.rate(s.coverage);
    }

    // ------------------------------------------------------------------ internal

    function _setBand(uint256 low, uint256 high) internal {
        if (low < BAND_FLOOR || high > BAND_CEILING || low >= high) revert BadBand();
        bandLow = low;
        bandHigh = high;
        emit BandSet(low, high);
    }

    function _troveState(AbsorberTrove t) internal view returns (bool active, uint256 coll, uint256 debt) {
        if (troveManager.getTroveStatus(address(t)) != STATUS_ACTIVE) return (false, 0, 0);
        // getEntireDebtAndColl already includes pending redistribution and interest.
        (uint256 c, uint256 principal, uint256 interest,,,) = troveManager.getEntireDebtAndColl(address(t));
        return (true, c, principal + interest);
    }

    function _totalAssets(uint256 price, uint256 idleBtc) internal view returns (uint256) {
        uint256 gasComp = troveManager.MUSD_GAS_COMPENSATION();
        uint256 assets = (idleBtc * price) / WAD + musd.balanceOf(address(this));
        uint256 liabilities;
        for (uint256 i; i < _troves.length; ++i) {
            (bool active, uint256 coll, uint256 debt) = _troveState(_troves[i]);
            if (!active) continue;
            assets += (coll * price) / WAD;
            liabilities += debt - gasComp;
        }
        return assets > liabilities ? assets - liabilities : 0;
    }

    /// @dev Unwinds `shares / supply` of one trove: repays that slice of its debt from held MUSD
    ///      and takes that slice of collateral, or closes it when the remainder would fall under
    ///      MUSD's minimum debt. Returns the withdrawer's slice of collateral and of debt.
    function _unwind(AbsorberTrove t, uint256 shares, uint256 supply, Hint calldata h)
        internal
        returns (uint256 collPart, uint256 debtPart, uint256 topUp)
    {
        bool closeIt;
        uint256 needed;
        (collPart, debtPart, needed, closeIt) = _slice(t, shares, supply);
        if (needed == 0) return (0, 0, 0);
        uint256 held = musd.balanceOf(address(this));
        if (held < needed) {
            topUp = needed - held;
            musd.safeTransferFrom(msg.sender, address(this), topUp);
        }
        musd.safeTransfer(address(t), needed);
        if (closeIt) t.close();
        else t.adjust(collPart, debtPart, false, h.upper, h.lower);
    }

    /// @dev The withdrawer's slice of one trove, and the MUSD the unwind must burn.
    function _slice(AbsorberTrove t, uint256 shares, uint256 supply)
        internal
        view
        returns (uint256 collPart, uint256 debtPart, uint256 needed, bool closeIt)
    {
        (bool active, uint256 coll, uint256 debt) = _troveState(t);
        if (!active) return (0, 0, 0, false);
        uint256 gasComp = troveManager.MUSD_GAS_COMPENSATION();
        uint256 effDebt = debt - gasComp;
        collPart = (coll * shares) / supply;
        debtPart = Math.mulDiv(effDebt, shares, supply, Math.Rounding.Ceil);
        closeIt = debt - debtPart < gasComp + borrowerOperations.minNetDebt();
        needed = closeIt ? effDebt : debtPart;
    }

    function _requireInBand(AbsorberTrove t) internal view returns (uint256 icr) {
        icr = troveManager.getCurrentICR(address(t), priceFeed.fetchPrice());
        if (icr < bandLow || icr > bandHigh) revert OutsideBand(icr);
    }

    /// @dev Borrows or repays so the trove's ratio lands near `targetIcr`. Debt increases pay
    ///      MUSD's borrowing fee, which is solved for so the result lands on target.
    function _moveTo(AbsorberTrove t, uint256 targetIcr, uint256 price, Hint calldata h) internal {
        (bool active, uint256 coll, uint256 debt) = _troveState(t);
        if (!active) revert TroveInactive();
        uint256 targetDebt = Math.mulDiv(coll, price, targetIcr);
        if (targetDebt > debt) {
            uint256 feeOn1 = borrowerOperations.getBorrowingFee(WAD);
            uint256 increase = Math.mulDiv(targetDebt - debt, WAD, WAD + feeOn1);
            if (increase == 0) return;
            t.adjust(0, increase, true, h.upper, h.lower);
        } else if (targetDebt < debt) {
            uint256 minDebt = troveManager.MUSD_GAS_COMPENSATION() + borrowerOperations.minNetDebt();
            uint256 repay = debt - targetDebt;
            if (debt - repay < minDebt) repay = debt - minDebt;
            if (repay == 0) return;
            if (musd.balanceOf(address(this)) < repay) revert Illiquid();
            musd.safeTransfer(address(t), repay);
            t.adjust(0, repay, false, h.upper, h.lower);
        }
    }
}
