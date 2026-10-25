# step_8_tx_violating_alt

**Goal:** Send the same tx to the standard alt-mempool.

```sh
yarn step_8_tx_violating_alt      # add --json for one JSON object
```

**Needs:** step 7

**What it does:** The exact tx of step 6, now to the sidecar. The staked wallet is admitted and mined.

**Expected output** (addresses and hashes differ):

```
accepted and mined: 0xbf09…c066
the same tx the canonical mempool rejected in step 6 (the wallet reads foreign storage; staking relaxes that rule)
next: yarn step_9_reputation_burn
```

**If it fails**

| Symptom / code | Cause | Fix |
|---|---|---|
| rejected `[STO] unstaked payer accessed …` | wallet not staked, or banned | run `step_7_stake`; if banned, `reset_reputation` |
