import { describe, expect, it } from "vitest";
import { decodeTransaction } from "../src/decode/normalize.js";
import { analyze } from "../src/index.js";
import { toBase58 } from "../src/util/base58.js";
import {
  COMPUTE_BUDGET_ID,
  SYSTEM_ID,
  buildLegacyTx,
  buildV0TransferWithAltRecipient,
  computeBudgetNoop,
  pk,
  sysTransfer,
} from "./helpers.js";

// buildV0TransferWithAltRecipient uses a table key of 32 bytes of value 8, 1 writable index (0).
const TABLE_KEY = toBase58(new Uint8Array(32).fill(8));

describe("ALT resolver (the RPC resolver)", () => {
  const tx = buildV0TransferWithAltRecipient(pk(1));

  it("WARNs unresolved-lookup-table with no resolved tables (offline)", () => {
    const r = analyze(tx);
    expect(r.warnings.some((w) => w.kind === "unresolved-lookup-table")).toBe(true);
  });

  it("clears unresolved-lookup-table once the table is resolved", () => {
    const recipient = toBase58(pk(50));
    const lookupTables = new Map([[TABLE_KEY, [recipient]]]);
    const r = analyze(tx, { lookupTables });
    expect(r.warnings.some((w) => w.kind === "unresolved-lookup-table")).toBe(false);

    const decoded = decodeTransaction(tx, lookupTables);
    expect(decoded.unresolvedLookupTables).toBe(false);
    expect(decoded.accounts.find((a) => a.source === "alt-writable")?.address).toBe(recipient);
  });
});

describe("R16 decoy-bundle does not false-fire on a normal swap preamble", () => {
  it("ignores the ComputeBudget preamble before a value instruction", () => {
    const fp = pk(1);
    const tx = buildLegacyTx(fp, [
      { programId: COMPUTE_BUDGET_ID, accounts: [], data: computeBudgetNoop() },
      { programId: COMPUTE_BUDGET_ID, accounts: [], data: computeBudgetNoop() },
      {
        programId: SYSTEM_ID,
        accounts: [
          { pubkey: fp, signer: true, writable: true },
          { pubkey: pk(50), signer: false, writable: true },
        ],
        data: sysTransfer(1000n),
      },
    ]);
    expect(analyze(tx).warnings.some((w) => w.kind === "review-all-instructions")).toBe(false);
  });
});
