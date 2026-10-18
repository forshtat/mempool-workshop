# step_9_reputation_burn

**Goal:** Get the entity banned. **This step cheats.**

```sh
npm run step_9_reputation_burn      # add --json for one JSON object
```

**Needs:** step 6

**What it does:** Reputation normally falls because an entity keeps producing txs that are admitted but never included. That cannot be reproduced reliably on the devnet, so this step writes `opsSeen 10000, opsIncluded 0` for **your wallet only** with the devnet's open `debug_bundler_setReputation`, and waits until the explorer shows `BANNED`. `-- --reset` restores `0, 0`. Throttled alone still admits a tx (it only caps the entity at 4 mempool entries); only a ban rejects.

**Expected output** (addresses and hashes differ):

```
THIS STEP CHEATS.
…
reputation of 0xabe9…e2: BANNED (opsSeen 10000, opsIncluded 0, staked true)
next: npm run step_10_tx_violating_alt_banned   (undo with: npm run step_9_reputation_burn -- --reset)
```

**If it fails**

| Symptom / code | Cause | Fix |
|---|---|---|
| `REPUTATION_NOT_APPLIED` | explorer disabled or the debug method is closed | this is a devnet-only shortcut; on a locked-down node it cannot work |
