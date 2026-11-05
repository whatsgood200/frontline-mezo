// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {PremiumModel} from "../src/PremiumModel.sol";

contract PremiumModelHarness {
    function rate(uint256 c) external pure returns (uint256) {
        return PremiumModel.rate(c);
    }

    function coverageOf(uint256 a, uint256 p) external pure returns (uint256) {
        return PremiumModel.coverageOf(a, p);
    }

    function maxNew(uint256 a, uint256 p) external pure returns (uint256) {
        return PremiumModel.maxNewProtectedDebt(a, p);
    }
}

contract PremiumModelTest is Test {
    PremiumModelHarness h = new PremiumModelHarness();

    function test_planExample_035xPaysAbout126bps() public view {
        // 0.0044 / 0.35 = 1.2571%
        assertApproxEqAbs(h.rate(0.35e18), 0.012571e18, 0.000001e18);
    }

    function test_matchesWebMath_examples() public view {
        // Same cases as web/src/lib/frontline/math.test.ts
        assertEq(h.rate(10e18), 0.005e18);
        assertEq(h.rate(0.01e18), 0.03e18);
        assertEq(h.rate(0), 0.03e18);
        assertEq(h.rate(type(uint256).max), 0.005e18);
    }

    function testFuzz_rateAlwaysBounded(uint256 c) public view {
        uint256 r = h.rate(c);
        assertGe(r, 0.005e18);
        assertLe(r, 0.03e18);
    }

    function testFuzz_rateNeverRisesWithCoverage(uint256 a, uint256 b) public view {
        a = bound(a, 1, 1e30);
        b = bound(b, a, 1e30);
        assertLe(h.rate(b), h.rate(a));
    }

    function test_noProtectedDebtMeansInfiniteCoverage() public view {
        assertEq(h.coverageOf(1000e18, 0), type(uint256).max);
    }

    function testFuzz_capKeepsCoverageAtMinimum(uint256 absorber, uint256 protectedDebt) public view {
        absorber = bound(absorber, 1e18, 1e30);
        protectedDebt = bound(protectedDebt, 0, absorber * 4);
        uint256 extra = h.maxNew(absorber, protectedDebt);
        uint256 after_ = protectedDebt + extra;
        if (after_ > 0) assertGe(h.coverageOf(absorber, after_), 0.25e18 - 1);
    }
}
