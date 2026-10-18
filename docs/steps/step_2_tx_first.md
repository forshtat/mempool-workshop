# step_2_tx_first

**Goal:** Broadcast your first frame tx.

```sh
npm run step_2_tx_first      # add --json for one JSON object
```

**Needs:** step 1

**What it does:** A self-relay: one `VERIFY` frame (your key approves execution and payment) and one `SENDER` frame transferring 1 gwei. Sent to the standard alt-mempool (Skandha), then waits for ethrex's receipt.

**Expected output** (addresses and hashes differ):

```
frame tx mined: 0x5c7b…199c
block: 150412
frames: 2 (all succeeded)
explorer: https://altmempoolexplorer.forshtat.com/ (search 0x5c7b…199c)
next: npm run step_3_tx_paymaster
```

**If it fails**

| Symptom / code | Cause | Fix |
|---|---|---|
| `RPC_-32500` nonce mismatch | another tx from your key is in flight | wait for it to mine, then retry |
| `TX_NOT_MINED` | devnet stalled | check the explorer |
