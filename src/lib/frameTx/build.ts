import { encodeFunctionData, keccak256 } from "viem";
import type { Address, Hex } from "viem";
import { sign } from "viem/accounts";
import { computeSigHash, encodeRawFrameTx } from "./codec.js";
import { FRAME_MODE, SIG_SCHEME, type Frame, type FrameTransaction } from "./types.js";

/** Approve scope bits: 1 = payment, 2 = execution, 3 = both. */
export const APPROVE = { PAYMENT: 1, EXECUTION: 2, BOTH: 3 } as const;

export const frame = (
  mode: number, flags: number, target: Address | null, execution: bigint,
  opts: { value?: bigint; data?: Hex; state?: bigint } = {}
): Frame => ({
  mode, flags, target,
  limits: { execution, state: opts.state ?? 0n },
  value: opts.value ?? 0n, data: opts.data ?? "0x",
} as Frame);

export const ARBITRARY_SIGNATURE = { scheme: SIG_SCHEME.ARBITRARY, signer: "0x", msg: "0x", signature: "0x" } as const;
export const SECP256K1_PLACEHOLDER = { scheme: SIG_SCHEME.SECP256K1, signer: "0x", msg: "0x", signature: "0x" } as const;

export function assembleTx(f: {
  sender: Address; nonceSeq: bigint; chainId: number; maxFeePerGas: bigint; frames: Frame[];
  signature?: { scheme: number; signer: Hex; msg: Hex; signature: Hex }; nonceKey?: bigint;
}): FrameTransaction {
  return {
    chainId: BigInt(f.chainId),
    nonceKeys: [f.nonceKey ?? 0n],
    nonceSeq: f.nonceSeq,
    sender: f.sender,
    frames: f.frames,
    signatures: [{ ...(f.signature ?? ARBITRARY_SIGNATURE) }],
    fees: { maxPriorityFeePerGas: f.maxFeePerGas, maxFeePerGas: f.maxFeePerGas, maxFeePerBlobGas: 0n },
    blobVersionedHashes: [],
    recentRootReferences: [],
  } as FrameTransaction;
}

/** `[self_verify]` + one SENDER transfer; the EOA signs and pays for itself. */
export function buildSelfRelayTx(a: {
  from: Address; to: Address; value: bigint; nonce: bigint; chainId: number; maxFeePerGas: bigint;
}): FrameTransaction {
  return assembleTx({
    sender: a.from, nonceSeq: a.nonce, chainId: a.chainId, maxFeePerGas: a.maxFeePerGas,
    signature: SECP256K1_PLACEHOLDER,
    frames: [
      frame(FRAME_MODE.VERIFY, APPROVE.BOTH, null, 30_000n),
      // state limit: a transfer to a brand-new account is charged state gas on this devnet
      frame(FRAME_MODE.SENDER, 0, a.to, 50_000n, { value: a.value, state: 200_000n }),
    ],
  });
}

/** Signs over computeSigHash and packs the result as `v(0/1) || r || s`. */
export async function signFrameTx(tx: FrameTransaction, privateKey: Hex): Promise<FrameTransaction> {
  const s = await sign({ hash: computeSigHash(tx), privateKey });
  const v = (Number(s.v) - 27).toString(16).padStart(2, "0");
  const packed = `0x${v}${s.r.slice(2)}${s.s.slice(2)}` as Hex;
  return { ...tx, signatures: [{ ...tx.signatures[0], signature: packed }, ...tx.signatures.slice(1)] };
}

const hex = (n: bigint) => `0x${n.toString(16)}`;

/** The JSON shape `eth_sendFrameTransaction` expects. */
export function toWire(tx: FrameTransaction): unknown {
  return {
    chainId: hex(tx.chainId),
    nonceKeys: tx.nonceKeys.map(hex),
    nonceSeq: hex(tx.nonceSeq),
    sender: tx.sender,
    frames: tx.frames.map((f) => ({
      mode: f.mode, flags: f.flags, target: f.target,
      limits: { execution: hex(f.limits.execution), state: hex(f.limits.state) },
      value: hex(f.value), data: f.data,
    })),
    signatures: tx.signatures.map((s) => ({ scheme: s.scheme, signer: s.signer, msg: s.msg, signature: s.signature })),
    fees: {
      maxPriorityFeePerGas: hex(tx.fees.maxPriorityFeePerGas),
      maxFeePerGas: hex(tx.fees.maxFeePerGas),
      maxFeePerBlobGas: hex(tx.fees.maxFeePerBlobGas),
    },
    blobVersionedHashes: tx.blobVersionedHashes,
    recentRootReferences: tx.recentRootReferences.map((r) => ({ sourceId: r.sourceId, slot: hex(r.slot), root: r.root })),
  };
}

export const txHash = (tx: FrameTransaction): Hex => keccak256(encodeRawFrameTx(tx));

/** `[VERIFY(execution) on sender, VERIFY(payment) on paymaster, SENDER]`: the paymaster pays, the sender needs no ETH. */
export function buildPaymasterTx(a: {
  from: Address; paymaster: Address; to: Address; nonce: bigint; chainId: number; maxFeePerGas: bigint;
}): FrameTransaction {
  return assembleTx({
    sender: a.from, nonceSeq: a.nonce, chainId: a.chainId, maxFeePerGas: a.maxFeePerGas,
    signature: SECP256K1_PLACEHOLDER,
    frames: [
      frame(FRAME_MODE.VERIFY, APPROVE.EXECUTION, null, 30_000n),
      frame(FRAME_MODE.VERIFY, APPROVE.PAYMENT, a.paymaster, 50_000n),
      frame(FRAME_MODE.SENDER, 0, a.to, 50_000n),
    ],
  });
}

/** `[VERIFY(both) on the wallet, SENDER]`; the owner signs with an explicit `signer`, the wallet checks it via SIGPARAM. */
export function buildWalletTx(a: {
  wallet: Address; owner: Address; to: Address; value: bigint; nonce: bigint; chainId: number; maxFeePerGas: bigint;
  /** Calldata of the VERIFY frame. ViolatingWallet breaks a storage rule when this is non-empty. */
  verifyData?: Hex;
}): FrameTransaction {
  return assembleTx({
    sender: a.wallet, nonceSeq: a.nonce, chainId: a.chainId, maxFeePerGas: a.maxFeePerGas,
    signature: { ...SECP256K1_PLACEHOLDER, signer: a.owner },
    frames: [
      frame(FRAME_MODE.VERIFY, APPROVE.BOTH, null, 70_000n, { data: a.verifyData }),
      frame(FRAME_MODE.SENDER, 0, a.to, 50_000n, { value: a.value, state: 200_000n }),
    ],
  });
}

const ADD_STAKE_ABI = [{ type: "function", name: "addStake", stateMutability: "payable", inputs: [{ type: "uint32" }], outputs: [] }] as const;

/**
 * The wallet stakes itself: in a self-relay the SENDER frame calls as `tx.sender`, so a SENDER frame that calls the
 * registry's `addStake` makes the wallet the staker. The VERIFY frame stays on the clean path (empty data).
 */
export function buildStakeTx(a: {
  registry: Address; wallet: Address; owner: Address; amount: bigint; unstakeDelaySec: number; nonce: bigint; chainId: number; maxFeePerGas: bigint;
}): FrameTransaction {
  return assembleTx({
    sender: a.wallet, nonceSeq: a.nonce, chainId: a.chainId, maxFeePerGas: a.maxFeePerGas,
    signature: { ...SECP256K1_PLACEHOLDER, signer: a.owner },
    frames: [
      frame(FRAME_MODE.VERIFY, APPROVE.BOTH, null, 70_000n),
      frame(FRAME_MODE.SENDER, 0, a.registry, 150_000n, {
        value: a.amount, state: 300_000n,
        data: encodeFunctionData({ abi: ADD_STAKE_ABI, functionName: "addStake", args: [a.unstakeDelaySec] }),
      }),
    ],
  });
}
