import { programIds, type ProgramCapability } from "@txshield/core";
import { describe, expect, it } from "vitest";
import { analyzeCpi } from "../src/cpi.js";
import type { NormalizedInnerIx } from "../src/types.js";

const USER = "USER";
const JUP = "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4";
const caps = new Map<string, ProgramCapability>([[JUP, { transferToken: true, transferSol: true }]]);
const b64 = (arr: number[]) => Buffer.from(arr).toString("base64");

describe("analyzeCpi — per-program capability model", () => {
  it("does not flag an inner token Transfer under a router declared capable of it", () => {
    const inner: NormalizedInnerIx[] = [
      {
        programId: programIds.TOKEN_PROGRAM,
        accounts: ["SRC", "DST", "AUTH"],
        dataBase64: b64([3, ...new Array(8).fill(0)]), // Transfer
        invokingProgram: JUP,
      },
    ];
    expect(analyzeCpi(inner, USER, caps).some((f) => f.kind === "cpi-capability-violation")).toBe(
      false,
    );
  });

  it("flags an inner SetAuthority under a router NOT declared for it (even if not user-targeted)", () => {
    const inner: NormalizedInnerIx[] = [
      {
        programId: programIds.TOKEN_PROGRAM,
        accounts: ["TOKENACCT", "OTHER"], // authority is not the user — only the capability check fires
        dataBase64: b64([6, 2, 0]), // SetAuthority + AccountOwner
        invokingProgram: JUP,
      },
    ];
    const f = analyzeCpi(inner, USER, caps);
    expect(f.some((x) => x.kind === "cpi-capability-violation" && x.severity === "CRITICAL")).toBe(
      true,
    );
  });
});
