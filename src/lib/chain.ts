import { privateKeyToAccount } from "viem/accounts";
import type { Address, Hex } from "viem";
import { loadConfig } from "./config.js";
import { StepError } from "./output.js";
import { rpc } from "./rpc.js";

const GAS_PRICE = 2_000_000n; // devnet base fee is 7 wei; this clears it by a wide margin

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function retry<T>(
  fn: (attempt: number) => Promise<T>,
  opts: { retries: number; delayMs?: (attempt: number) => number }
): Promise<T> {
  const delay = opts.delayMs ?? (() => 150 + Math.random() * 300);
  let last: unknown;
  for (let attempt = 0; attempt <= opts.retries; attempt++) {
    try {
      return await fn(attempt);
    } catch (e) {
      last = e;
      if (attempt < opts.retries) await sleep(delay(attempt));
    }
  }
  throw last;
}

export async function getBalance(address: Address): Promise<bigint> {
  return BigInt(await rpc(loadConfig().ethrexUrl, "eth_getBalance", [address, "latest"]));
}

export async function getCode(address: Address): Promise<Hex> {
  return await rpc(loadConfig().ethrexUrl, "eth_getCode", [address, "latest"]);
}

/** Sends a legacy transaction through ethrex. Re-reads the pending nonce on every attempt, so shared keys survive collisions. */
export async function sendLegacy(
  key: Hex,
  tx: { to: Address | null; value?: bigint; data?: Hex; gas?: bigint },
  retries = 10
): Promise<Hex> {
  const cfg = loadConfig();
  const account = privateKeyToAccount(key);
  return retry(async () => {
    const nonce = Number(await rpc(cfg.ethrexUrl, "eth_getTransactionCount", [account.address, "pending"]));
    const raw = await account.signTransaction({
      chainId: cfg.chainId, nonce, to: tx.to, value: tx.value ?? 0n, data: tx.data ?? "0x",
      gas: tx.gas ?? 250_000n, gasPrice: GAS_PRICE, type: "legacy",
    });
    return (await rpc(cfg.ethrexUrl, "eth_sendRawTransaction", [raw])) as Hex;
  }, { retries });
}

export async function waitMined(hash: Hex, timeoutMs = 120_000): Promise<any> {
  const cfg = loadConfig();
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const r = await rpc(cfg.ethrexUrl, "eth_getTransactionReceipt", [hash]);
    if (r) return r;
    await sleep(2000);
  }
  throw new StepError("TX_NOT_MINED", `Transaction ${hash} was not mined within ${timeoutMs / 1000}s`, {
    hint: "the devnet may be stalled; check the explorer and retry",
  });
}

/** Funds `to` from the shared devnet key. Many participants share it, hence the retries. */
export async function fundFromFunder(to: Address, amount: bigint): Promise<Hex> {
  const hash = await sendLegacy(loadConfig().funderKey, { to, value: amount });
  const receipt = await waitMined(hash);
  if (receipt.status !== "0x1") throw new StepError("FUNDING_FAILED", `Funding transfer ${hash} reverted`);
  return hash;
}
