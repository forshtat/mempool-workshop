import { privateKeyToAccount } from "viem/accounts";
import { ensureParticipantKey, loadConfig } from "../lib/config.js";
import { getStake } from "../lib/contracts.js";
import { getReputation } from "../lib/explorer.js";
import { DEFAULT_MAX_FEE, buildStakeTx, signFrameTx } from "../lib/frameTx/build.js";
import { accountNonce, explorerLink, sendFrameTx, waitForReceipt } from "../lib/frameTx/send.js";
import { StepError, runStep } from "../lib/output.js";
import { requireState } from "../lib/state.js";

const STAKE = 12_000_000_000_000_000n; // 0.012 ETH: strictly above the devnet's minStake of 0.01 ETH
const UNSTAKE_DELAY_SEC = 86_400; // one day, the ERC-8421 minimum unstake delay

runStep("step_7_stake", async (ctx) => {
  const cfg = loadConfig();
  const wallet = requireState("violating", "step_6_tx_violating_canonical");
  const ownerKey = ensureParticipantKey();
  const owner = privateKeyToAccount(ownerKey).address;

  const existing = await getStake(wallet);
  if (existing.amount >= STAKE && existing.withdrawTime === 0) {
    return {
      summary: `wallet ${wallet} is already staked: ${Number(existing.amount) / 1e18} ETH, unstake delay ${existing.unstakeDelay}s\nnext: npm run step_8_tx_violating_alt`,
      data: { wallet, staked: true, alreadyStaked: true, stakeWei: existing.amount.toString(), unstakeDelaySec: existing.unstakeDelay },
    };
  }

  const tx = await signFrameTx(
    buildStakeTx({ wallet, owner, amount: STAKE, unstakeDelaySec: UNSTAKE_DELAY_SEC, nonce: await accountNonce(wallet), chainId: cfg.chainId, maxFeePerGas: DEFAULT_MAX_FEE }),
    ownerKey
  );
  ctx.log(`the wallet ${wallet} stakes itself with a SENDER frame calling the registry…`);
  const hash = await sendFrameTx(tx, "skandha");
  await waitForReceipt(hash);

  const after = await getStake(wallet);
  if (after.amount < STAKE) {
    throw new StepError("STAKE_NOT_RECORDED", `the tx was mined but the registry shows ${after.amount} wei for ${wallet}`, { hint: "run `npm run step_11_debug -- " + hash + "`" });
  }
  const explorerStaked = await getReputation(wallet).then((r) => r.isStaked, () => undefined);
  return {
    summary: [`staked: ${hash}`, `wallet ${wallet}: ${Number(after.amount) / 1e18} ETH, unstake delay ${after.unstakeDelay}s`, `explorer: ${explorerLink(hash)}`, "next: npm run step_8_tx_violating_alt"].join("\n"),
    data: { txHash: hash, wallet, staked: true, alreadyStaked: false, stakeWei: after.amount.toString(), unstakeDelaySec: after.unstakeDelay, explorerIsStaked: explorerStaked ?? null },
  };
});
