# step_5_tx_wallet

**Goal:** Send a tx validated by your wallet.

```sh
npm run step_5_tx_wallet      # add --json for one JSON object
```

**Needs:** step 4

**What it does:** Sender is the wallet; the owner key signs. Nonce comes from the chain (a contract's nonce starts at 1). The wallet pays for itself.

**Expected output** (addresses and hashes differ):

```
wallet tx mined: 0x8361…34f6
wallet balance: 0.01 -> 0.009931133 ETH (it paid)
next: npm run step_6_tx_violating_canonical
```

**If it fails**

| Symptom / code | Cause | Fix |
|---|---|---|
| `STATE_MISSING` | no wallet yet | run `step_4_wallet_deploy` |
| `RPC_-32502` bad signer | the participant key in `.workshop-state.json` is not the wallet's owner | deploy a new wallet with `step_4_wallet_deploy -- --fresh` |
