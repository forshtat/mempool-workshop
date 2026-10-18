import { getReputation, setReputation } from "../lib/explorer.js";
import { StepError, runStep } from "../lib/output.js";
import { requireState } from "../lib/state.js";

const BAN_OPS_SEEN_PENALTY = 10_000; // the value ERC-7562 uses to declare an entity banned (opsSeen far above opsIncluded)

const CHEAT_NOTICE = [
  "THIS STEP CHEATS.",
  "Reputation normally falls because an entity keeps producing txs that are admitted and then never included.",
  "That cannot be reproduced reliably on this devnet, so this step writes the counters directly with the devnet's open",
  "debug_bundler_setReputation method, for your own wallet only. Real nodes restrict that method.",
].join("\n");

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function waitFor(address: Parameters<typeof getReputation>[0], status: "OK" | "BANNED") {
  for (let i = 0; i < 10; i++) {
    const r = await getReputation(address);
    if (r.status === status) return r;
    await sleep(1000);
  }
  throw new StepError("REPUTATION_NOT_APPLIED", `the explorer never showed ${status} for ${address}`, { hint: "is the node started with --explorer.enable, and is debug_bundler_setReputation reachable?" });
}

runStep("step_9_reputation_burn", async () => {
  // Only ever the participant's own entity, taken from the state file.
  const wallet = requireState("violating", "step_6_tx_violating_canonical");

  if (process.argv.includes("--reset")) {
    await setReputation(wallet, 0, 0);
    const r = await waitFor(wallet, "OK");
    return { summary: `${CHEAT_NOTICE}\n\nreputation of ${wallet} reset: ${r.status} (opsSeen ${r.opsSeen}, opsIncluded ${r.opsIncluded})`, data: { shortcut: true, wallet, reset: true, ...r } };
  }

  await setReputation(wallet, BAN_OPS_SEEN_PENALTY, 0);
  const r = await waitFor(wallet, "BANNED");
  return {
    summary: [CHEAT_NOTICE, "", `reputation of ${wallet}: ${r.status} (opsSeen ${r.opsSeen}, opsIncluded ${r.opsIncluded}, staked ${r.isStaked})`, "next: npm run step_10_tx_violating_alt_banned   (undo with: npm run step_9_reputation_burn -- --reset)"].join("\n"),
    data: { shortcut: true, wallet, reset: false, ...r },
  };
});
