// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ForkBase} from "./ForkBase.sol";
import {AbsorberVault} from "../../src/AbsorberVault.sol";
import {ProtectedLoan} from "../../src/ProtectedLoan.sol";
import {ProtectedLoanFactory} from "../../src/ProtectedLoanFactory.sol";
import {FrontlineLens} from "../../src/FrontlineLens.sol";

/// End-to-end flows on a Mezo testnet fork with the real MUSD contracts.
contract FrontlineForkTest is ForkBase {
    uint256 constant ABSORBER_ICR = 1.135e18;

    /// Two absorbers deposit, the keeper deploys trove 0, Bob opens a protected loan.
    function _setUpMarket() internal returns (ProtectedLoan loan) {
        _deposit(alice, 0.6 ether);
        _deposit(carol, 0.4 ether);
        _deployAt(0, 0.9 ether, ABSORBER_ICR);
        loan = _openProtected(bob, 0.1 ether, 4_000e18);
    }

    // ---------------------------------------------------------------- deposits

    function test_depositMintsSharesWorthAboutOneMusdEach() public {
        uint256 shares = _deposit(alice, 1 ether);
        // 21-decimal shares: 1e21 units is one share, about 1 MUSD.
        assertApproxEqRel(shares, price * 1e3, 1e12);
        assertApproxEqRel(vault.sharePrice(), 1e18, 1e12);
        assertEq(address(vault).balance, 1 ether);
    }

    function test_depositRejectsDust() public {
        vm.prank(alice);
        vm.expectRevert(AbsorberVault.DepositTooSmall.selector);
        vault.deposit{value: 0.00001 ether}();
    }

    function test_laterDepositorGetsFairShares() public {
        uint256 a = _deposit(alice, 1 ether);
        uint256 c = _deposit(carol, 1 ether);
        assertApproxEqRel(a, c, 1e12);
    }

    // ---------------------------------------------------------------- keeper

    function test_deployPutsAbsorberAtTheFrontInsideTheBand() public {
        _deposit(alice, 1 ether);
        uint256 navBefore = vault.totalAssets();
        _deployAt(0, 0.9 ether, ABSORBER_ICR);
        address t = _trove(0);
        assertEq(ST.getLast(), t, "absorber is not first in the redemption line");
        assertGe(_icr(t), BAND_LOW);
        assertLe(_icr(t), BAND_HIGH);
        // Deploying only costs MUSD's 0.1% borrowing fee.
        assertApproxEqRel(vault.totalAssets(), navBefore, 0.002e18);
        assertGt(vault.absorberDebt(), 60_000e18);
    }

    function test_deployRefusesRatiosOutsideTheBand() public {
        _deposit(alice, 1 ether);
        (uint256 debtArg, uint256 total) = _debtForIcr(0.9 ether, 1.3e18);
        AbsorberVault.Hint memory h = _hint(0.9 ether, total);
        vm.prank(keeper);
        vm.expectRevert();
        vault.deploy(0, 0.9 ether, debtArg, h);
    }

    function test_onlyKeeperDeploys() public {
        _deposit(alice, 1 ether);
        (uint256 debtArg, uint256 total) = _debtForIcr(0.9 ether, ABSORBER_ICR);
        AbsorberVault.Hint memory h = _hint(0.9 ether, total);
        vm.prank(stranger);
        vm.expectRevert(AbsorberVault.NotKeeper.selector);
        vault.deploy(0, 0.9 ether, debtArg, h);
    }

    // ---------------------------------------------------------------- protected loans

    function test_protectedLoanOpensBehindTheAbsorbers() public {
        ProtectedLoan loan = _setUpMarket();
        assertEq(factory.loanOf(bob), address(loan));
        assertEq(MUSD.balanceOf(bob), 4_000e18);
        assertGe(loan.icr(), loan.PROTECTION_FLOOR());
        assertApproxEqAbs(factory.totalProtectedDebt(), 4_204e18, 1e18);
        (uint256 total, uint256 guaranteed, uint256 position) = lens.bufferAhead(address(loan));
        assertGt(position, 1);
        assertEq(guaranteed, vault.absorberDebt(), "all absorber debt stands in front");
        assertGe(total, guaranteed);
    }

    function test_coverageCapRefusesTooMuchProtectedDebt() public {
        _setUpMarket();
        uint256 available = vault.maxNewProtectedDebt();
        (address up, address low) = _hints(10 ether, available + 10_000e18);
        vm.prank(carol);
        vm.expectRevert();
        factory.open{value: 10 ether}(available + 5_000e18, up, low);
    }

    function test_noProtectionWithoutAbsorbers() public {
        (address up, address low) = _hints(0.1 ether, 4_204e18);
        vm.prank(bob);
        vm.expectRevert();
        factory.open{value: 0.1 ether}(4_000e18, up, low);
    }

    function test_loanRefusesBorrowingUnderTheFloor() public {
        ProtectedLoan loan = _setUpMarket();
        // 0.1 BTC at about $80k backs at most about $5.3k at 150%.
        (address up, address low) = _hints(0.1 ether, 6_000e18);
        vm.prank(bob);
        vm.expectRevert();
        loan.borrow(2_000e18, up, low);
    }

    function test_onlyOwnerMovesTheLoan() public {
        ProtectedLoan loan = _setUpMarket();
        vm.startPrank(stranger);
        vm.expectRevert(ProtectedLoan.NotOwner.selector);
        loan.borrow(1e18, address(0), address(0));
        vm.expectRevert(ProtectedLoan.NotOwner.selector);
        loan.withdrawCollateral(1, address(0), address(0));
        vm.expectRevert(ProtectedLoan.NotOwner.selector);
        loan.close();
        vm.stopPrank();
    }

    function test_ownerRepaysAndCloses() public {
        ProtectedLoan loan = _setUpMarket();
        // Bob needs the 0.1% fee on top of what he borrowed to close: give him a little MUSD.
        _fundRedeemer(100e18);
        vm.prank(redeemer);
        MUSD.transfer(bob, 100e18);

        vm.startPrank(bob);
        MUSD.approve(address(loan), type(uint256).max);
        loan.repay(1_000e18, address(0), address(0));
        uint256 btcBefore = bob.balance;
        loan.close();
        vm.stopPrank();

        assertFalse(loan.isActive());
        assertApproxEqAbs(bob.balance - btcBefore, 0.1 ether, 1e9);
        assertEq(factory.totalProtectedDebt(), 0);
    }

    // ---------------------------------------------------------------- the hero path

    function test_redemptionHitsAbsorberAndLeavesProtectedLoanUntouched() public {
        ProtectedLoan loan = _setUpMarket();
        address t = _trove(0);
        uint256 protColl = _coll(address(loan));
        uint256 protDebt = _debt(address(loan));
        uint256 absColl = _coll(t);
        uint256 absDebt = _debt(t);
        uint256 navBefore = vault.totalAssets();

        _fundRedeemer(10_000e18);
        uint256 redeemed = _redeem(10_000e18);

        assertEq(redeemed, 10_000e18);
        assertEq(_coll(address(loan)), protColl, "protected collateral moved");
        assertEq(_debt(address(loan)), protDebt, "protected debt moved");
        assertLt(_coll(t), absColl, "absorber gave no BTC");
        assertApproxEqAbs(absDebt - _debt(t), 10_000e18, 1e18);
        // A redemption at the oracle price leaves absorbers' dollar value unchanged.
        assertApproxEqRel(vault.totalAssets(), navBefore, 0.0005e18);
    }

    function test_lensShowsTheLineFrontFirst() public {
        ProtectedLoan loan = _setUpMarket();
        (FrontlineLens.Row[] memory rows,, uint256 total) = lens.line(400);
        assertGt(total, 300);
        assertEq(rows[0].owner, _trove(0));
        assertEq(rows[0].side, lens.ABSORBER());
        assertEq(rows[0].redeemedBefore, 0);
        bool found;
        for (uint256 i; i < rows.length; ++i) {
            if (rows[i].owner == address(loan)) {
                assertEq(rows[i].side, lens.PROTECTED());
                found = true;
            }
        }
        assertTrue(found, "protected loan not in the first 400");
    }

    // ---------------------------------------------------------------- premiums

    function test_premiumAccruesAndPaysAbsorbers() public {
        ProtectedLoan loan = _setUpMarket();
        vm.warp(block.timestamp + 30 days);

        uint256 due = loan.premiumDue();
        // 30 days of the vault's rate on about 4,204 MUSD.
        uint256 expected = (4_204e18 * vault.premiumRate() * 30) / (365 * 1e18);
        assertApproxEqRel(due, expected, 0.01e18);

        // Measure the premium alone: over the same 30 days the absorber troves also accrued
        // MUSD interest, which at this oversupplied coverage (about 15x) outweighs the premium.
        // Premiums vest into NAV over PREMIUM_VESTING, so nobody can deposit just before a
        // collection and leave just after with premiums earned before they joined.
        uint256 navBefore = vault.totalAssets();
        vm.prank(stranger);
        uint256 paid = loan.collectPremium(address(0), address(0));
        assertEq(paid, due);
        assertEq(loan.premiumOwed(), 0);
        assertEq(vault.unvestedPremium(), paid, "premium not vesting");
        assertApproxEqAbs(vault.totalAssets(), navBefore, 1e15, "premium counted before vesting");
        vm.warp(block.timestamp + vault.PREMIUM_VESTING() / 2);
        assertApproxEqAbs(vault.unvestedPremium(), paid / 2, 1e12, "not vesting linearly");
        vm.warp(block.timestamp + vault.PREMIUM_VESTING());
        assertEq(vault.unvestedPremium(), 0, "premium never fully vested");
    }

    function test_justInTimeDepositGetsNoPremiumEarnedBeforeIt() public {
        ProtectedLoan loan = _setUpMarket();
        vm.warp(block.timestamp + 30 days);
        uint256 valueIn = (0.5 ether * price) / 1e18;
        uint256 shares = _deposit(stranger, 0.5 ether);
        vm.prank(stranger);
        loan.collectPremium(address(0), address(0));

        uint256 btcBefore = stranger.balance;
        AbsorberVault.Hint[] memory hs = _hintsFor(2);
        vm.prank(stranger);
        (uint256 btcOut, uint256 musdOut) = vault.withdraw(shares, hs);
        assertEq(stranger.balance - btcBefore, btcOut);
        uint256 valueOut = (btcOut * price) / 1e18 + musdOut;
        assertLe(valueOut, valueIn, "a just-in-time depositor captured earlier premium");
    }

    function test_premiumUsesTheLowerRateSoItCannotBePumpedBeforeCollection() public {
        ProtectedLoan loan = _setUpMarket();
        uint256 rateAtOpen = vault.premiumRate();
        uint256 debt = _debt(address(loan));
        vm.warp(block.timestamp + 30 days);

        // A large new protected loan lowers coverage and raises the vault's rate.
        vm.deal(stranger, 3 ether);
        _openProtected(stranger, 2.2 ether, 100_000e18);
        assertGt(vault.premiumRate(), rateAtOpen, "rate did not rise");

        vm.prank(stranger);
        uint256 paid = loan.collectPremium(address(0), address(0));
        uint256 atOpenRate = (debt * rateAtOpen * 30) / (365 * 1e18);
        assertApproxEqRel(paid, atOpenRate, 0.01e18, "elapsed period charged at the pumped rate");
    }

    function test_anyoneResyncsAProtectedLoanDebt() public {
        ProtectedLoan loan = _setUpMarket();
        vm.warp(block.timestamp + 90 days);
        assertLt(factory.debtOf(address(loan)), _debt(address(loan)), "no interest accrued");
        vm.prank(stranger);
        loan.sync();
        assertEq(factory.debtOf(address(loan)), _debt(address(loan)));
        assertEq(factory.totalProtectedDebt(), _debt(address(loan)));
    }

    function test_onlyRegisteredLoansNotifyPremium() public {
        vm.prank(stranger);
        vm.expectRevert(AbsorberVault.NotRegisteredLoan.selector);
        vault.notifyPremium(1e18);
    }

    // ---------------------------------------------------------------- withdrawals

    function test_partialWithdrawalUnwindsProRataAndKeepsSharePrice() public {
        _setUpMarket();
        uint256 sharesBefore = vault.balanceOf(alice);
        uint256 priceBefore = vault.sharePrice();
        uint256 aliceBtc = alice.balance;

        AbsorberVault.Hint[] memory hs = _hintsFor(2);
        vm.prank(alice);
        (uint256 btcOut,) = vault.withdraw(sharesBefore / 2, hs);

        assertGt(btcOut, 0.25 ether);
        assertEq(alice.balance - aliceBtc, btcOut);
        assertApproxEqRel(vault.sharePrice(), priceBefore, 0.0005e18);
        assertEq(TM.getTroveStatus(_trove(0)), STATUS_ACTIVE);
    }

    function test_lastAbsorberCanExitByCoveringTheFeeGap() public {
        _deposit(alice, 1 ether);
        _deployAt(0, 0.9 ether, ABSORBER_ICR);
        // The vault owes MUSD's borrowing fee it has not earned back; Alice covers that gap.
        _fundRedeemer(2_000e18);
        vm.prank(redeemer);
        MUSD.transfer(alice, 1_000e18);

        AbsorberVault.Hint[] memory hs = _hintsFor(2);
        uint256 shares = vault.balanceOf(alice);
        vm.startPrank(alice);
        MUSD.approve(address(vault), type(uint256).max);
        uint256 musdBefore = MUSD.balanceOf(alice);
        (uint256 btcOut,) = vault.withdraw(shares, hs);
        vm.stopPrank();

        assertEq(vault.totalSupply(), 0);
        assertTrue(TM.getTroveStatus(_trove(0)) != STATUS_ACTIVE, "trove not closed");
        assertApproxEqRel(btcOut, 1 ether, 0.001e18);
        // She paid roughly the 0.1% fee on about 63k MUSD, not more.
        assertLt(musdBefore - MUSD.balanceOf(alice), 100e18);
    }

    // ---------------------------------------------------------------- price shocks

    function test_anyoneProtectsAnAbsorberAfterAPriceDrop() public {
        _setUpMarket();
        address t = _trove(0);
        _setPrice((price * 98) / 100);
        assertLt(_icr(t), BAND_LOW);

        uint256 strangerMusd = MUSD.balanceOf(stranger);
        AbsorberVault.Hint memory h = _neighbourHint(t);
        vm.prank(stranger);
        uint256 repaid = vault.protect(0, h);

        assertGt(repaid, 0);
        assertGe(_icr(t), BAND_LOW);
        assertEq(MUSD.balanceOf(stranger) - strangerMusd, vault.PROTECT_BOUNTY());
        vm.expectRevert();
        TM.liquidate(t);
    }

    function test_protectRefusedInsideTheBand() public {
        _setUpMarket();
        AbsorberVault.Hint memory h = _neighbourHint(_trove(0));
        vm.prank(stranger);
        vm.expectRevert();
        vault.protect(0, h);
    }

    function test_keeperRebalancesBackToTheFront() public {
        _setUpMarket();
        address t = _trove(0);
        _setPrice((price * 101) / 100);
        uint256 before = _icr(t);
        AbsorberVault.Hint memory h = _neighbourHint(t);
        vm.prank(keeper);
        vault.rebalance(0, 1.125e18, h);
        assertLt(_icr(t), before);
        assertApproxEqRel(_icr(t), 1.125e18, 0.002e18);
    }

    // ---------------------------------------------------------------- full redemption

    function test_fullRedemptionClosesAbsorberThenSurplusAndRearm() public {
        ProtectedLoan loan = _setUpMarket();
        address t = _trove(0);
        uint256 protColl = _coll(address(loan));
        uint256 lot = _debt(t) - TM.MUSD_GAS_COMPENSATION();
        _fundRedeemer(lot);
        _redeem(lot);

        assertTrue(TM.getTroveStatus(t) != STATUS_ACTIVE, "absorber not closed by redemption");
        assertEq(_coll(address(loan)), protColl, "protected collateral moved");

        uint256 idleBefore = address(vault).balance;
        vm.prank(stranger);
        vault.claimSurplus(0);
        assertGt(address(vault).balance, idleBefore, "no surplus claimed");

        // The keeper rearms with what came back.
        _deployAt(0, address(vault).balance * 9 / 10, ABSORBER_ICR);
        assertEq(TM.getTroveStatus(t), STATUS_ACTIVE);
        assertEq(ST.getLast(), t);
    }

    function test_surplusAfterAFullRedemptionCountsInNav() public {
        _setUpMarket();
        address t = _trove(0);
        uint256 lot = _debt(t) - TM.MUSD_GAS_COMPENSATION();
        _fundRedeemer(lot);
        _redeem(lot);
        assertTrue(TM.getTroveStatus(t) != STATUS_ACTIVE, "absorber not closed by redemption");

        uint256 navBefore = vault.totalAssets();
        vm.prank(stranger);
        vault.claimSurplus(0);
        assertApproxEqRel(vault.totalAssets(), navBefore, 1e12, "unclaimed surplus missing from NAV");
    }

    function test_nobodySnipesTheSurplusByDepositingBeforeTheClaim() public {
        _setUpMarket();
        address t = _trove(0);
        uint256 lot = _debt(t) - TM.MUSD_GAS_COMPENSATION();
        _fundRedeemer(lot);
        _redeem(lot);

        uint256 valueIn = (0.5 ether * price) / 1e18;
        uint256 shares = _deposit(stranger, 0.5 ether);
        vm.prank(stranger);
        vault.claimSurplus(0);
        AbsorberVault.Hint[] memory hs = _hintsFor(2);
        vm.prank(stranger);
        (uint256 btcOut, uint256 musdOut) = vault.withdraw(shares, hs);
        assertLe((btcOut * price) / 1e18 + musdOut, valueIn, "depositor took absorbers' surplus");
    }

    function test_withdrawalClaimsPendingSurplusFirst() public {
        _setUpMarket();
        address t = _trove(0);
        uint256 lot = _debt(t) - TM.MUSD_GAS_COMPENSATION();
        _fundRedeemer(lot);
        _redeem(lot);

        uint256 aliceShares = vault.balanceOf(alice);
        uint256 navShare = (vault.totalAssets() * aliceShares) / vault.totalSupply();
        AbsorberVault.Hint[] memory hs = _hintsFor(2);
        vm.prank(alice);
        (uint256 btcOut, uint256 musdOut) = vault.withdraw(aliceShares, hs);
        assertApproxEqRel((btcOut * price) / 1e18 + musdOut, navShare, 1e12, "withdrawer lost the surplus share");
    }

    // ---------------------------------------------------------------- owner limits

    function test_ownerCannotSetABandUnder111point5() public {
        vm.expectRevert(AbsorberVault.BadBand.selector);
        vault.setBand(1.11e18, 1.15e18);
    }

    function test_registryCanOnlyBeSetOnce() public {
        vm.expectRevert(AbsorberVault.RegistryAlreadySet.selector);
        vault.setRegistry(factory);
    }
}
