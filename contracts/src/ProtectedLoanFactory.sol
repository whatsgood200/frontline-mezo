// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {IBorrowerOperations, ITroveManager, IPriceFeed} from "./interfaces/IMezoMUSD.sol";
import {IAbsorberVault, IProtectedLoanRegistry} from "./interfaces/IFrontline.sol";
import {ProtectedLoan} from "./ProtectedLoan.sol";

/// @title ProtectedLoanFactory
/// @notice Deploys one ProtectedLoan clone per borrower (deterministic address), refuses new
///         protected debt beyond what the absorber layer can cover, and keeps the running total
///         of protected debt that prices the premium.
contract ProtectedLoanFactory is IProtectedLoanRegistry {
    address public immutable implementation;
    IAbsorberVault public immutable vault;
    IBorrowerOperations public immutable borrowerOperations;
    ITroveManager public immutable troveManager;
    IPriceFeed public immutable priceFeed;
    IERC20 public immutable musd;

    mapping(address => address) public loanOf;
    mapping(address => bool) public isLoan;
    mapping(address => uint256) public debtOf;
    uint256 public totalProtectedDebt;
    address[] internal _loans;

    event LoanCreated(address indexed owner, address indexed loan);
    event LoanOpened(address indexed owner, address indexed loan, uint256 collateral, uint256 debt);
    event DebtSynced(address indexed loan, uint256 debt, uint256 totalProtectedDebt);

    error CoverageCap(uint256 requested, uint256 available);
    error LoanStillActive();
    error NotLoan();

    constructor(
        IAbsorberVault vault_,
        IBorrowerOperations borrowerOperations_,
        ITroveManager troveManager_,
        IPriceFeed priceFeed_,
        IERC20 musd_
    ) {
        vault = vault_;
        borrowerOperations = borrowerOperations_;
        troveManager = troveManager_;
        priceFeed = priceFeed_;
        musd = musd_;
        implementation = address(new ProtectedLoan());
    }

    /// @notice Opens (or reopens) the caller's protected loan with the BTC sent.
    /// @param debt MUSD to receive; total debt adds MUSD's borrowing fee and 200 MUSD gas deposit.
    function open(uint256 debt, address upperHint, address lowerHint) external payable returns (address loan) {
        loan = loanOf[msg.sender];
        if (loan == address(0)) {
            loan = Clones.cloneDeterministic(implementation, _salt(msg.sender));
            ProtectedLoan(payable(loan)).initialize(msg.sender);
            loanOf[msg.sender] = loan;
            isLoan[loan] = true;
            _loans.push(loan);
            emit LoanCreated(msg.sender, loan);
        } else if (ProtectedLoan(payable(loan)).isActive()) {
            revert LoanStillActive();
        }
        uint256 expected = debt + borrowerOperations.getBorrowingFee(debt) + troveManager.MUSD_GAS_COMPENSATION();
        uint256 available = vault.maxNewProtectedDebt();
        if (expected > available) revert CoverageCap(expected, available);
        ProtectedLoan(payable(loan)).open{value: msg.value}(debt, upperHint, lowerHint);
        emit LoanOpened(msg.sender, loan, msg.value, debt);
    }

    /// @notice Loans report their total debt after every change.
    function syncDebt(uint256 newDebt) external {
        if (!isLoan[msg.sender]) revert NotLoan();
        totalProtectedDebt = totalProtectedDebt - debtOf[msg.sender] + newDebt;
        debtOf[msg.sender] = newDebt;
        emit DebtSynced(msg.sender, newDebt, totalProtectedDebt);
    }

    function predictLoan(address owner) external view returns (address) {
        return Clones.predictDeterministicAddress(implementation, _salt(owner));
    }

    function loanCount() external view returns (uint256) {
        return _loans.length;
    }

    function loanAt(uint256 i) external view returns (address) {
        return _loans[i];
    }

    function _salt(address owner) internal pure returns (bytes32) {
        return bytes32(uint256(uint160(owner)));
    }
}
