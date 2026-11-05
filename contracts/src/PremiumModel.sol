// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @title PremiumModel
/// @notice Prices redemption protection from coverage (absorber debt / protected debt).
///         premium(c) = clamp(K / c, MIN, MAX), all values WAD (1e18 = 100%).
///         Mirrors `premiumRate` in web/src/lib/frontline/math.ts; tests pin both to the
///         plan's worked example (0.35x coverage pays about 1.26% a year).
library PremiumModel {
    uint256 internal constant WAD = 1e18;
    uint256 internal constant K = 0.0044e18;
    uint256 internal constant MIN_RATE = 0.005e18;
    uint256 internal constant MAX_RATE = 0.03e18;
    /// @notice New protected debt is refused below this coverage.
    uint256 internal constant MIN_COVERAGE = 0.25e18;

    /// @param coverage absorberDebt * WAD / protectedDebt; type(uint256).max when nothing is protected.
    function rate(uint256 coverage) internal pure returns (uint256) {
        if (coverage == 0) return MAX_RATE;
        if (coverage == type(uint256).max) return MIN_RATE;
        uint256 r = (K * WAD) / coverage;
        if (r < MIN_RATE) return MIN_RATE;
        if (r > MAX_RATE) return MAX_RATE;
        return r;
    }

    function coverageOf(uint256 absorberDebt, uint256 protectedDebt) internal pure returns (uint256) {
        if (protectedDebt == 0) return type(uint256).max;
        return (absorberDebt * WAD) / protectedDebt;
    }

    /// @notice Largest protected debt the current absorber layer can still cover.
    function maxNewProtectedDebt(uint256 absorberDebt, uint256 protectedDebt) internal pure returns (uint256) {
        uint256 cap = (absorberDebt * WAD) / MIN_COVERAGE;
        return cap > protectedDebt ? cap - protectedDebt : 0;
    }
}
