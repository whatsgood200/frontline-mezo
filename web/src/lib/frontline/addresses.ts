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

/**
 * Frontline contracts on Mezo testnet, redeployed 2026-11-06 at block 16,608,874 with the
 * self-review fixes (docs/security.md; record in contracts/deployments/testnet.json).
 */
export const FRONTLINE_ADDRESSES = {
  absorberVault: "0x0CD16Bb4d327e2bA0947deE279073cEc2E0DA265",
  loanFactory: "0xD8f888161FAcB6529e9389B2b1b9E3Df2636957e",
  lens: "0x943d4252c759249D24D375E855B0a3caf13DB874",
  loanImplementation: "0x73E6b5965779e1823c607458F9d79ac8Cf8eE251",
  absorberTroves: ["0x917ee2bdD16621A8aD2797D836B0d2544e6dC4Ef", "0x1d174559Be0a9E968bfA17d088d21930dEA59e15"],
  deployBlock: 16_608_860,
} as const;
