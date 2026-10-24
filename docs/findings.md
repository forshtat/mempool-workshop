# Feasibility findings (Task 0)

Run on 2026-10-18 against the public devnet (chain 1337). Probe scripts were throwaway and are not
in the repo. Probe contracts and a funded probe account (`0xd2F6…954e`) were left on the devnet.

## Check 1: canonical rejection (step 6): PASS

The canonical mempool path on the devnet is **ethrex's root endpoint**, with the tx sent as a
type-`0x06` raw transaction through `eth_sendRawTransaction`. It applies EIP-8141's own validation.
Skandha's `/rpc` `eth_sendFrameTransaction` applies the ERC-7562-style rules (the standard
alt-mempool). Same tx, both endpoints:

| Violation | ethrex `eth_sendRawTransaction` (canonical) | Skandha `eth_sendFrameTransaction` (standard alt-mempool) |
|---|---|---|
| Wallet reads another contract's storage | `-32000` `…simulation failed: StorageReadNonSender` | `-32502` `unstaked payer accessed 0x… slot 0x0` |
| Wallet uses `TIMESTAMP` | `-32000` `…simulation failed: BannedOpcode(66)` | `-32502` `payer uses banned opcode: TIMESTAMP` |

Notes
- `ethrex_simulateFrameTransaction` without `{"trace": true}` returned only `prefixShape` in the
  probe (no `valid` or `violation` fields). Do not use it for step 6. Use the raw submit.
- A tx accepted by ethrex's raw path would enter ethrex's public mempool and be mined. Step 6 only
  sends txs expected to be rejected there.
- `/Users/alexf/skandha/packages/*/lib` is stale against `src` (the built codec still uses
  `tx.nonce`). **Vendor the codec from `src`**, never from `lib`.

**Decision:** step 6 submits to ethrex via `eth_sendRawTransaction`; steps 8 and 10 submit to
Skandha. No local rules check is needed. `step_6` should also show the Skandha rejection for the
same tx, so participants see both messages.

## Check 2: Solidity viability (steps 3, 4, 5): PASS with a workaround

- `verbatim_*` is **not available** in Solidity inline assembly (`Function "verbatim_3i_0o" not found`).
- **Workaround that works:** the Solidity wallet `delegatecall`s a tiny approver contract whose
  runtime is the raw bytes `600360006000aa` (APPROVE, scope 3). `APPROVE` runs in the wallet's
  context and the frame is approved. A Solidity `fallback` as the VERIFY target mined with
  both frames `success`.
- foundry settings used: `solc 0.8.28`, `via_ir = true`, `evm_version = "cancun"`.
- **Deploy gas:** a 900,000 gas limit reverted the wallet deployment; 6,000,000 worked (the
  devnet charges state gas for code deposit). Use 6M for contract deployments.
- VERIFY frame limit of 70,000 execution gas was enough for the wallet with a foreign-storage read.
- Funding a contract wallet: only via the `value` of its creation. A plain transfer runs the
  wallet's code, which calls `APPROVE` outside a frame, and fails.
- The wallet's nonce starts at 1 after creation.

**Decision:** one `Approver` contract (raw bytecode, deployed once per participant) plus Solidity
wallets that `delegatecall` it. Wallets take the approver address in the constructor.

## Check 3: reputation (steps 9 and 10): PASS via a declared shortcut

Facts
- Reputation formula: `max_seen = opsSeen // 10`. THROTTLED when `max_seen > opsIncluded + 10`;
  BANNED when `max_seen > opsIncluded + 50`. Throttled entities are limited to 4 mempool entries.
- Devnet base fee is 7 wei. A tx with `maxFeePerGas` 1 wei is rejected (`Insufficient max fee per
  gas`). Txs at 7 and 8 wei were accepted and **were mined within about 45 seconds**, so
  low fees do not stall a tx and do not burn reputation.
- A staked wallet can have many txs in flight by using a different `nonceKeys` entry per tx. 12
  txs went in at about 0.15 s each, and `opsSeen` rose by exactly 1 per accepted tx.
- Skandha bundles every 10 s with `bundleSize` 4 (from `skandha_config`), so a large backlog is
  included slowly while `opsSeen` climbs fast.
- `debug_bundler_setReputation` is reachable from the internet on the devnet (not yet tested).

Result: no reliable honest way to reach a ban on the devnet was found. A flood of roughly 200 valid txs
raises `opsSeen` at about 7 txs/s while inclusion adds only 4 per 10 s, but the result races with
inclusion. Candidate designs for the author to choose from:

1. **Flood** from the staked wallet with distinct nonce keys, then poll. Honest, but timing depends
   on the devnet and other users.
2. **Flood plus invalidation:** wallet validation passes only while one of its own storage slots
   is 0, which is allowed because it is the wallet's own storage. Admit the flood, flip the slot,
   and the queued txs fail on the second validation and are never included. This is the real
   "mass invalidation" attack the reputation system defends against, and it is deterministic
   for the invalidated ones. More code, and I have not tested how Skandha reacts.
3. **Shortcut** with `debug_bundler_setReputation` on the participant's own entity, labelled
   clearly as a simulation. Fast and deterministic, but not the real mechanism, and it depends
   on a debug method that should not be open.

## Check 4: staking (step 7): PASS, simpler than expected

- Registry on the devnet: `0xd51c04d7a0b01124e84de152f4e56d9eecb22d2f` (`NaiveStakingRegistry`).
- `skandha_config`: `minStake` 0.01 ETH, `minUnstakeDelay` 0. The devnet-readme walkthrough uses
  `addStake(86400)` with a value above `minStake`.
- **A wallet can stake itself with no special code.** In a self-relay tx the `SENDER` frame calls as
  `tx.sender`, so a `SENDER` frame targeting the registry with `addStake(86400)` and value 0.012 ETH
  makes the wallet the staker. Frame limits that worked: execution 150,000, state 300,000. The
  registry showed stake 0.012 ETH, delay 86400, and the explorer showed `isStaked: true`.
- The wallet's validation prefix must itself be admissible when it sends the stake tx, so the
  violating behaviour must be switchable. The probe wallet violates only when the VERIFY frame
  `data` is non-empty.
- Staked, the same violating tx (foreign-storage read) was **admitted and mined by Skandha**, and
  **still rejected by ethrex's raw path** (`StorageReadNonSender`).
- A staked *paymaster* (step 3 variant) still needs its own code to call `addStake`.

**Decision:** `ViolatingWallet` = approver delegatecall plus an optional foreign-storage read
controlled by the VERIFY frame data. Step 7 sends the stake tx from that wallet. No
staking-forwarder function is needed.

## Check 5: concurrent funding (step 1): PASS with retries

> **Superseded.** Step 1 no longer sends from a shared key: the node's faucet serializes the transfers, so there are no nonce collisions to retry. The result below explains why the shared key was dropped.

10 simultaneous transfers from the shared key, each reading the pending nonce:
- no retry: 1 of 10 succeeded;
- up to 6 retries with a fresh nonce read and 150-450 ms jitter: 10 of 10 succeeded, at most 4
  attempts each.

**Decision:** step 1 retries up to 10 times with jitter. For a room of 30 or more, also
pre-fund keys before the session, or run a tiny funding script for the room. Mention both in the
runbook.

**Decision (author, 2026-10-19): option 3, the shortcut.** Step 9 calls
`debug_bundler_setReputation` on the participant's own entity, and the README says openly that this
is cheating (see the design doc). Verified on the devnet with the probe wallet:

- `debug_bundler_setReputation` params: `[[{ address, opsSeen, opsIncluded }], "0x00000000000000000000000000000000000000aa"]`, result `"ok"`.
- `opsSeen` 200, `opsIncluded` 0: explorer status `throttled`, and a new tx was **still admitted**
  (throttling only caps an entity at 4 mempool entries).
- `opsSeen` 10000, `opsIncluded` 0: status `banned`, and the violating tx was **rejected**.
  The rejection text is the generic `unstaked payer accessed 0x… slot 0x0`, with no mention of
  the ban. Step 10 must therefore print the explorer's reputation status next to the error.
- `opsSeen` 0, `opsIncluded` 0 restores the entity (`ok`), and the next tx was admitted.

So step 9 sets `opsSeen: 10000, opsIncluded: 0` (BANNED), and `reset_reputation`
restores `0, 0`. Never call `debug_bundler_clearReputation` or any other `clear*` or `set*` method.
Those affect every user of the devnet.

## Found while building the steps (2026-10-19)

- **`BALANCE`/`SELFBALANCE` are rejected for an unstaked payer** (`payer uses banned opcode: BALANCE`). The example paymaster therefore has no balance check.
- **Wallets verify the owner with `SIGPARAM`, not ECDSA.** Solidity cannot read the tx signature hash. The tx carries a SECP256K1 entry with `signer = owner`; the protocol verifies it; the wallet's VERIFY frame reads the resolved signer (`SIGPARAM`, opcode `0xb4`, through a raw helper) and approves. Verified live.
- **One universal `Approver`** (`60003560006000aa`) reads the approve scope from calldata, so wallets (scope 3), senders (2) and paymasters (1) share it.
- **THROTTLED still admits a tx; only BANNED rejects.** A banned entity's rejection text is the generic "unstaked payer accessed …", so the explorer's reputation status is what tells you the real cause.
- **A rejected tx returns no hash.** The steps compute `keccak256(0x06 || rlp(tx))` locally so `step_11_debug` can look the rejection up.
- **Skandha's built `lib/` was stale** relative to `src/` (the codec still used `tx.nonce`); the codec here is vendored from `src`.
- The explorer history is in memory only and has no per-address reputation lookup (the client walks pages).
