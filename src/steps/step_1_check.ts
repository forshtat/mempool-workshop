import { privateKeyToAccount } from "viem/accounts";
import { fundFromFunder, getBalance } from "../lib/chain.js";
import { ensureParticipantKey, loadConfig } from "../lib/config.js";
import { StepError, runStep } from "../lib/output.js";
import { rpc } from "../lib/rpc.js";

const MIN_BALANCE = 100_000_000_000_000_000n; // 0.1 ETH: enough for every step, with room for deployments
const TOP_UP = 200_000_000_000_000_000n; // 0.2 ETH

runStep("step_1_check", async (ctx) => {
  const cfg = loadConfig();
  for (const [label, url] of [["ethrex", cfg.ethrexUrl], ["skandha", cfg.skandhaUrl]] as const) {
    const id = Number(await rpc(url, "eth_chainId", []));
    if (id !== cfg.chainId) {
      throw new StepError("WRONG_CHAIN", `${label} at ${url} reports chain ${id}, expected ${cfg.chainId}`, { hint: "set CHAIN_ID / the URLs in .env, or the devnet was replaced" });
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
  if (balance < MIN_BALANCE) {
    ctx.log(`funding ${account.address} from the shared devnet key…`);
    await fundFromFunder(account.address, TOP_UP);
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
