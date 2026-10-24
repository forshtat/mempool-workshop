# step_1_check

**Goal:** Confirm the devnet, explorer and your own funded key work.

```sh
npm run step_1_check      # add --json for one JSON object
```

**Needs:** nothing

**What it does:** Checks `eth_chainId` on ethrex and Skandha, reads `skandha_config` and the explorer, creates `PARTICIPANT_KEY` in `.env` if missing, and asks the Skandha node's faucet (`skandha_explorer_faucet`, 1 ETH) to fund the key when it holds less than 0.1 ETH. There is no funded key in this repo.

**Expected output** (addresses and hashes differ):

```
chain 1337: ethrex and Skandha reachable
participant: 0x588008bcF802e61cB98148701387f50A5Bc38e57
balance: 1 ETH (just funded)
explorer: available
```

**If it fails**

| Symptom / code | Cause | Fix |
|---|---|---|
| RPC_UNREACHABLE | network or devnet down | retry later; check URLs in `.env` |
| WRONG_CHAIN | the devnet was replaced | update `CHAIN_ID` and the URLs |
| FUNDING_FAILED | the faucet refused: this address already asked within the hour, the faucet is empty or rate limited, or the node has no faucet | read the message; ask the host, or fund the address from the **Faucet** button in the explorer |
| `explorer: unavailable` | node started without `--explorer.enable` | steps still work; steps 10 and 11 print less |
