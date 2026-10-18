# step_4_wallet_deploy

**Goal:** Deploy your own validation-frame wallet contract.

```sh
npm run step_4_wallet_deploy      # add --json for one JSON object, --fresh to redeploy
```

**Needs:** step 1

**What it does:** Deploys `ExampleWallet(owner, approver, signerReader)` with 0.01 ETH of creation value. The wallet has no ECDSA code: the tx carries a signature entry with `signer = owner` that the protocol verifies, and the wallet's `VERIFY` frame checks the verified signer with `SIGPARAM` (through the raw `SignerReader`) and approves. Re-running reuses the wallet; `--fresh` deploys a new one.

**Expected output** (addresses and hashes differ):

```
ExampleWallet deployed: 0x357e0747cd81125d1e607ae4fc6ac5ccba03594b
owner: 0x5880…8e57
balance: 0.01 ETH
next: npm run step_5_tx_wallet
```

**If it fails**

| Symptom / code | Cause | Fix |
|---|---|---|
| `DEPLOY_FAILED` | not enough gas or balance | deploys need ~6M gas; run `step_1_check` to top up |
| `STATE_STALE` | devnet reset | run with `--fresh` |
