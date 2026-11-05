# Frontline contracts

Foundry project. Solidity 0.8.28 with `evm_version = london` (Mezo has no PUSH0). OpenZeppelin 5.1.

```bash
forge build
forge test --no-match-path "test/spikes/*"     # unit, fuzz, invariant
forge test --match-path "test/spikes/*" -vv    # fork spikes against Mezo testnet (slow)
```

MUSD interfaces in `src/interfaces/IMezoMUSD.sol` are copied from github.com/mezo-org/musd. Spike results: `../docs/spikes.md`.
