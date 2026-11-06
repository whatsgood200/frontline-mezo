// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IBorrowerOperations, ITroveManager, ISortedTroves, IPriceFeed} from "../src/interfaces/IMezoMUSD.sol";
import {IAbsorberVault, IProtectedLoanRegistry} from "../src/interfaces/IFrontline.sol";
import {AbsorberVault} from "../src/AbsorberVault.sol";
import {ProtectedLoanFactory} from "../src/ProtectedLoanFactory.sol";
import {FrontlineLens} from "../src/FrontlineLens.sol";

/// Deploys Frontline on Mezo testnet against the official MUSD contracts.
///
///   forge script script/Deploy.s.sol --rpc-url mezo_testnet --broadcast \
///     --account frontline-deployer --sender <deployer address> --legacy
///
/// The deployer key lives in Foundry's encrypted keystore (`cast wallet import`), never in env vars.
contract Deploy is Script {
    // Mezo testnet (matsnet), from github.com/mezo-org/musd deployments.
    IBorrowerOperations constant BO = IBorrowerOperations(0xCdF7028ceAB81fA0C6971208e83fa7872994beE5);
    ITroveManager constant TM = ITroveManager(0xE47c80e8c23f6B4A1aE41c34837a0599D5D16bb0);
    ISortedTroves constant ST = ISortedTroves(0x722E4D24FD6Ff8b0AC679450F3D91294607268fA);
    IPriceFeed constant PF = IPriceFeed(0x86bCF0841622a5dAC14A313a15f96A95421b9366);
    IERC20 constant MUSD = IERC20(0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503);

    /// Testnet's lowest third-party loan sat at 116.4% on 5 Nov; the band stays under it.
    uint256 constant BAND_LOW = 1.12e18;
    uint256 constant BAND_HIGH = 1.15e18;
    uint256 constant ABSORBER_TROVES = 2;

    function run() external {
        require(block.chainid == 31611, "Mezo testnet only");
        vm.startBroadcast();
        AbsorberVault vault = new AbsorberVault(BO, TM, PF, MUSD, ABSORBER_TROVES, BAND_LOW, BAND_HIGH, msg.sender);
        ProtectedLoanFactory factory = new ProtectedLoanFactory(IAbsorberVault(address(vault)), BO, TM, PF, MUSD);
        vault.setRegistry(IProtectedLoanRegistry(address(factory)));
        FrontlineLens lens =
            new FrontlineLens(ST, TM, PF, IAbsorberVault(address(vault)), IProtectedLoanRegistry(address(factory)));
        vm.stopBroadcast();

        console2.log("AbsorberVault       ", address(vault));
        console2.log("ProtectedLoanFactory", address(factory));
        console2.log("ProtectedLoan impl  ", factory.implementation());
        console2.log("FrontlineLens       ", address(lens));
        for (uint256 i; i < ABSORBER_TROVES; ++i) {
            console2.log("AbsorberTrove", i, vault.troveAt(i));
        }

        string memory obj = "deployment";
        vm.serializeUint(obj, "chainId", block.chainid);
        vm.serializeUint(obj, "block", block.number);
        vm.serializeAddress(obj, "absorberVault", address(vault));
        vm.serializeAddress(obj, "loanFactory", address(factory));
        vm.serializeAddress(obj, "loanImplementation", factory.implementation());
        vm.serializeAddress(obj, "absorberTrove0", vault.troveAt(0));
        vm.serializeAddress(obj, "absorberTrove1", vault.troveAt(1));
        string memory json = vm.serializeAddress(obj, "lens", address(lens));
        vm.writeJson(json, "./deployments/testnet.json");
    }
}
