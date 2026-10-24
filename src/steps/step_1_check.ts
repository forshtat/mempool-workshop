import { privateKeyToAccount } from "viem/accounts";
import { fundFromFaucet, getBalance } from "../lib/chain.js";
import { loadConfig } from "../lib/config.js";
import { ensureParticipantKey } from "../lib/state.js";
import { StepError, runStep } from "../lib/output.js";
import { rpc } from "../lib/rpc.js";

runStep("step_1_check", async (ctx) => {
  const cfg = loadConfig();
  for (const [label, url] of [["ethrex", cfg.ethrexUrl], ["skandha", cfg.skandhaUrl]] as const) {
    const id = Number(await rpc(url, "eth_chainId", []));
    if (id !== cfg.chainId) {
      throw new StepError("WRONG_CHAIN", `${label} at ${url} reports chain ${id}, expected ${cfg.chainId}`, { hint: "update chainId / the URLs in workshop.config.json5, or the devnet was replaced" });
    }
  }
  const skCfg = await rpc(cfg.skandhaUrl, "skandha_config", []);

  let explorer = "available";
  try {
    await rpc(cfg.skandhaUrl, "skandha_explorer_listReputation", [{ limit: 1 }]);
  } catch {
    explorer = "unavailable (steps still work, but step_10 and step_11 print less)";
    ctx.log("warning: Skandha explorer methods are not enabled on this node");
  }

  const account = privateKeyToAccount(ensureParticipantKey());
  let balance = await getBalance(account.address);
  let funded = false;
  if (balance < cfg.minBalanceWei) {
    ctx.log(`asking the faucet to fund ${account.address}…`);
    await fundFromFaucet(account.address);
    balance = await getBalance(account.address);
    funded = true;
  }
  return {
    summary: [
      `chain ${cfg.chainId}: ethrex and Skandha reachable`,
      `participant: ${account.address}`,
      `balance: ${Number(balance) / 1e18} ETH${funded ? " (just funded)" : ""}`,
      `explorer: ${explorer}`,
    ].join("\n"),
    data: { chainId: cfg.chainId, participant: account.address, balanceWei: balance.toString(), funded, explorer, minStakeWei: skCfg.minStake },
  };
});
