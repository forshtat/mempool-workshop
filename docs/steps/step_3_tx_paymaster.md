# step_3_tx_paymaster

**Goal:** Broadcast a frame tx paid for by a paymaster.

```sh
npm run step_3_tx_paymaster      # add --json for one JSON object, --fresh to redeploy
```

**Needs:** step 1

**What it does:** Deploys the universal `Approver` and a `SponsorPaymaster` (funded with 0.01 ETH through its creation value), then sends a tx from a brand-new key that holds **no ETH**: `[VERIFY(execution) on sender, VERIFY(payment) on paymaster, SENDER]`. The paymaster's balance drops, the sender's stays 0.

**Expected output** (addresses and hashes differ):

```
sender 0x77e9…3d48 holds 0 ETH; sending through paymaster 0x8d0e…ed7b…
sponsored frame tx mined: 0x4c1e…143d
sender balance: 0 wei (it never held ETH)
paymaster 0x8d0e…: 0.01 -> 0.009945762 ETH (it paid)
```

**If it fails**

| Symptom / code | Cause | Fix |
|---|---|---|
| `payer uses banned opcode: BALANCE` | a paymaster that reads its own balance | validation may not use `BALANCE` unstaked; the example paymaster has no balance check |
| `STATE_STALE` | devnet reset | re-run with `--fresh` |
