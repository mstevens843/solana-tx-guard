import { programIds } from "@txshield/core";
import { describe, expect, it } from "vitest";
import { inspectToken2022Mints } from "../src/mints.js";
import type { SimRpc } from "../src/types.js";

const b64 = (bytes: Uint8Array) => Buffer.from(bytes).toString("base64");

// Token-2022 mint with a PermanentDelegate extension TLV (type 12) at offset 166.
function mintWithPermanentDelegate(): Uint8Array {
  const b = new Uint8Array(170);
  b[165] = 1; // account type = Mint
  b[166] = 12; // ExtensionType.PermanentDelegate (u16 LE)
  b[167] = 0;
  b[168] = 32; // length
  b[169] = 0;
  return b;
}

function rpcReturning(owner: string, data: Uint8Array): SimRpc {
  return {
    getAccounts: async (addrs) => addrs.map(() => ({ lamports: 0, owner, dataBase64: b64(data) })),
    simulateTransaction: async () => ({ ok: true, logs: [], accounts: [] }),
  };
}

describe("inspectToken2022Mints", () => {
  it("flags a permanent-delegate mint as CRITICAL", async () => {
    const rpc = rpcReturning(programIds.TOKEN_2022_PROGRAM, mintWithPermanentDelegate());
    const findings = await inspectToken2022Mints(rpc, ["MINT"]);
    expect(
      findings.some((f) => f.kind === "token2022-permanent-delegate" && f.severity === "CRITICAL"),
    ).toBe(true);
  });

  it("ignores a normal SPL Token mint (not Token-2022)", async () => {
    const rpc = rpcReturning(programIds.TOKEN_PROGRAM, mintWithPermanentDelegate());
    expect(await inspectToken2022Mints(rpc, ["MINT"])).toEqual([]);
  });
});
