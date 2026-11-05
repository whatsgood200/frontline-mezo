import { parseAbi } from "viem";

// The MUSD functions and events Frontline reads or calls (github.com/mezo-org/musd).

export const troveManagerAbi = parseAbi([
  "function redeemCollateral(uint256 amount, address firstRedemptionHint, address upperPartialRedemptionHint, address lowerPartialRedemptionHint, uint256 partialRedemptionHintNICR, uint256 maxIterations)",
  "function getCurrentICR(address borrower, uint256 price) view returns (uint256)",
  "function getTroveStatus(address borrower) view returns (uint8)",
  "function getTroveInterestRate(address borrower) view returns (uint16)",
  "function getEntireDebtAndColl(address borrower) view returns (uint256 coll, uint256 principal, uint256 interest, uint256 pendingCollateral, uint256 pendingPrincipal, uint256 pendingInterest)",
  "function MUSD_GAS_COMPENSATION() view returns (uint256)",
  "event TroveUpdated(address indexed _borrower, uint256 _principal, uint256 _interest, uint256 _coll, uint256 _stake, uint16 _interestRate, uint256 _lastInterestUpdateTime, uint8 _operation)",
]);

export const sortedTrovesAbi = parseAbi([
  "function getLast() view returns (address)",
  "function getPrev(address id) view returns (address)",
  "function getNext(address id) view returns (address)",
  "function findInsertPosition(uint256 nicr, address prevId, address nextId) view returns (address, address)",
]);

export const hintHelpersAbi = parseAbi([
  "function getApproxHint(uint256 cr, uint256 numTrials, uint256 inputRandomSeed) view returns (address hintAddress, uint256 diff, uint256 latestRandomSeed)",
  "function getRedemptionHints(uint256 amount, uint256 price, uint256 maxIterations) view returns (address firstRedemptionHint, uint256 partialRedemptionHintNICR, uint256 truncatedAmount)",
  "function computeNominalCR(uint256 coll, uint256 debt) pure returns (uint256)",
]);

export const borrowerOperationsAbi = parseAbi(["function getBorrowingFee(uint256 debt) view returns (uint256)"]);

export const priceFeedAbi = parseAbi(["function fetchPrice() view returns (uint256)"]);

export const collSurplusPoolAbi = parseAbi(["function getCollateral(address account) view returns (uint256)"]);

export const erc20Abi = parseAbi([
  "function balanceOf(address account) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
]);
