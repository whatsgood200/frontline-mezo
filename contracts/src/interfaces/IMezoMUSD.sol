// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// Minimal interfaces for the MUSD contracts Frontline calls.
/// Signatures copied from github.com/mezo-org/musd (solidity/contracts).

interface IBorrowerOperations {
    function openTrove(uint256 debtAmount, address upperHint, address lowerHint) external payable;
    function addColl(address upperHint, address lowerHint) external payable;
    function withdrawColl(uint256 amount, address upperHint, address lowerHint) external;
    function withdrawMUSD(uint256 amount, address upperHint, address lowerHint) external;
    function repayMUSD(uint256 amount, address upperHint, address lowerHint) external;
    function adjustTrove(
        uint256 collWithdrawal,
        uint256 debtChange,
        bool isDebtIncrease,
        address upperHint,
        address lowerHint
    ) external payable;
    function closeTrove() external;
    function claimCollateral() external;
    function minNetDebt() external view returns (uint256);
    function getBorrowingFee(uint256 debt) external view returns (uint256);
    function getRedemptionRate(uint256 collateralDrawn) external view returns (uint256);
}

interface ITroveManager {
    function redeemCollateral(
        uint256 amount,
        address firstRedemptionHint,
        address upperPartialRedemptionHint,
        address lowerPartialRedemptionHint,
        uint256 partialRedemptionHintNICR,
        uint256 maxIterations
    ) external;
    function liquidate(address borrower) external;
    function getCurrentICR(address borrower, uint256 price) external view returns (uint256);
    function getNominalICR(address borrower) external view returns (uint256);
    function getTroveStatus(address borrower) external view returns (uint256);
    function getTroveColl(address borrower) external view returns (uint256);
    function getTroveDebt(address borrower) external view returns (uint256);
    function getTrovePrincipal(address borrower) external view returns (uint256);
    function getEntireDebtAndColl(address borrower)
        external
        view
        returns (
            uint256 coll,
            uint256 principal,
            uint256 interest,
            uint256 pendingCollateral,
            uint256 pendingPrincipal,
            uint256 pendingInterest
        );
    function getTroveOwnersCount() external view returns (uint256);
    function getTCR(uint256 price) external view returns (uint256);
    function checkRecoveryMode(uint256 price) external view returns (bool);
    function MCR() external view returns (uint256);
    function MUSD_GAS_COMPENSATION() external view returns (uint256);
}

interface ISortedTroves {
    function getLast() external view returns (address);
    function getFirst() external view returns (address);
    function getPrev(address id) external view returns (address);
    function getNext(address id) external view returns (address);
    function getSize() external view returns (uint256);
    function contains(address id) external view returns (bool);
    function findInsertPosition(uint256 nicr, address prevId, address nextId)
        external
        view
        returns (address, address);
}

interface IHintHelpers {
    function getApproxHint(uint256 cr, uint256 numTrials, uint256 inputRandomSeed)
        external
        view
        returns (address hintAddress, uint256 diff, uint256 latestRandomSeed);
    function getRedemptionHints(uint256 amount, uint256 price, uint256 maxIterations)
        external
        view
        returns (address firstRedemptionHint, uint256 partialRedemptionHintNICR, uint256 truncatedAmount);
    function computeNominalCR(uint256 coll, uint256 debt) external pure returns (uint256);
}

interface IPriceFeed {
    function fetchPrice() external view returns (uint256);
}
