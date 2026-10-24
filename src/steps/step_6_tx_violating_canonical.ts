import { privateKeyToAccount } from "viem/accounts";
import { loadConfig } from "../lib/config.js";
import { deployApprover, deployContract, deployForeign, deploySignerReader, getStake, reusable } from "../lib/contracts.js";
import { buildWalletTx, signFrameTx, txHash } from "../lib/frameTx/build.js";
import { accountNonce, explainRejection, sendFrameTx, type Rejection, type Target } from "../lib/frameTx/send.js";
import { StepError, runStep } from "../lib/output.js";
import { ensureParticipantKey, writeState } from "../lib/state.js";

runStep("step_6_tx_violating_canonical", async (ctx) => {
  const cfg = loadConfig();
  const ownerKey = ensureParticipantKey();
  const owner = privateKeyToAccount(ownerKey).address;

  let wallet = await reusable("violating", ctx.fresh);
  if (!wallet) {
    const [approver, signerReader, foreign] = [await deployApprover(), await deploySignerReader(), await deployForeign()];
    ctx.log("deploying ViolatingWallet…");
    wallet = await deployContract("ViolatingWallet", [owner, approver, signerReader, foreign], cfg.violatingWalletFundingWei);
    writeState({ violating: wallet });
  }

  // VERIFY frame data 0x01 makes the wallet read a storage slot it does not own.
  const tx = await signFrameTx(
    buildWalletTx({ wallet, owner, to: cfg.recipient, value: cfg.transferWei, nonce: await accountNonce(wallet), chainId: cfg.chainId, maxFeePerGas: cfg.maxFeePerGasWei, verifyData: "0x01" }),
    ownerKey
  );

  const verdicts: Record<string, { accepted: boolean; skipped?: string; rejection?: Rejection }> = {};
  const attempt = async (target: Target) => {
    try {
      await sendFrameTx(tx, target);
      verdicts[target] = { accepted: true };
    } catch (e) {
      if (!(e instanceof StepError) || !e.code.startsWith("RPC_")) throw e;
      verdicts[target] = { accepted: false, rejection: explainRejection(e.message) };
    }
  };

  ctx.log("sending the violating tx to the canonical mempool (ethrex, eth_sendRawTransaction)…");
  await attempt("ethrex");

  // Once the wallet is staked (step 7), Skandha would admit this tx and mine it, which would burn the wallet's nonce.
  const staked = (await getStake(wallet)).amount > 0n;
  if (staked) {
    verdicts.skandha = { accepted: false, skipped: "wallet is staked (step 7): Skandha would admit this tx, so it was not sent" };
  } else {
    ctx.log("sending the same tx to the standard alt-mempool (Skandha) for comparison…");
    await attempt("skandha");
  }

  const canonical = verdicts.ethrex;
  const line = (label: string, v: (typeof verdicts)[string]) =>
    `${label}: ${v.skipped ? `skipped (${v.skipped})` : v.accepted ? "ACCEPTED" : `rejected [${v.rejection!.rule}] ${v.rejection!.message}`}`;
  return {
    ok: !canonical.accepted,
    hint: "the canonical mempool accepted a tx that reads foreign storage; the devnet's ethrex may have changed (see docs/findings.md)",
    summary: [
      line("canonical mempool (ethrex)", canonical),
      line("standard alt-mempool (Skandha)", verdicts.skandha),
      canonical.accepted ? "" : `why: ${canonical.rejection!.hint}`,
      `wallet: ${wallet}`,
      staked ? `tx hash: ${txHash(tx)}` : `tx hash: ${txHash(tx)} (debug with: npm run step_11_debug -- ${txHash(tx)})`,
      staked ? "next: npm run step_8_tx_violating_alt (the wallet is already staked)" : "next: npm run step_7_stake",
    ].filter(Boolean).join("\n"),
    data: { wallet, txHash: txHash(tx), canonical, skandha: verdicts.skandha, rule: canonical.rejection?.rule ?? null },
  };
});
