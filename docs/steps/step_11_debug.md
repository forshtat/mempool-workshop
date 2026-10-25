# step_11_debug

**Goal:** Debug any tx from its hash.

```sh
yarn step_11_debug <txHash>      # add --json for one JSON object
```

**Needs:** none (a hash)

**What it does:** Collects, for the hash: Skandha's rule-by-rule admission report, the lifecycle events, `skandha_frameTransactionStatus`, and ethrex's receipt. Defaults to the last tx hash in state; steps 6, 8 and 10 print the hash of the tx they sent.

**Expected output** (addresses and hashes differ):

```
tx 0x8466…9127
admission (rpc): REJECTED (error -32502)
  FAIL storage [payer] frame 0: unstaked payer accessed 0x902d…bd11 slot 0x00…00
  (15 checks passed, 1 skipped)
lifecycle: rejected (unstaked payer accessed …)
```
An accepted tx adds `lifecycle: … -> admitted -> statusChanged -> included`, `mempool status: OnChain` and `mined: block …, frames: ok, ok`.

**If it fails**

| Symptom / code | Cause | Fix |
|---|---|---|
| `TX_UNKNOWN` | the explorer history is in memory and cleared on restart; ethrex knows only mined txs | check the hash; re-send the tx |
| `BAD_ARGUMENT` | no hash given and none in state | pass `-- 0x<txHash>` |
| a rejection that only ethrex produced (step 6 with a staked wallet) | Skandha never saw it | no admission record exists |
