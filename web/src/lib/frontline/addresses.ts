// MUSD contracts on Mezo, from github.com/mezo-org/musd solidity/artifacts/deployments
// (verified on chain 2026-11-05; see ../_chains/MEZO.md M.5b).
export const MUSD_ADDRESSES = {
  testnet: {
    troveManager: "0xE47c80e8c23f6B4A1aE41c34837a0599D5D16bb0",
    sortedTroves: "0x722E4D24FD6Ff8b0AC679450F3D91294607268fA",
    priceFeed: "0x86bCF0841622a5dAC14A313a15f96A95421b9366",
    borrowerOperations: "0xCdF7028ceAB81fA0C6971208e83fa7872994beE5",
    hintHelpers: "0x4e4cBA3779d56386ED43631b4dCD6d8EacEcBCF6",
    musd: "0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503",
    collSurplusPool: "0xB4C35747c26E4aB5F1a7CdC7E875B5946eFa6fa9",
  },
  mainnet: {
    troveManager: "0x94AfB503dBca74aC3E4929BACEeDfCe19B93c193",
    sortedTroves: "0x8C5DB4C62BF29c1C4564390d10c20a47E0b2749f",
    priceFeed: "0xc5aC5A8892230E0A3e1c473881A2de7353fFcA88",
    borrowerOperations: "0x44b1bac67dDA612a41a58AAf779143B181dEe031",
    hintHelpers: "0xD267b3bE2514375A075fd03C3D9CBa6b95317DC3",
    musd: "0xdD468A1DDc392dcdbEf6db6e34E89AA338F9F186",
    collSurplusPool: "0xBF51807ACb3394B8550f0554FB9098856Ef5F491",
  },
} as const;

/** Frontline contracts on Mezo testnet, deployed 2026-11-05 at block 16,591,000 (contracts/deployments/testnet.json). */
export const FRONTLINE_ADDRESSES = {
  absorberVault: "0x45805145536767435185c991097D8193A8518581",
  loanFactory: "0xd7F44463230e95f6b490Da29b8bc475De25C98AB",
  lens: "0x165b7Da20d3688eeF6b6E3D8227e43492Ea38F18",
  loanImplementation: "0x4F4704404D073d8f4d60C609269845186802cffC",
  absorberTroves: ["0xec6E0a1f1acEEf06E0F75a82b0683EC0298e3784", "0x4EE7c5C31176B0B6E09B3d5E0dee005c417B1872"],
  deployBlock: 16_591_000,
} as const;
