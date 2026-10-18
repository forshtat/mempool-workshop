// Vendored from skandha packages/types/src/contracts/FrameTx.ts (skandha @ 8e2d5bcd). Trimmed to what the workshop uses.
export const FRAME_MODE = {
  DEFAULT: 0,
  VERIFY: 1,
  SENDER: 2,
} as const;
export type FrameMode = (typeof FRAME_MODE)[keyof typeof FRAME_MODE];

export const APPROVE_SCOPE = {
  NONE: 0x0,
  PAYMENT: 0x1,
  EXECUTION: 0x2,
  EXECUTION_AND_PAYMENT: 0x3,
} as const;
export type ApproveScope = (typeof APPROVE_SCOPE)[keyof typeof APPROVE_SCOPE];

export const ATOMIC_BATCH_FLAG = 0x4;

export interface FrameLimits {
  execution: bigint;
  state: bigint;
}

export interface Frame {
  mode: FrameMode;
  /** bits 0-1: approval scope (see APPROVE_SCOPE); bit 2: ATOMIC_BATCH_FLAG */
  flags: number;
  target: `0x${string}` | null;
  limits: FrameLimits;
  value: bigint;
  data: `0x${string}`;
}

export const SIG_SCHEME = {
  ARBITRARY: 0x0,
  SECP256K1: 0x1,
  P256: 0x2,
} as const;
export type SigScheme = (typeof SIG_SCHEME)[keyof typeof SIG_SCHEME];

export interface SignatureEntry {
  scheme: SigScheme;
  /** empty for ARBITRARY; 20-byte address for SECP256K1/P256 */
  signer: `0x${string}` | "0x";
  /** empty (canonical sig hash) or an explicit 32-byte digest */
  msg: `0x${string}` | "0x";
  signature: `0x${string}`;
}

export interface FeeParams {
  maxPriorityFeePerGas: bigint;
  maxFeePerGas: bigint;
  maxFeePerBlobGas: bigint;
}

/**
 * EIP-8272 recent-root reference: a declared `(source_id, slot, root)` tuple.
 * Valid iff `1 <= head_slot - slot <= RECENT_ROOT_USABLE_WINDOW` and the entry
 * is committed in the `RECENT_ROOT_ADDRESS` predeploy, where a contract writes
 * it under `source_id = keccak256(caller ‖ salt)`. `root` is opaque to consensus.
 */
export interface RecentRootReference {
  sourceId: `0x${string}`;
  /** beacon slot (EIP-7843), `< 2**64` */
  slot: bigint;
  root: `0x${string}`;
}

export interface FrameTransaction {
  chainId: bigint;
  /**
   * EIP-8250 keyed nonces: 1..16 strictly increasing keys. `[0]` is the
   * sender's linear account nonce; non-zero keys live in the NONCE_MANAGER
   * predeploy. Key 0 is only valid as the sole key.
   */
  nonceKeys: bigint[];
  /** EIP-8250: must equal the current sequence of every key in `nonceKeys`. */
  nonceSeq: bigint;
  sender: `0x${string}`;
  frames: Frame[];
  signatures: SignatureEntry[];
  fees: FeeParams;
  blobVersionedHashes: `0x${string}`[];
  /** EIP-8272: 0..16 declared recent-root references. */
  recentRootReferences: RecentRootReference[];
}

export const FRAME_TX_TYPE = 0x06;
// Matches ethrex's frame_tx_entry_point() (crates/common/types/
// transaction.rs, eip8141-tracer branch): address(0xaa), used as the
// caller/`from` for DEFAULT/VERIFY-mode frames' root scope. Not a
// placeholder.
export const ENTRY_POINT = "0x00000000000000000000000000000000000000aa" as const;
export const EXPIRY_VERIFIER = "0x0000000000000000000000000000000000008141" as const; // placeholder — verify exact EIP-8141 §Constants value at implementation time
