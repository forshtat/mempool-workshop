# step_7_stake

**Goal:** Stake the wallet.

```sh
npm run step_7_stake      # add --json for one JSON object
```

**Needs:** step 6

**What it does:** Sends a tx whose `SENDER` frame calls the registry's `addStake(86400)` with 0.012 ETH. In a self-relay the `SENDER` frame calls as the wallet, so the wallet is the staker, and the wallet needs no staking code. The `VERIFY` frame is the clean path (empty data), so the wallet is admissible before it is staked. Idempotent.

**Expected output** (addresses and hashes differ):

```
the wallet 0xabe9…e2 stakes itself with a SENDER frame calling the registry…
staked: 0xd1a6…9d82
wallet 0xabe9…e2: 0.012 ETH, unstake delay 86400s
next: npm run step_8_tx_violating_alt
```

**If it fails**

| Symptom / code | Cause | Fix |
|---|---|---|
| `STAKE_NOT_RECORDED` | tx mined but the registry shows no stake | `step_11_debug -- <txHash>` |
| `STATE_MISSING` | no violating wallet | run `step_6_tx_violating_canonical` |
