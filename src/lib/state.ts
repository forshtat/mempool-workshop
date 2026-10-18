import fs from "node:fs";
import type { Address, Hex } from "viem";
import { StepError } from "./output.js";

export interface WorkshopState {
  approver?: Address;
  signerReader?: Address;
  foreign?: Address;
  wallet?: Address;
  paymaster?: Address;
  violating?: Address;
  lastTxHash?: Hex;
}

const file = () => process.env.WORKSHOP_STATE ?? ".workshop-state.json";

export function readState(): WorkshopState {
  try {
    return JSON.parse(fs.readFileSync(file(), "utf8")) as WorkshopState;
  } catch {
    return {};
  }
}

export function writeState(patch: Partial<WorkshopState>): void {
  fs.writeFileSync(file(), JSON.stringify({ ...readState(), ...patch }, null, 2) + "\n");
}

export function requireState<K extends keyof WorkshopState>(key: K, createdBy: string): NonNullable<WorkshopState[K]> {
  const v = readState()[key];
  if (v == null) {
    throw new StepError("STATE_MISSING", `No "${key}" in ${file()}`, { hint: `run \`npm run ${createdBy}\` first` });
  }
  return v as NonNullable<WorkshopState[K]>;
}
