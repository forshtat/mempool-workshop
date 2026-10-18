import { describe, expect, it } from "vitest";
import { APPROVER_INIT_CODE, loadArtifact } from "../../src/lib/contracts.js";
import { buildPaymasterTx } from "../../src/lib/frameTx/build.js";
import { FRAME_MODE } from "../../src/lib/frameTx/types.js";

describe("contracts lib", () => {
  it("loadArtifact returns an ABI and non-empty creation bytecode for SponsorPaymaster", () => {
    const a = loadArtifact("SponsorPaymaster");
    expect(a.abi.length).toBeGreaterThan(0);
    expect(a.bytecode.startsWith("0x")).toBe(true);
    expect(a.bytecode.length).toBeGreaterThan(100);
  });

  it("the approver's runtime reads the scope from calldata and executes APPROVE (0xaa)", () => {
    expect(APPROVER_INIT_CODE.endsWith("60003560006000aa")).toBe(true);
  });

  it("buildPaymasterTx is [VERIFY(execution) on sender, VERIFY(payment) on paymaster, SENDER]", () => {
    const pm = "0x00000000000000000000000000000000000000c1";
    const tx = buildPaymasterTx({ from: "0x00000000000000000000000000000000000000b1", paymaster: pm, to: "0x8943545177806ED17B9F23F0a21ee5948eCaa776", nonce: 0n, chainId: 1337, maxFeePerGas: 2_000_000_000n });
    expect(tx.frames.map((f) => [f.mode, f.flags, f.target])).toEqual([
      [FRAME_MODE.VERIFY, 2, null],
      [FRAME_MODE.VERIFY, 1, pm],
      [FRAME_MODE.SENDER, 0, "0x8943545177806ED17B9F23F0a21ee5948eCaa776"],
    ]);
    const verifyGas = tx.frames[0].limits.execution + tx.frames[1].limits.execution;
    expect(verifyGas).toBeLessThanOrEqual(100_000n); // EIP-8141 MAX_VERIFY_GAS
  });
});

import { SIGNER_READER_INIT_CODE } from "../../src/lib/contracts.js";
import { buildWalletTx } from "../../src/lib/frameTx/build.js";

describe("wallet support", () => {
  it("the signer reader runs SIGPARAM (0xb4) for signature 0, param RESOLVED_SIGNER", () => {
    expect(SIGNER_READER_INIT_CODE.endsWith("60006000b460005260206000f3")).toBe(true);
  });

  it("buildWalletTx is [VERIFY(both) on the wallet, SENDER] signed by an explicit owner signer", () => {
    const owner = "0x00000000000000000000000000000000000000a1";
    const tx = buildWalletTx({ wallet: "0x00000000000000000000000000000000000000b1", owner, to: "0x8943545177806ED17B9F23F0a21ee5948eCaa776", value: 5n, nonce: 1n, chainId: 1337, maxFeePerGas: 2_000_000_000n });
    expect(tx.frames.map((f) => [f.mode, f.flags])).toEqual([[FRAME_MODE.VERIFY, 3], [FRAME_MODE.SENDER, 0]]);
    expect(tx.signatures[0]).toMatchObject({ scheme: 1, signer: owner, msg: "0x" });
    expect(tx.nonceSeq).toBe(1n);
  });
});

describe("violating tx builder", () => {
  it("buildWalletTx puts verifyData into the VERIFY frame only when given", () => {
    const a = { wallet: "0x00000000000000000000000000000000000000b1", owner: "0x00000000000000000000000000000000000000a1", to: "0x8943545177806ED17B9F23F0a21ee5948eCaa776", value: 5n, nonce: 1n, chainId: 1337, maxFeePerGas: 2_000_000_000n } as const;
    expect(buildWalletTx(a).frames[0].data).toBe("0x");
    expect(buildWalletTx({ ...a, verifyData: "0x01" }).frames[0].data).toBe("0x01");
  });
});
