// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @notice Test-only stand-in for Mezo's BTC/USD oracle precompile (0x7b7c...0015), which a
///         local fork cannot execute. Its runtime code is copied to the precompile address on
///         an anvil fork (anvil_setCode), so MUSD's PriceFeed reads a fresh price.
///         The answer lives in storage slot 0 so tests can move the price (anvil_setStorageAt).
contract MockAggregator {
    int256 public answer;

    constructor(int256 answer_) {
        answer = answer_;
    }

    function decimals() external pure returns (uint8) {
        return 18;
    }

    function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80) {
        return (1, answer, block.timestamp, block.timestamp, 1);
    }
}
