import fs from "node:fs";
import { encodeFunctionData, encodeDeployData, type Abi, type Address, type Hex } from "viem";
import { getCode, sendLegacy, waitMined } from "./chain.js";
import { loadConfig } from "./config.js";
import { rpc } from "./rpc.js";
import { StepError } from "./output.js";
import { ensureParticipantKey, readState, writeState, type WorkshopState } from "./state.js";

const initCode = (runtime: string): Hex => {
  const len = (runtime.length / 2).toString(16).padStart(2, "0");
  return `0x60${len}600c60003960${len}6000f3${runtime}`;
};

/** Runtime: PUSH0-free `CALLDATALOAD(0)` as scope, then `APPROVE(scope, 0, 0)` (opcode 0xaa). */
export const APPROVER_INIT_CODE = initCode("60003560006000aa");

/** Runtime: `SIGPARAM(signatureIndex 0, param 0 = RESOLVED_SIGNER)` (opcode 0xb4), returned as one word. */
export const SIGNER_READER_INIT_CODE = initCode("60006000b460005260206000f3");

/** Runtime: `SLOAD(0); POP; STOP`. Reading this contract's storage from validation is the demo storage-rule violation. */
export const FOREIGN_INIT_CODE = initCode("6000545000");

export type ArtifactName = "SponsorPaymaster" | "ExampleWallet" | "ViolatingWallet";

export function loadArtifact(name: ArtifactName): { abi: Abi; bytecode: Hex } {
  const file = new URL(`../../contracts/artifacts/${name}.json`, import.meta.url);
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    throw new StepError("ARTIFACT_MISSING", `contracts/artifacts/${name}.json not found`, { hint: "run `npm run build:contracts` (needs foundry)" });
  }
}

async function deployRaw(data: Hex, value: bigint): Promise<Address> {
  const hash = await sendLegacy(ensureParticipantKey(), { to: null, data, value, gas: loadConfig().deployGasLimit });
  const receipt = await waitMined(hash);
  if (receipt.status !== "0x1" || !receipt.contractAddress) {
    throw new StepError("DEPLOY_FAILED", `Deployment ${hash} reverted`, { hint: "deployments need ~6M gas on this devnet; check the participant balance covers `value` plus gas" });
  }
  return receipt.contractAddress as Address;
}

/** A contract is funded only through its creation `value` (a plain transfer would run its fallback and fail). */
export async function deployContract(name: ArtifactName, args: unknown[] = [], value = 0n): Promise<Address> {
  const { abi, bytecode } = loadArtifact(name);
  return deployRaw(encodeDeployData({ abi, bytecode, args }), value);
}

/** Whether `address` still has code. A devnet reset wipes every address recorded in the state file. */
export async function hasCode(address: Address): Promise<boolean> {
  return (await getCode(address)) !== "0x";
}

/** Returns the recorded contract of `key` if it still exists on chain and `fresh` is false; otherwise undefined. */
export async function reusable(key: keyof WorkshopState, fresh: boolean): Promise<Address | undefined> {
  const recorded = readState()[key] as Address | undefined;
  if (!recorded || fresh) return undefined;
  if (await hasCode(recorded)) return recorded;
  throw new StepError("STATE_STALE", `${key} ${recorded} has no code on chain`, {
    hint: "the devnet was probably reset; re-run this step with --fresh (and the steps that depend on it)",
  });
}

async function deployHelper(key: "approver" | "signerReader" | "foreign", init: Hex, fresh: boolean): Promise<Address> {
  const existing = await reusable(key, fresh);
  if (existing) return existing;
  const address = await deployRaw(init, 0n);
  writeState({ [key]: address });
  return address;
}

export const deployApprover = (fresh = false) => deployHelper("approver", APPROVER_INIT_CODE, fresh);
export const deployForeign = (fresh = false) => deployHelper("foreign", FOREIGN_INIT_CODE, fresh);
export const deploySignerReader = (fresh = false) => deployHelper("signerReader", SIGNER_READER_INIT_CODE, fresh);

const DEPOSIT_INFO_ABI = [{ type: "function", name: "getDepositInfo", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }, { type: "uint32" }, { type: "uint64" }] }] as const;

export interface StakeInfo {
  amount: bigint;
  unstakeDelay: number;
  withdrawTime: number;
}

/** Decodes `getDepositInfo`'s (stake, unstakeDelaySec, withdrawTime). Empty return data means no stake. */
export function decodeDepositInfo(hex: Hex): StakeInfo {
  const body = hex.slice(2);
  if (body.length < 192) return { amount: 0n, unstakeDelay: 0, withdrawTime: 0 };
  return {
    amount: BigInt(`0x${body.slice(0, 64)}`),
    unstakeDelay: Number(BigInt(`0x${body.slice(64, 128)}`)),
    withdrawTime: Number(BigInt(`0x${body.slice(128, 192)}`)),
  };
}

export async function getStake(address: Address): Promise<StakeInfo> {
  const data = encodeFunctionData({ abi: DEPOSIT_INFO_ABI, functionName: "getDepositInfo", args: [address] });
  const out = await rpc(loadConfig().gatewayUrl, "eth_call", [{ to: loadConfig().stakingRegistry, data }, "latest"]);
  return decodeDepositInfo(out as Hex);
}
