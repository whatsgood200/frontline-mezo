// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IBorrowerOperations} from "./interfaces/IMezoMUSD.sol";

/// @title AbsorberTrove
/// @notice Owns exactly one MUSD trove (Mezo allows one per address) on behalf of the
///         AbsorberVault. Every call comes from the vault; every MUSD and BTC it receives
///         goes straight back to the vault, so it never holds funds between calls.
contract AbsorberTrove {
    using SafeERC20 for IERC20;

    address public immutable vault;
    IBorrowerOperations public immutable borrowerOperations;
    IERC20 public immutable musd;

    error NotVault();
    error SendFailed();

    constructor(IBorrowerOperations borrowerOperations_, IERC20 musd_) {
        vault = msg.sender;
        borrowerOperations = borrowerOperations_;
        musd = musd_;
    }

    modifier onlyVault() {
        if (msg.sender != vault) revert NotVault();
        _;
    }

    /// @dev Receives BTC from ActivePool (withdrawals, close) and CollSurplusPool (claims).
    receive() external payable {}

    function open(uint256 debt, address upperHint, address lowerHint) external payable onlyVault {
        borrowerOperations.openTrove{value: msg.value}(debt, upperHint, lowerHint);
        _sweep();
    }

    /// @dev MUSD for a debt decrease must already sit in this contract; repayment burns it from here.
    function adjust(
        uint256 collWithdrawal,
        uint256 debtChange,
        bool isDebtIncrease,
        address upperHint,
        address lowerHint
    ) external payable onlyVault {
        borrowerOperations.adjustTrove{value: msg.value}(
            collWithdrawal, debtChange, isDebtIncrease, upperHint, lowerHint
        );
        _sweep();
    }

    /// @dev Needs debt minus the 200 MUSD gas deposit in this contract.
    function close() external onlyVault {
        borrowerOperations.closeTrove();
        _sweep();
    }

    /// @notice Pulls leftover BTC after a full redemption closed the trove.
    function claimSurplus() external onlyVault {
        borrowerOperations.claimCollateral();
        _sweep();
    }

    function _sweep() private {
        uint256 m = musd.balanceOf(address(this));
        if (m > 0) musd.safeTransfer(vault, m);
        uint256 b = address(this).balance;
        if (b > 0) {
            (bool ok,) = vault.call{value: b}("");
            if (!ok) revert SendFailed();
        }
    }
}
