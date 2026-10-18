# step_1_check

**Goal:** Confirm the devnet, explorer and your own funded key work.

```sh
npm run step_1_check      # add --json for one JSON object
```

**Needs:** nothing

**What it does:** Checks `eth_chainId` on ethrex and Skandha, reads `skandha_config` and the explorer, creates `PARTICIPANT_KEY` in `.env` if missing, and tops the key up to 0.2 ETH from the shared devnet key when it holds less than 0.1 ETH (retrying on nonce collisions).

**Expected output** (addresses and hashes differ):

```
chain 1337: ethrex and Skandha reachable
participant: 0x588008bcF802e61cB98148701387f50A5Bc38e57
balance: 0.219935877324 ETH (just funded)
explorer: available
```

**If it fails**

| Symptom / code | Cause | Fix |
|---|---|---|
| RPC_UNREACHABLE | network or devnet down | retry later; check URLs in `.env` |
| WRONG_CHAIN | the devnet was replaced | update `CHAIN_ID` and the URLs |
| FUNDING_FAILED | many participants funding at once | re-run; the step retries up to 10 times with jitter |
| `explorer: unavailable` | node started without `--explorer.enable` | steps still work; steps 10 and 11 print less |
