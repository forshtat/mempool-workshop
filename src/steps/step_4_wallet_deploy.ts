import { privateKeyToAccount } from "viem/accounts";
import { getBalance } from "../lib/chain.js";
import { ensureParticipantKey } from "../lib/config.js";
import { deployApprover, deployContract, deploySignerReader, reusable } from "../lib/contracts.js";
import { runStep } from "../lib/output.js";
import { writeState } from "../lib/state.js";

const WALLET_FUNDING = 10_000_000_000_000_000n; // 0.01 ETH, sent as the creation value

runStep("step_4_wallet_deploy", async (ctx) => {
  const owner = privateKeyToAccount(ensureParticipantKey()).address;
  const existing = await reusable("wallet", ctx.fresh);
  if (existing) {
    return {
      summary: `wallet already deployed: ${existing} (owner ${owner}); pass --fresh to deploy a new one`,
      data: { wallet: existing, owner, reused: true, balanceWei: (await getBalance(existing)).toString() },
    };
  }
  const approver = await deployApprover(ctx.fresh);
  const signerReader = await deploySignerReader(ctx.fresh);
  ctx.log("deploying ExampleWallet (funded through its creation value)…");
  const wallet = await deployContract("ExampleWallet", [owner, approver, signerReader], WALLET_FUNDING);
  writeState({ wallet });
  return {
    summary: [`ExampleWallet deployed: ${wallet}`, `owner: ${owner}`, `balance: ${Number(await getBalance(wallet)) / 1e18} ETH`, `next: npm run step_5_tx_wallet`].join("\n"),
    data: { wallet, owner, approver, signerReader, reused: false },
  };
});
