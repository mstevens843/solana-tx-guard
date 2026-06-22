import { describe, expect, it } from "vitest";
import { analyze } from "../src/index.js";
import { toBase58 } from "../src/util/base58.js";
import { SYSTEM_ID, buildLegacyTx, pk, sysTransfer } from "./helpers.js";

describe("R24 known-drainer denylist", () => {
  const fp = pk(1);
  const recipient = pk(50);
  const tx = buildLegacyTx(fp, [
    {
      programId: SYSTEM_ID,
      accounts: [
        { pubkey: fp, signer: true, writable: true },
        { pubkey: recipient, signer: false, writable: true },
      ],
      data: sysTransfer(1000n),
    },
  ]);

  it("does nothing without a denylist", () => {
    expect(analyze(tx).warnings.some((w) => w.id === "R24_DENYLISTED")).toBe(false);
  });

  it("BLOCKs a denylisted recipient address", () => {
    const r = analyze(tx, { denylists: { addresses: new Set([toBase58(recipient)]) } });
    expect(r.action).toBe("BLOCK");
    expect(r.warnings.some((w) => w.kind === "denylisted-address")).toBe(true);
  });

  it("BLOCKs a denylisted program", () => {
    const r = analyze(tx, { denylists: { programs: new Set([toBase58(SYSTEM_ID)]) } });
    expect(r.action).toBe("BLOCK");
    expect(r.warnings.some((w) => w.kind === "denylisted-program")).toBe(true);
  });
});
