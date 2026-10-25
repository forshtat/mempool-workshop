# Which mempool do I need?

Two mempools, two sets of rules (terms: see the [README](../README.md)).

- **Canonical mempool**: the public mempool defined by EIP-8141. Every node that implements EIP-8141 runs it. Strictest rules; no staking, no reputation.
- **Standard alt-mempool**: ERC-8421-style rules, implemented by the sidecar. More permissive for **staked** entities in good standing, at the price of staking and reputation risk.
  (This repo shows the PR #6 version of those rules; see the notice in the README.)

## The questions

Answer in order. The first "yes" in 1 to 3 means the canonical mempool will reject your validation code.

1. **Does validation read storage that is not the sender's own or associated storage?**
   (for example another contract's slot: an allowlist, an oracle, a shared nullifier set)
   Canonical: rejected (ethrex: `StorageReadNonSender`). Standard alt-mempool: rejected while unstaked, accepted once the entity is staked.
   *Verified by steps 6 to 8.*
2. **Does validation use `BALANCE`/`SELFBALANCE`, or another gated opcode?**
   `BALANCE` is rejected for an unstaked payer (`payer uses banned opcode: BALANCE`; this is why the example paymaster does not check its own balance).
   The sidecar devnet docs say staking above `minStake` unlocks `BALANCE`/`SELFBALANCE`. *Not exercised by the steps.*
   Environment opcodes such as `TIMESTAMP`, `NUMBER`, `COINBASE`, `ORIGIN` and `GASPRICE` are rejected by **both** mempools, staked or not.
3. **Does validation need more gas than the canonical cap (`MAX_VERIFY_GAS`, 100,000 across the validation prefix)?**
   The standard alt-mempool has a separate, per-entity budget for staked entities. *Not exercised by the steps.*
4. **Can your entity stake and carry reputation risk?**
   Staking needs more than `minStake` (0.01 ETH on the devnet; the steps stake 0.012 ETH) with an unstake delay.
   A staked entity whose txs keep being admitted but not included becomes `THROTTLED` and then `BANNED`, and a banned entity is excluded from the mempool even though it is staked (steps 9 and 10).
   If you cannot accept that, stay inside the canonical rules.
5. **Who will include your tx?**
   A tx admitted only by the standard alt-mempool reaches only nodes and block builders that run it. A canonical-mempool tx reaches every EIP-8141 node.
   On the devnet the block builder runs the sidecar, so both work. On a real network, check who runs what.

## Rule of thumb

| Your validation code | Choose |
|---|---|
| Only the account's own storage; no gated opcodes; within the gas cap | **Canonical mempool.** Widest propagation, no staking. |
| Needs shared state (registries, nullifier sets, allowlists) or gated opcodes, and the entity can stake | **Standard alt-mempool**, with a staked entity. |
| Needs `TIMESTAMP`, `NUMBER`, `COINBASE`, `ORIGIN`, `GASPRICE` or similar in validation | **Neither.** Move that logic into the execution frames; validation may not use environment opcodes. |

## Practical limits you will hit

- Fund contracts only through their creation `value`. A plain transfer runs the contract's validation code outside a frame and fails.
- Validation code cannot see the tx signature hash from Solidity. This repo reads the protocol-verified signer through `SIGPARAM` (see `docs/findings.md`).
- Deploying a contract on this devnet needs about 6M gas (code deposit is charged as state gas).
- A transfer that creates a new account needs a non-zero `state` gas limit on the frame.
