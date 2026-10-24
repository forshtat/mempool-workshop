# AGENTS.md: running this workshop repo with an AI agent

You are helping a developer work through an EIP-8141 / standard alt-mempool workshop on a **public throwaway devnet** (chain 1337).
Read the work-in-progress notice in [README.md](README.md) first: Skandha's rules come from `forshtat/ERCs` PR #6, not exactly ERC-8421.

The mempool node itself (Skandha fork) is in <https://github.com/forshtat/mempool-workshop-sidecar>; its `deploy/devnet/devnet-readme.md` is the RPC reference and `docs/skandha_explorer.md` documents the explorer API.

## Terminology (use exactly this)

- **canonical mempool**: EIP-8141's own public mempool (ethrex's validation on the devnet).
- **standard alt-mempool**: the ERC-8421-style rule set Skandha implements.
- **staked entity**, **reputation** (`OK` / `THROTTLED` / `BANNED`).
Do not call the standard alt-mempool "canonical", and do not say "standard mempool" for the base rule set.

## Commands

All are `npm run <name>`. Pass `--json` for exactly one JSON object on stdout (logs go to stderr). Exit 0 means the **expected** outcome happened;
for the "fail" steps (6, 10) that is the rejection.

| Command | Needs state from | Expected result |
|---|---|---|
| `step_1_check` | nothing | chain 1337, participant key in `.env`, balance > 0.1 ETH (funded by the faucet) |
| `step_2_tx_first` | step 1 | tx mined, `frames: 2` |
| `step_3_tx_paymaster` | step 1 | tx mined, paymaster balance dropped, sender balance 0 |
| `step_4_wallet_deploy` | step 1 | `wallet` address in state |
| `step_5_tx_wallet` | step 4 | tx mined, wallet paid |
| `step_6_tx_violating_canonical` | step 1 | ethrex rejected with `StorageReadNonSender` (exit 0) |
| `step_7_stake` | step 6 | registry shows stake 0.012 ETH |
| `step_8_tx_violating_alt` | step 7 | tx accepted and mined |
| `step_9_reputation_burn` | step 6 | explorer shows `BANNED` (**declared shortcut**; `-- --reset` undoes it) |
| `step_10_tx_violating_alt_banned` | step 9 | rejected, explorer shows `BANNED` (exit 0) |
| `step_11_debug -- <txHash>` | none (defaults to the last tx) | admission report, lifecycle, status |

Flags: `--json`, `--fresh` (redeploy contracts the step owns). State is in `.workshop-state.json`; config in `.env` (see `.env.example`). Per-step runbooks: `docs/steps/`.

## Error codes (`--json` failure: `{ok:false, code, rule, hint, message}`)

| code | cause | fix |
|---|---|---|
| `RPC_UNREACHABLE` | network, or the devnet is down | retry; check `ETHREX_URL` / `SKANDHA_URL` |
| `RPC_-32601` | wrong endpoint (ethrex root vs Skandha `/rpc`) | use the other URL |
| `RPC_-32502` | the mempool rules rejected the tx | read `rule` and `message`; run `step_11_debug -- <txHash>` |
| `RPC_-32500` | nonce mismatch or an invalid tx | contract wallets start at nonce 1; re-read the nonce |
| `WRONG_CHAIN` | devnet was replaced | check `CHAIN_ID` and the URLs |
| `STATE_MISSING` | a step's prerequisite did not run | run the step named in `hint` |
| `STATE_STALE` | recorded contract has no code (devnet reset) | re-run that step with `--fresh` |
| `DEPLOY_FAILED` | deploy reverted | needs ~6M gas and enough balance for `value`; run `step_1_check` to top up |
| `TX_NOT_MINED` | not mined within 120 s | devnet may be stalled; check the explorer |
| `TX_REVERTED` | mined, but a frame failed | `step_11_debug -- <txHash>` |
| `TX_UNKNOWN` | no node knows the hash | the explorer history is in memory only; check the hash |
| `FUNDING_FAILED` | the faucet refused (once per address per hour, empty, rate limited, or absent) | read `message`; use the explorer's **Faucet** button for another address or ask the host |

## Rules for agents

- Never call `debug_bundler_clear*` or any other `debug_*` method that changes the node, except through `step_9_reputation_burn` on the participant's own wallet. They affect everyone on the devnet.
- There is no shared funded key in this repo: funding goes through the node's faucet (`skandha_explorer_faucet`). Never ask for, search for or use the devnet's genesis key.
- Do not vendor or import from `skandha/packages/*/lib`: the built output can be stale. The codec in `src/lib/frameTx` is vendored from skandha `src`.
- When a tx is rejected, do not guess: run `npm run step_11_debug -- <txHash>` for the rule-by-rule admission report.

## Facts that explain failures

- Fund contracts only through their creation `value`; a plain transfer runs validation code outside a frame and fails.
- A contract's nonce starts at 1. An unstaked payer cannot use `BALANCE`; environment opcodes are banned for everyone.
- A throttled entity is still admitted (it is capped at 4 mempool entries); a **banned** entity is rejected, with a generic "unstaked payer accessed …" error. Check the explorer to tell the difference.
- A transfer to a brand-new account needs a non-zero `state` gas limit.
- `docs/findings.md` records what was verified on the devnet and why.
