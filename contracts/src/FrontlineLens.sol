// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ISortedTroves, ITroveManager, IPriceFeed} from "./interfaces/IMezoMUSD.sol";
import {IAbsorberVault, IProtectedLoanRegistry} from "./interfaces/IFrontline.sol";

/// @title FrontlineLens
/// @notice Read-only. Returns MUSD's redemption line in one call, front first, the way
///         TroveManager.redeemCollateral walks it (SortedTroves.getLast, then getPrev), with
///         each loan tagged absorber, protected or other and the redeemable MUSD in front of it.
contract FrontlineLens {
    uint8 public constant OTHER = 0;
    uint8 public constant ABSORBER = 1;
    uint8 public constant PROTECTED = 2;
    uint256 public constant MAX_WALK = 500;

    ISortedTroves public immutable sortedTroves;
    ITroveManager public immutable troveManager;
    IPriceFeed public immutable priceFeed;
    IAbsorberVault public immutable vault;
    IProtectedLoanRegistry public immutable registry;

    struct Row {
        address owner;
        uint8 side;
        uint256 icr;
        uint256 debt;
        /// Redeemable MUSD (debt minus gas deposit) of every loan in front of this one.
        uint256 redeemedBefore;
    }

    constructor(
        ISortedTroves sortedTroves_,
        ITroveManager troveManager_,
        IPriceFeed priceFeed_,
        IAbsorberVault vault_,
        IProtectedLoanRegistry registry_
    ) {
        sortedTroves = sortedTroves_;
        troveManager = troveManager_;
        priceFeed = priceFeed_;
        vault = vault_;
        registry = registry_;
    }

    function line(uint256 depth) external view returns (Row[] memory rows, uint256 price, uint256 totalLoans) {
        price = priceFeed.fetchPrice();
        totalLoans = sortedTroves.getSize();
        uint256 n = depth < totalLoans ? depth : totalLoans;
        rows = new Row[](n);
        uint256 gasComp = troveManager.MUSD_GAS_COMPENSATION();
        uint256 running;
        address cursor = sortedTroves.getLast();
        for (uint256 i; i < n && cursor != address(0); ++i) {
            uint256 debt = troveManager.getTroveDebt(cursor);
            rows[i] = Row(cursor, sideOf(cursor), troveManager.getCurrentICR(cursor, price), debt, running);
            running += debt > gasComp ? debt - gasComp : 0;
            cursor = sortedTroves.getPrev(cursor);
        }
    }

    /// @notice Redeemable MUSD in front of `account`, and how much of it absorbers guarantee.
    function bufferAhead(address account) external view returns (uint256 total, uint256 guaranteed, uint256 position) {
        uint256 gasComp = troveManager.MUSD_GAS_COMPENSATION();
        address cursor = sortedTroves.getLast();
        for (uint256 i; i < MAX_WALK && cursor != address(0); ++i) {
            if (cursor == account) return (total, guaranteed, i + 1);
            uint256 debt = troveManager.getTroveDebt(cursor);
            uint256 redeemable = debt > gasComp ? debt - gasComp : 0;
            total += redeemable;
            if (vault.isAbsorberTrove(cursor)) guaranteed += redeemable;
            cursor = sortedTroves.getPrev(cursor);
        }
        return (total, guaranteed, 0);
    }

    function sideOf(address account) public view returns (uint8) {
        if (vault.isAbsorberTrove(account)) return ABSORBER;
        if (registry.isLoan(account)) return PROTECTED;
        return OTHER;
    }
}
