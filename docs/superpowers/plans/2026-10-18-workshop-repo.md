# Alt-mempool Workshop Repo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the quick-start repo in which each workshop step is one `npm run step_N_*` command against the public EIP-8141 devnet.

**Architecture:** A TypeScript/viem script per step on top of a small shared lib (config, state file, RPC, frame tx codec, output). Solidity examples live in a foundry project. Task 0 resolves the open feasibility questions first, and its findings can change later tasks.

**Tech Stack:** Node 20+, npm, TypeScript, `tsx`, viem, vitest, foundry (forge).

**Spec:** `docs/superpowers/specs/2026-10-18-workshop-repo-design.md`

## Global Constraints

- Package manager is npm. Every command is `npm run step_<N>_<name>`, exactly as named in the spec's table.
- Terminology is exactly: "canonical mempool" (EIP-8141's own), "standard alt-mempool" (ours), "staked entity", "reputation". Never use "standard mempool" or "alt-mempool" for the base rule set.
- Devnet defaults: chain id `1337`, ethrex `https://altmempool.forshtat.com`, the sidecar `https://altmempool.forshtat.com/rpc`. Shared funder key from `/Users/alexf/skandha/deploy/devnet/devnet-readme.md`.
- A step exits 0 when the **expected** outcome happened (for "fail" steps, the rejection). `--json` prints exactly one JSON object on stdout and nothing else; logs go to stderr. Errors are JSON with `code`, `rule`, `hint`.
- State between steps lives only in `.workshop-state.json` (git-ignored). Config only in env / `.env`.
- Spec provenance: the sidecar's rules come from `forshtat/ERCs` PR #6, commit `74a868c`; ERC-8421 is not equivalent. README states this. No `SPEC-STATUS.md`.
- Vendor the frame tx codec from `skandha/packages/*/src`, never `lib` (the built `lib` is stale).
- Contract deployments use gas 6,000,000. Fund a contract only through its creation `value`, never a plain transfer.
- foundry: `solc 0.8.28`, `via_ir = true`, `evm_version = "cancun"`. Wallets never contain frame opcodes; they `delegatecall` the `Approver` (runtime `0x600360006000aa`).
- Step 9 is a declared shortcut and must say so in its own output. It touches only the participant's own entity and never calls a `clear*` method.
- No interactive prompts. The repo is not required to build the sidecar; the frame tx codec is vendored from `/Users/alexf/skandha/packages/executor/src/services/FrameTxService/codec.ts`.
- `/Users/alexf/mumbaiworkshop` is not a git repo yet; Task 1 runs `git init`.

## Review Focus

- Re-running a step with existing state (step 4 twice): reuse the contract, no duplicate deploy.
- Devnet reset: addresses in `.workshop-state.json` have no code on chain. The step detects this and says to run with `--fresh`.
- A step needing earlier state when it is missing: the error names the step that creates it.
- Shared-key nonce collision while funding in step 1: retry, then fail with a clear hint.
- `--json` output purity: no stray log line on stdout, valid JSON on both success and failure.
- RPC unreachable or returning `-32601`: a JSON error with a hint, not a stack trace.

---

### Task 0: Feasibility checks: DONE

Results and decisions are in `docs/findings.md`. Decisions that later tasks rely on:
canonical path = ethrex `eth_sendRawTransaction` (Check 1); Solidity wallet that `delegatecall`s a raw
approver, deploy gas 6M (Check 2); reputation step is a declared shortcut (Check 3); a wallet stakes itself
with a `SENDER` frame, no staking code (Check 4); funding retries up to 10 times with jitter (Check 5).

### Task 1: Scaffold, shared lib and `step_1_check`

**Files:**
- Create: `package.json`, `tsconfig.json`, `.gitignore`, `.env.example`
- Create: `src/lib/config.ts`, `src/lib/state.ts`, `src/lib/output.ts`, `src/lib/rpc.ts`
- Create: `src/steps/step_1_check.ts`
- Test: `test/lib/state.test.ts`, `test/lib/output.test.ts`

**Interfaces:**
- Produces:
  - `loadConfig(): Config` with `{ chainId: number; ethrexUrl: string; skandhaUrl: string; funderKey: Hex; participantKey: Hex | undefined }`
  - `ensureParticipantKey(): Hex` (generates and appends to `.env` on first call)
  - `readState(): WorkshopState` / `writeState(patch: Partial<WorkshopState>): void`; `WorkshopState` holds `{ wallet?: Address; paymaster?: Address; lastTxHash?: Hex; ... }`
  - `requireState<K extends keyof WorkshopState>(key: K, createdBy: string): NonNullable<WorkshopState[K]>` throws `StepError` naming the creating step
  - `class StepError extends Error { code: string; rule?: string; hint?: string }`
  - `runStep(name: string, fn: (ctx: { json: boolean; fresh: boolean }) => Promise<Result>): Promise<never>` handles flags, prints human or JSON output, sets the exit code
  - `rpc(url: string, method: string, params: unknown[]): Promise<unknown>` throws `StepError` with `code: "RPC_UNREACHABLE"` or the JSON-RPC error code

- [ ] **Step 1: `git init`, write `package.json`** with scripts `step_1_check` … `step_11_debug` (each `tsx src/steps/<name>.ts`), plus `test` (vitest). Add `.gitignore` for `.env`, `.workshop-state.json`, `node_modules`, `scratch/`.
- [ ] **Step 2: Write failing tests.** `state.test.ts`: `requireState("wallet","step_4_wallet_deploy")` on empty state throws a `StepError` whose `hint` contains `step_4_wallet_deploy`. `output.test.ts`: `formatJson` of a failure result has keys `code`, `rule`, `hint` and nothing is written to stdout except one JSON line.
- [ ] **Step 3: Run** `npm test`. Expected: FAIL (modules missing).
- [ ] **Step 4: Implement** the lib per Interfaces. State file path is `process.env.WORKSHOP_STATE ?? ".workshop-state.json"`.
- [ ] **Step 5: Run** `npm test`. Expected: PASS.
- [ ] **Step 6: Implement `step_1_check`.** Checks `eth_chainId` equals 1337 on both endpoints, the sidecar answers `skandha_config`, the explorer answers `skandha_explorer_info` (report absence as a warning), then funds the participant key with 0.05 ETH from the funder key if its balance is below 0.02, retrying up to 10 times with a fresh pending-nonce read and 150-450 ms jitter (Check 5: 1 of 10 succeed without retries). Output includes the participant address and balance.
- [ ] **Step 7: Verify.** Run `npm run step_1_check` and `npm run step_1_check -- --json | jq .`. Expected: exit 0, valid JSON, balance > 0.
- [ ] **Step 8: Commit** `feat: scaffold repo, shared lib, step_1_check`.

### Task 2: Frame tx lib and `step_2_tx_first`

**Files:**
- Create: `src/lib/frameTx/codec.ts` (vendored), `src/lib/frameTx/types.ts`, `src/lib/frameTx/build.ts`, `src/lib/frameTx/send.ts`
- Create: `src/steps/step_2_tx_first.ts`
- Test: `test/lib/frameTx.test.ts`

**Interfaces:**
- Consumes: `rpc`, `loadConfig`, `writeState` from Task 1.
- Produces:
  - `buildSelfRelayTx(args: { from: Address; to: Address; value: bigint; nonce: bigint; chainId: number; maxFeePerGas: bigint }): FrameTransaction` (one VERIFY frame, `APPROVE_SCOPE.EXECUTION_AND_PAYMENT`, then one SENDER frame)
  - `signFrameTx(tx: FrameTransaction, key: Hex): FrameTransaction`
  - `toWire(tx: FrameTransaction): WireFrameTx`
  - `sendFrameTx(tx: WireFrameTx, target: "skandha" | "ethrex"): Promise<Hex>`
  - `waitForReceipt(hash: Hex, timeoutMs?: number): Promise<FrameReceipt>`
  - `txHash(tx: FrameTransaction): Hex` = `keccak256(encodeRawFrameTx(tx))`

- [ ] **Step 1: Write failing test.** `frameTx.test.ts`: for the fixed key `0x…01` and fixed fields, `signFrameTx` output verifies against `computeSigHash`, and `toWire` renders every bigint as a `0x` hex string.
- [ ] **Step 2: Run** `npm test`. Expected: FAIL.
- [ ] **Step 3: Vendor** the codec and enums from the paths in Global Constraints and `packages/types/src/contracts/FrameTx.ts`; implement the rest of the Interfaces. Mirror `buildUnsignedFrameTx`/`signFrameTx`/`toWire` from `/Users/alexf/skandha/test/e2e/frameTx.e2e.test.ts`.
- [ ] **Step 4: Run** `npm test`. Expected: PASS.
- [ ] **Step 5: Implement `step_2_tx_first`.** Self-relay transfer of 1 gwei to a fixed recipient from the participant key via the sidecar; waits for the receipt; writes `lastTxHash` to state. Output: tx hash, block, status, explorer link.
- [ ] **Step 6: Verify.** `npm run step_2_tx_first -- --json`. Expected: exit 0, receipt status success.
- [ ] **Step 7: Commit** `feat: frame tx lib and step_2_tx_first`.

### Task 3: Contracts project and `step_3_tx_paymaster`

Uses the Check 2 design: Solidity contracts that `delegatecall` an `Approver`.

**Files:**
- Create: `contracts/foundry.toml` (settings in Global Constraints), `contracts/src/SponsorPaymaster.sol`, `contracts/test/SponsorPaymaster.t.sol`
- Create: `src/lib/contracts.ts`, `src/steps/step_3_tx_paymaster.ts`
- Modify: `src/lib/frameTx/build.ts` (add `buildPaymasterTx`)

**Interfaces:**
- Produces:
  - `loadArtifact(name: "SponsorPaymaster" | "ExampleWallet" | "ViolatingWallet"): { abi: Abi; bytecode: Hex }` reading forge output from `contracts/out`
  - `deployApprover(): Promise<Address>` (raw runtime `0x600360006000aa`, reused through state key `approver`)
  - `deployContract(artifactName, args?, value?): Promise<Address>` (legacy tx through the ethrex root endpoint, gas 6,000,000, `value` is how a contract is funded)
  - `buildPaymasterTx(args: { from: Address; paymaster: Address; to: Address; value: bigint; nonce: bigint; chainId: number; maxFeePerGas: bigint }): FrameTransaction` (`[only_verify, pay]` prefix, then SENDER frame)

- [ ] **Step 1: Write the forge test** `SponsorPaymaster.t.sol`: `test_approvesPaymentWhenFunded` and `test_revertsWhenNotFunded`.
- [ ] **Step 2: Run** `forge test --root contracts`. Expected: FAIL.
- [ ] **Step 3: Implement `SponsorPaymaster(address approver)`**: its validation fallback `delegatecall`s the approver with payment scope. It is funded through its creation `value`. A paymaster that must be staked needs its own `addStake` forwarding function.
- [ ] **Step 4: Run** `forge test --root contracts`. Expected: PASS.
- [ ] **Step 5: Implement the step.** Deploy (or reuse via state `paymaster`) the paymaster, fund it, send a sponsored tx from a participant account holding zero balance; assert the paymaster balance dropped. Save `paymaster` to state.
- [ ] **Step 6: Verify** `npm run step_3_tx_paymaster -- --json`. Expected: exit 0.
- [ ] **Step 7: Commit** `feat: SponsorPaymaster and step_3_tx_paymaster`.

### Task 4: Own wallet, `step_4_wallet_deploy`, `step_5_tx_wallet`

**Files:**
- Create: `contracts/src/ExampleWallet.sol`, `contracts/test/ExampleWallet.t.sol`
- Create: `src/steps/step_4_wallet_deploy.ts`, `src/steps/step_5_tx_wallet.ts`
- Modify: `src/lib/frameTx/build.ts` (add `buildWalletTx`)

**Interfaces:**
- Consumes: `deployContract`, `requireState`, Task 2 lib.
- Produces: `buildWalletTx(args: { wallet: Address; to: Address; value: bigint; nonce: bigint; chainId: number; maxFeePerGas: bigint }): FrameTransaction` (`[self_verify]`, owner-signature check inside the wallet); state key `wallet`.

- [ ] **Step 1: Forge tests** `test_acceptsOwnerSignature`, `test_rejectsOtherSigner`.
- [ ] **Step 2: Run** `forge test --root contracts`. Expected: FAIL.
- [ ] **Step 3: Implement `ExampleWallet(address owner, address approver)`**: its validation fallback checks the owner's signature, then `delegatecall`s the approver (scope 3, `EXECUTION_AND_PAYMENT`). Created with 0.01 ETH of `value`; its first tx uses `nonceSeq` 1.
- [ ] **Step 4: Run** forge tests. Expected: PASS.
- [ ] **Step 5: Implement step 4.** Deploys the wallet with the participant as owner, funds it with 0.01 ETH, saves `wallet`. Re-run reuses the wallet if it has code; `--fresh` redeploys; a stored address with no code triggers the devnet-reset hint (Review Focus).
- [ ] **Step 6: Implement step 5.** Sends a transfer validated by the wallet; prints receipt.
- [ ] **Step 7: Verify** both with `--json`, then re-run step 4 and confirm the address is unchanged.
- [ ] **Step 8: Commit** `feat: ExampleWallet, steps 4 and 5`.

### Task 5: `step_6_tx_violating_canonical`

The canonical rejection comes from ethrex `eth_sendRawTransaction` (Check 1). The step also sends the same tx to the sidecar so participants see both messages.

**Files:**
- Create: `contracts/src/ViolatingWallet.sol`, `contracts/test/ViolatingWallet.t.sol`
- Create: `src/steps/step_6_tx_violating_canonical.ts`
- Modify: `src/lib/frameTx/send.ts` (add `explainRejection(err): { rule: string; message: string }`)

**Interfaces:**
- Produces: `ViolatingWallet(address approver, address foreign)`: its validation fallback reads `foreign` storage via `staticcall` only when the VERIFY frame `data` is non-empty (a storage-rule violation that staking relaxes), then `delegatecall`s the approver. Empty `data` is the clean path used for the stake tx; state key `violating`; `explainRejection` maps a node error to a rule ID from PR #6 (for example `STO-0xx`) and a hint.
- Test: `test/lib/explainRejection.test.ts`

- [ ] **Step 1: Failing test** `explainRejection.test.ts`: a recorded sidecar error for a storage violation yields `rule` starting `STO-`; an unknown error yields `rule: "UNKNOWN"` and keeps the raw message.
- [ ] **Step 2: Run** `npm test`. Expected: FAIL.
- [ ] **Step 3: Implement `ViolatingWallet` and `explainRejection`.**
- [ ] **Step 4: Run** `npm test` and `forge test --root contracts`. Expected: PASS.
- [ ] **Step 5: Implement the step.** Deploy or reuse `violating` (funded 0.05 ETH at creation), send the violating tx (VERIFY `data` = `0x01`, execution limit 70,000) to ethrex via `eth_sendRawTransaction` and to the sidecar. Expect rejection from both, print the rule and both messages. Exit 0 only on rejection (exit 1 if ethrex accepts it, with a hint). Expected: `StorageReadNonSender` from ethrex.
- [ ] **Step 6: Verify** `npm run step_6_tx_violating_canonical -- --json`. Expected: exit 0, `rule` populated.
- [ ] **Step 7: Commit** `feat: ViolatingWallet and step_6`.

### Task 6: `step_7_stake` and `step_8_tx_violating_alt`

**Files:**
- Create: `src/steps/step_7_stake.ts`, `src/steps/step_8_tx_violating_alt.ts`
- Modify: `src/lib/contracts.ts` (add registry address and ABI, and `getStake(address): Promise<{ amount: bigint; unstakeDelay: number }>` via `getDepositInfo`)
- Modify: `src/lib/frameTx/build.ts` (add `buildStakeTx`)

**Interfaces:**
- Consumes: `violating` state, `sendFrameTx`, `explainRejection`.
- Produces: `buildStakeTx(args: { wallet: Address; amount: bigint; unstakeDelaySec: number; nonce: bigint; chainId: number; maxFeePerGas: bigint }): FrameTransaction`: VERIFY with empty `data`, then a `SENDER` frame targeting the registry (`0xd51c04d7a0b01124e84de152f4e56d9eecb22d2f`) with calldata `addStake(86400)`, value 0.012 ETH, limits execution 150,000 and state 300,000. The wallet stakes itself, so `ViolatingWallet` needs no staking code.
- Test: `test/lib/stake.test.ts`

- [ ] **Step 1: Failing test.** `buildStakeTx` produces a SENDER frame whose target is the registry, whose data starts with the `addStake(uint32)` selector, and whose VERIFY frame data is `0x`.
- [ ] **Step 2: Run.** Expected: FAIL. **Step 3: Implement. Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Implement step 7.** Sends the stake tx to the sidecar, waits for the receipt, then verifies `getStake`. Idempotent: already staked prints the stake and exits 0. Output includes the explorer's `isStaked`.
- [ ] **Step 6: Implement step 8.** Sends the same violating tx as step 6 (reuse its builder) to the sidecar; expects acceptance and a mined receipt; exits 1 with the hint "run step_7_stake" when rejected with `unstaked payer accessed`.
- [ ] **Step 7: Verify** steps 7 and 8 with `--json`. Expected: exit 0 each, and step 6 still rejected by ethrex afterwards.
- [ ] **Step 8: Commit** `feat: steps 7 and 8`.

### Task 7: `step_9_reputation_burn` and `step_10_tx_violating_alt_banned`

Step 9 is a declared shortcut (see `docs/findings.md`, Check 3).

**Files:**
- Create: `src/steps/step_9_reputation_burn.ts`, `src/steps/step_10_tx_violating_alt_banned.ts`
- Create: `src/lib/explorer.ts` with `getReputation(address): Promise<{ status: "OK" | "THROTTLED" | "BANNED"; opsSeen: number; opsIncluded: number; isStaked: boolean }>`
- Modify: `src/lib/rpc.ts` (add `setReputation(address, opsSeen, opsIncluded)`)
- Test: `test/lib/explorer.test.ts`

**Interfaces:**
- Produces: `getReputation` via `skandha_explorer_listReputation`; `setReputation` calls `debug_bundler_setReputation` with params `[[{ address, opsSeen, opsIncluded }], "0x00000000000000000000000000000000000000aa"]`.

- [ ] **Step 1: Failing test** `explorer.test.ts`: `getReputation` maps a recorded explorer item (`status: "banned"`, `opsSeen: 10000`) to `{ status: "BANNED", ... }`, and returns `status: "OK"` with zero counters for an unknown address.
- [ ] **Step 2: Run.** Expected: FAIL. **Step 3: Implement. Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Implement step 9.** Prints a leading line to stderr and a `shortcut: true` field in JSON saying this writes the counters directly instead of causing real failures. Calls `setReputation(violatingAddress, 10000, 0)`, then polls `getReputation` until BANNED (10 s timeout). `--reset` calls `setReputation(address, 0, 0)` and checks for OK. Refuses to touch any address other than `state.violating`.
- [ ] **Step 6: Implement step 10.** Sends the step 8 tx again, expects rejection, and prints the entity's `getReputation` status next to the error (the error text is only the generic `unstaked payer accessed …`). Exit 1 if accepted, with the hint "run step_9_reputation_burn".
- [ ] **Step 7: Verify** step 9, then step 10, then step 9 `--reset`, then step 8 again. Expected: banned and rejected, then restored and accepted.
- [ ] **Step 8: Commit** `feat: steps 9 and 10`.

### Task 8: `step_11_debug`

**Files:**
- Create: `src/steps/step_11_debug.ts`
- Modify: `src/lib/explorer.ts` (add `getAdmission(txHash)`, `getLifecycle(txHash)`)
- Test: `test/lib/explorer.test.ts`

**Interfaces:**
- Produces: `getAdmission(hash: Hex): Promise<AdmissionRecord | null>`, `getLifecycle(hash: Hex): Promise<LifecycleEvent[]>`. Types mirror `/Users/alexf/skandha/packages/types/src/explorer/index.ts`.

- [ ] **Step 1: Failing test** for `getAdmission` on a recorded rejected-tx response, asserting the failing rule is surfaced; and for `null` on unknown hash.
- [ ] **Step 2: Run.** Expected: FAIL. **Step 3: Implement. Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Implement the step.** Takes `<txHash>` (defaults to `lastTxHash` from state), prints admission checks (pass/fail per rule), lifecycle events and `skandha_frameTransactionStatus`.
- [ ] **Step 6: Verify** against a step 6 tx and a step 2 tx. **Step 7: Commit** `feat: step_11_debug`.

### Task 9: README, AGENTS.md, runbooks, decision guide

**Files:**
- Create: `README.md`, `AGENTS.md`, `docs/steps/step_1_check.md` … `step_11_debug.md`, `docs/decision-guide.md`

**Interfaces:**
- Consumes: real command output captured from Tasks 1–8.

- [ ] **Step 1: README.** Top: the WIP and provenance notice from the spec (PR #6 at `74a868c`, 8421 not equivalent, known differences), then the "We cheat in step 9" notice from the design's *Declared shortcut* section, in plain words. Then the glossary table, a quick start (`npm install`, `npm run step_1_check`), and the step table.
- [ ] **Step 2: Decision guide** `docs/decision-guide.md`: "Which mempool do I need?" with the questions: does validation read foreign storage, use banned opcodes, exceed the verify gas cap; can the entity stake; can it carry reputation risk.
- [ ] **Step 3: AGENTS.md and one runbook per step.** Each runbook has: goal, command, real expected output, failure table (error code, cause, fix).
- [ ] **Step 4: Verify** by running all 11 commands from a clean clone in a temp directory with a fresh `.env`. Expected: every step exits 0.
- [ ] **Step 5: Grep** the docs for the retired terms: `grep -rniE "standard mempool|canonical.*(skandha|ours)" README.md AGENTS.md docs`. Expected: no hits.
- [ ] **Step 6: Commit** `docs: README, AGENTS.md, runbooks, decision guide`.
