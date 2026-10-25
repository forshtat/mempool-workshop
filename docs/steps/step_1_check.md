# step_1_check

**Goal:** Confirm the devnet, explorer and your own funded key work.

```sh
yarn step_1_check      # add --json for one JSON object
```

**Needs:** nothing. It also **resets the workshop**: the addresses and finished steps in `.workshop-state.json` are forgotten (the participant key stays, because the faucet funds each address once an hour), and it records the key's address. Every other step then refuses to run before the steps it needs have finished (`STEP_ORDER`), or if the key is no longer the recorded one (`STATE_KEY_CHANGED`).

**What it does:** Checks `eth_chainId` on the gateway, reads `skandha_config` and the explorer, creates the participant key in `.workshop-state.json` if missing, and asks the Skandha node's faucet (`skandha_explorer_faucet`, 1 ETH) to fund the key when it holds less than `minBalanceEth` (0.1 ETH). There is no funded key in this repo.

**Expected output** (addresses and hashes differ):

```
chain 1337: gateway reachable
participant: 0x588008bcF802e61cB98148701387f50A5Bc38e57
balance: 1 ETH (just funded)
explorer: available
```

**If it fails**

| Symptom / code | Cause | Fix |
|---|---|---|
| RPC_UNREACHABLE | network or devnet down | retry later; check the URLs in `workshop.config.json5` |
| WRONG_CHAIN | the devnet was replaced | update `chainId` and the URLs in `workshop.config.json5` |
| FUNDING_FAILED | the faucet refused: this address already asked within the hour, the faucet is empty or rate limited, or the node has no faucet | read the message; ask the host, or fund the address from the **Faucet** button in the explorer |
| `explorer: unavailable` | node started without `--explorer.enable` | steps still work; steps 10 and 11 print less |
