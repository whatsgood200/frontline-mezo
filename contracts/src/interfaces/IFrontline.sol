// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @notice What the vault needs to know about protected loans.
interface IProtectedLoanRegistry {
    function totalProtectedDebt() external view returns (uint256);
    function isLoan(address account) external view returns (bool);
}

/// @notice What protected loans and the factory need from the vault.
interface IAbsorberVault {
    function premiumRate() external view returns (uint256);
    function maxNewProtectedDebt() external view returns (uint256);
    function isAbsorberTrove(address account) external view returns (bool);
    function bandHigh() external view returns (uint256);
    function notifyPremium(uint256 amount) external;
}
