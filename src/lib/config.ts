import fs from "node:fs";
import { generatePrivateKey } from "viem/accounts";
import type { Hex } from "viem";

// The devnet's shared, throwaway genesis key (published on purpose). Never use it on a real network.
const DEVNET_FUNDER_KEY = "0x06f911c1ecb2053bb443ba0a0e28d630c583c3c0c2f334a9ecdc8c7c6ad4ea15" as Hex;

export interface Config {
  chainId: number;
  ethrexUrl: string;
  skandhaUrl: string;
  funderKey: Hex;
  participantKey: Hex | undefined;
}

const ENV_FILE = ".env";

function loadDotEnv(): void {
  try {
    process.loadEnvFile(ENV_FILE);
  } catch {
    /* no .env yet */
  }
}

export function loadConfig(): Config {
  loadDotEnv();
  const e = process.env;
  return {
    chainId: Number(e.CHAIN_ID ?? 1337),
    ethrexUrl: e.ETHREX_URL ?? "https://altmempool.forshtat.com",
    skandhaUrl: e.SKANDHA_URL ?? "https://altmempool.forshtat.com/rpc",
    funderKey: (e.FUNDER_KEY as Hex | undefined) ?? DEVNET_FUNDER_KEY,
    participantKey: e.PARTICIPANT_KEY as Hex | undefined,
  };
}

/** Returns the participant key, generating it into `.env` on first use. */
export function ensureParticipantKey(): Hex {
  const cfg = loadConfig();
  if (cfg.participantKey) return cfg.participantKey;
  const key = generatePrivateKey();
  fs.appendFileSync(ENV_FILE, `${fs.existsSync(ENV_FILE) ? "\n" : ""}PARTICIPANT_KEY=${key}\n`);
  process.env.PARTICIPANT_KEY = key;
  return key;
}
