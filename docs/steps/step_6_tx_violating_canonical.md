# step_6_tx_violating_canonical

**Goal:** Fail to broadcast a rule-violating tx to the canonical mempool.

```sh
npm run step_6_tx_violating_canonical      # add --json for one JSON object, --fresh to redeploy
```

**Needs:** step 1

**What it does:** Deploys a `ViolatingWallet`, which reads another contract's storage during validation when the `VERIFY` frame carries non-empty data. Sends that tx to the canonical mempool (ethrex, raw type-0x06 via `eth_sendRawTransaction`) and, while the wallet is unstaked, also to Skandha for comparison. **Exit 0 means the canonical mempool rejected it.**

**Expected output** (addresses and hashes differ):

```
canonical mempool (ethrex): rejected [STO] Invalid params: Frame transaction validation-prefix simulation failed: StorageReadNonSender
standard alt-mempool (Skandha): rejected [STO] unstaked payer accessed 0x902d…bd11 slot 0x00…00
why: validation may only touch the sender's own or associated storage; a staked entity may read more in the standard alt-mempool (npm run step_7_stake)
tx hash: 0x8466…9127 (debug with: npm run step_11_debug -- 0x8466…9127)
next: npm run step_7_stake
```
Once the wallet is staked, the Skandha line says `skipped`, because Skandha would admit (and mine) the tx.

**If it fails**

| Symptom / code | Cause | Fix |
|---|---|---|
| exit 1, ethrex ACCEPTED | the devnet's ethrex changed | see `docs/findings.md`, Check 1 |
| `DEPLOY_FAILED` | balance too low | run `step_1_check` |
