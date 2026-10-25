# step_10_tx_violating_alt_banned

**Goal:** Fail to send the tx because of low reputation.

```sh
yarn step_10_tx_violating_alt_banned      # add --json for one JSON object
```

**Needs:** step 9

**What it does:** Sends the step 8 tx again. **Exit 0 means it was rejected and the explorer shows the wallet as `BANNED`.** The node's error text is generic (`unstaked payer accessed …`); the explorer status is the real cause. A banned entity is excluded even though it is staked.

**Expected output** (addresses and hashes differ):

```
rejected: unstaked payer accessed 0x902d…bd11 slot 0x00…00
tx hash: 0x8466…9127 (debug with: yarn step_11_debug 0x8466…9127)
reputation of 0xabe9…e2: BANNED (opsSeen 10000, opsIncluded 0, staked true)
why: the node's error text is generic …
undo: yarn reset_reputation
```

**If it fails**

| Symptom / code | Cause | Fix |
|---|---|---|
| exit 1, `accepted` | the wallet is not banned | run `step_9_reputation_burn` |
| exit 1, rejected but not banned | the wallet is unstaked | run `step_7_stake` |
