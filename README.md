# Alt-mempool workshop: EIP-8141 frame transactions and the standard alt-mempool

A hands-on quick start. In eleven one-line commands you send frame transactions to a public devnet,
watch the **canonical mempool** reject a transaction that the **standard alt-mempool** accepts once
the sender is staked, and debug a rejection.

> [!WARNING]
> **Work in progress.** Everything here is under active development, and the devnet can be reset at any time.
>
> Skandha ([source: mempool-workshop-sidecar](https://github.com/forshtat/mempool-workshop-sidecar)) is the standard alt-mempool node this repo talks to. Its rules come from
> [forshtat/ERCs PR #6](https://github.com/forshtat/ERCs/pull/6), "Update ERC-7562: Add EIP-8141 specific rules",
> pinned to commit `74a868c`. That work later evolved into [ERC-8421](https://ethereum-magicians.org/t/erc-8421-frame-transaction-alternative-mempools/29800)
> ([ethereum/ERCs PR #2028](https://github.com/ethereum/ERCs/pull/2028)), and **the two are not equivalent**. The migration is ongoing. Differences known at the time of writing:
> rule IDs were renamed (for example `GREP-*` became `REPUTATION-*`); `MAX_VERIFY_GAS` became a per-entity `MAX_VERIFY_GAS_PER_ENTITY`;
> the per-entity state-gas cap was dropped; `SAME_SENDER_MEMPOOL_COUNT` is 64 and no longer applies to staked senders;
> and a pending tx is identified by (sender, `nonce_keys`, `nonce_seq`). When this repo shows a rule, it shows the PR #6 behaviour.

> [!CAUTION]
> **Step 9 cheats.** Reputation should fall because an entity keeps producing txs that are admitted but never
> included. That cannot be reproduced reliably on this devnet, so `step_9_reputation_burn` writes the reputation counters
> directly, using the devnet's open `debug_bundler_setReputation` method, for your own wallet only. Real nodes restrict that method.
> Everything else in the repo exercises the real mechanism.

## Terms used in this repo

| Term | Meaning |
|---|---|
| **Canonical mempool** | The public mempool defined by EIP-8141 itself. Strictest rules. No staking, no reputation. On the devnet this is ethrex's own validation. |
| **Standard alt-mempool** | The ERC-8421-style rule set that Skandha implements. It admits some txs the canonical mempool rejects, when staking and reputation conditions hold. |
| **Staked entity** | A sender, paymaster or factory that has staked in the staking registry. Staking relaxes storage rules. |
| **Reputation** | Per-entity `OK` / `THROTTLED` / `BANNED` state, from how many of an entity's txs were seen versus included. A banned entity is excluded from the mempool. |

Not sure which mempool your contract needs? Read the [decision guide](docs/decision-guide.md).

## Quick start

Needs Node 20.12 or newer and npm. Foundry is optional (only to change the contracts).

```sh
git clone https://github.com/forshtat/mempool-workshop.git && cd mempool-workshop
npm install
npm run step_1_check
```

`step_1_check` creates a throwaway key in `.workshop-state.json` (devnet only; never reuse it on a real network) and funds it from the devnet's faucet (1 ETH; also available as the **Faucet** button in the explorer). Devnet: chain `1337`,
ethrex at `https://altmempool.forshtat.com`, Skandha (the mempool) at `https://altmempool.forshtat.com/rpc`,
explorer at <https://altmempoolexplorer.forshtat.com/>. All configuration is in `workshop.config.json5` (read-only for the code; every key is required). There are no environment variables.

The mempool node is Skandha, a fork that speaks EIP-8141. Its source, the full RPC reference (`deploy/devnet/devnet-readme.md`), the P2P guide and the devnet explorer API docs live in the sidecar repo: <https://github.com/forshtat/mempool-workshop-sidecar>.

## The steps

Every step is one command. Each prints a short summary, accepts `--json` for one machine-readable object, and exits 0 when the **expected**
outcome happened (for the "fail" steps, that means the rejection). Details and expected output are in [`docs/steps/`](docs/steps/).

| Command | You achieve |
|---|---|
| `npm run step_1_check` | Confirm the devnet and explorer work, and fund your key |
| `npm run step_2_tx_first` | Broadcast your first frame tx |
| `npm run step_3_tx_paymaster` | Broadcast a frame tx paid for by a paymaster |
| `npm run step_4_wallet_deploy` | Deploy your own validation-frame wallet contract |
| `npm run step_5_tx_wallet` | Send a tx validated by your wallet |
| `npm run step_6_tx_violating_canonical` | **Fail** to broadcast a rule-violating tx to the canonical mempool |
| `npm run step_7_stake` | Stake the wallet |
| `npm run step_8_tx_violating_alt` | Send **the same tx** to the standard alt-mempool: accepted |
| `npm run step_9_reputation_burn` | Get the entity banned (**a declared shortcut**, see above) |
| `npm run step_10_tx_violating_alt_banned` | **Fail** to send the tx because of low reputation |
| `npm run step_11_debug -- <txHash>` | Debug any tx: admission report, lifecycle, status |

Run them in order the first time. State (deployed addresses, last tx hash) lives in `.workshop-state.json`. If the devnet was reset, the recorded
addresses are gone: re-run the deploy steps with `--fresh`.

## Working with an AI agent

Point your agent at [`AGENTS.md`](AGENTS.md). Every step can be run alone, `--json` output is a single object, and error codes are listed with fixes.

## Layout

```
contracts/src        Solidity: SponsorPaymaster, ExampleWallet, ViolatingWallet (+ tests in contracts/test)
contracts/artifacts  compiled output, committed (steps run without foundry); rebuild with `npm run build:contracts`
src/steps            one file per step
src/lib              frame tx codec and builders, RPC, explorer, state
docs/steps           runbook per step
docs/findings.md     what was verified on the devnet, and why the contracts look the way they do
```

Contract tests: `forge install foundry-rs/forge-std --no-git --root contracts` once, then `npm run test:contracts`. TypeScript tests: `npm test`.
