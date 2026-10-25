# Alt-mempool workshop quick-start repo: design

Status: draft for approval. Date: 2026-10-18.

## Intent

Participants are senior developers of smart contract wallets, privacy protocols and similar
projects. They know what frame transactions (EIP-8141) and mempool restrictions are, but not in
depth. After the workshop each of them can:

- choose between the **canonical mempool** (defined by EIP-8141) and the **standard alt-mempool**
  (ERC-8421, implemented by the sidecar fork in `/Users/alexf/skandha`);
- write a validation-frame contract that suits that choice, deploy it, send a transaction with it,
  and debug a rejection;
- do all of this on the public devnet (chain 1337, `https://altmempool.forshtat.com`);
- hand any step to an AI agent, because the repo is written for agentic use.

This folder becomes the repo participants clone, explore and follow.

## Goals, non-goals, anti-goals

Goals
- Each step is one `npm run step_N_*` command that runs alone, prints a short human summary, and
  prints machine-readable JSON with `--json`.
- Every command works without reading anything else first. An agent told "run step 6 and explain"
  can do it.
- The repo teaches the mechanism: what the canonical mempool rejects, what staking and reputation
  change in the standard alt-mempool, and how to see why a tx was rejected.

Non-goals
- No privacy-protocol module and no local-devnet module (both dropped by the author).
- No third mempool tier. Only canonical versus standard alt-mempool.
- No mainnet use, no production key handling. The devnet is a throwaway.
- No `SPEC-STATUS.md`. The migration is explained in the README only.

Anti-goals (the repo fails if this happens, even when the commands run)
- Participants believe the constants and rule IDs in the repo are ERC-8421. They are PR #6.
- Old terms ("canonical" for our mempool, "standard mempool", "alt-mempool" for the base rule set)
  leak into the docs and cause confusion.
- A step needs interactive input, or silently depends on state left by another step without saying so.

## Terminology (use exactly this in all docs)

| Term | Meaning |
|---|---|
| Canonical mempool | The mempool defined by EIP-8141 itself. Strictest rules, no staking, no reputation. |
| Standard alt-mempool | The ERC-8421 rule set that sidecar implements. Admits some txs the canonical mempool rejects, when staking and reputation conditions hold. |
| Staked entity | A paymaster, factory or sender staked in the staking registry. Staking relaxes storage and creation rules. |
| Reputation | Per-entity OK / THROTTLED / BANNED state from `opsSeen` versus `opsIncluded`. |

## Declared shortcut (goes in the README next to the provenance notice)

The README must say plainly that step 9 cheats. Reputation is meant to fall because an entity keeps
producing txs that are admitted and then never included. On the devnet that cannot be reproduced
reliably (low-fee txs still get mined, and a flood races with inclusion), so step 9 writes the
counters directly with the devnet's open `debug_bundler_setReputation` method, on the
participant's own entity only. The notice also says that this method is open only because the
devnet is a demo, and that real nodes restrict it. `step_9` supports `--reset` to restore the entity.

## Spec provenance (goes in the README as a notice, nothing more)

- Everything is under active development. The devnet can reset at any time.
- the sidecar's rules come from `forshtat/ERCs` PR #6 (WIP update to ERC-7562 with EIP-8141 rules),
  commit `74a868c`. ERC-8421 evolved from it and is **not equivalent**. The README says so and
  names the differences known at the time of writing (renamed rule IDs, per-entity
  `MAX_VERIFY_GAS`, no per-entity state gas cap, `SAME_SENDER_MEMPOOL_COUNT` 64 and not applied to
  staked senders, pool identity (sender, `nonce_keys`, `nonce_seq`)).
- Where a step demonstrates behaviour that differs between PR #6 and ERC-8421, the step output says
  which one it shows.

## Steps and commands

Each command exits 0 when the **expected** outcome happened. For a "fail" step the expected outcome
is the rejection, and the output names the rule or error that caused it.

| Command | Participant achieves | Expected outcome |
|---|---|---|
| `step_1_check` | Confirms the devnet, explorer and their own funded key work | Chain id 1337, balance > 0, the sidecar reachable |
| `step_2_tx_first` | Broadcasts a first frame tx (EOA self-relay) | Accepted, mined, receipt shown |
| `step_3_tx_paymaster` | Broadcasts a frame tx with a paymaster | Accepted, mined, paymaster paid |
| `step_4_wallet_deploy` | Deploys their own validation-frame contract | Contract has code at printed address |
| `step_5_tx_wallet` | Sends a tx validated by that contract | Accepted, mined |
| `step_6_tx_violating_canonical` | Fails to broadcast a rule-violating tx to the canonical mempool | Rejected, violated rule printed |
| `step_7_stake` | Stakes the entity in the staking registry | Stake and unstake delay visible on chain |
| `step_8_tx_violating_alt` | Sends the same tx to the standard alt-mempool | Accepted |
| `step_9_reputation_burn` | Gets the entity banned (a declared shortcut, see below) | Explorer shows the entity as BANNED |
| `step_10_tx_violating_alt_banned` | Fails to send the tx because of reputation | Rejected, entity's BANNED status printed next to the error |
| `step_11_debug -- <txHash>` | Debugs any tx from its hash | Admission report, lifecycle events, status |

Command rules
- Config comes from env or `.env`: RPC URLs, chain id, participant key. Defaults point at the
  public devnet. The participant key is generated and stored in `.env` on first run of step 1.
- State written by a step (deployed addresses, tx hashes) goes to one file, `.workshop-state.json`,
  git-ignored. A step that needs earlier state says which step creates it when it is missing.
- Steps are idempotent where possible: re-running step 4 reuses the deployed contract unless
  `--fresh` is passed.
- `--json` prints one JSON object. Errors are JSON too, with `code`, `rule` and `hint` fields.

## Repo layout

```
README.md              provenance notice, glossary, "Which mempool do I need?" decision guide
AGENTS.md              entry point for AI agents: every command, expected output, common failure
package.json           the step_* scripts (npm)
contracts/             Solidity sources and a foundry project (wallet, paymaster, violating variant)
src/steps/             one TypeScript file per step
src/lib/               frame tx build/sign/send, RPC clients, explorer client, state file
docs/steps/            one runbook per step (goal, command, expected output, failure table)
```

## Decided by the author

- npm, scripts prefixed `step_N_name`.
- Public devnet first. Participants fund their own key from the shared devnet key.
- Reputation failure is a module (step 9 and 10). Step 9 is a **declared shortcut**: it sets the entity's counters through `debug_bundler_setReputation` instead of causing real failures.
- The README carries the migration notice. No separate spec-status file.

## My calls (change any of them)

- Scripts use TypeScript and viem, run with `tsx`. The frame tx codec is vendored from
  `skandha/packages/executor/src/services/FrameTxService/codec.ts`, so participants do not need to
  clone or build the sidecar.
- Contracts are built with foundry. Frame opcodes that Solidity lacks (such as `APPROVE`) use
  inline assembly.
- Step 1 funds the participant's key with a plain transfer from the shared key, with retries on
  nonce collisions.
- Steps 6 and 8 use the same transaction, with a contract that reads storage it does not own.
  Only the target mempool differs.

## To verify first (blocking, in this order)

1. **Canonical rejection (step 6).** Does the devnet's ethrex apply EIP-8141's public mempool rules
   to a submitted frame tx? If not, step 6 gets its rejection from a local rules check, and the doc
   says so.
2. **Solidity viability.** Can the example wallet and paymaster be written in Solidity with inline
   assembly for the frame opcodes, and does ethrex's tracer accept them?
3. **Reputation (steps 9 and 10).** Resolved: documented shortcut (see `docs/findings.md`).
4. **Staking (step 7).** The registry keys on `msg.sender`, so a paymaster contract must stake
   itself. The example paymaster has to implement that.
5. **Concurrent funding.** Check that many participants funding at once from the shared key work.

## Left to the builder

File names beyond the layout above, CLI flag details, output formatting, how the decision guide is
worded, runbook wording, and how `step_9` produces its non-included txs once item 3 is known.
