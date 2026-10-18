import { privateKeyToAccount } from "viem/accounts";
import { ensureParticipantKey, loadConfig } from "../lib/config.js";
import { runStep } from "../lib/output.js";
import { writeState } from "../lib/state.js";
import { DEFAULT_MAX_FEE, RECIPIENT, buildSelfRelayTx, signFrameTx, txHash } from "../lib/frameTx/build.js";
import { accountNonce, explorerLink, sendFrameTx, waitForReceipt } from "../lib/frameTx/send.js";

runStep("step_2_tx_first", async (ctx) => {
  const cfg = loadConfig();
  const key = ensureParticipantKey();
  const from = privateKeyToAccount(key).address;
  const tx = await signFrameTx(
    buildSelfRelayTx({ from, to: RECIPIENT, value: 1_000_000_000n, nonce: await accountNonce(from), chainId: cfg.chainId, maxFeePerGas: DEFAULT_MAX_FEE }),
    key
  );
  ctx.log(`sending ${txHash(tx)} to the standard alt-mempool…`);
  const hash = await sendFrameTx(tx, "skandha");
  const receipt = await waitForReceipt(hash);
  writeState({ lastTxHash: hash });
  return {
    summary: [`frame tx mined: ${hash}`, `block: ${Number(receipt.blockNumber)}`, `frames: ${receipt.frameReceipts?.length} (all succeeded)`, `explorer: ${explorerLink(hash)}`, `next: npm run step_3_tx_paymaster`].join("\n"),
    data: { txHash: hash, block: Number(receipt.blockNumber), frames: receipt.frameReceipts?.length ?? 0 },
  };
});
