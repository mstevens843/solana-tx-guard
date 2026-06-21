import { programIds } from "@txshield/core";
import { describe, expect, it } from "vitest";
import { analyzeCpi } from "../src/cpi.js";
import type { NormalizedInnerIx } from "../src/types.js";

const USER = "USER";
const b64 = (arr: number[]) => Buffer.from(arr).toString("base64");

describe("analyzeCpi — inner-CPI laundered drains", () => {
  it("flags a hidden SetAuthority(AccountOwner) on the user's token account as CRITICAL", () => {
    // Top-level looks like a benign router call; the real takeover is this inner CPI.
    const inner: NormalizedInnerIx[] = [
      {
        programId: programIds.TOKEN_PROGRAM,
        accounts: ["TOKENACCT", USER], // [account, current authority = user]
        dataBase64: b64([6, 2, 0]), // SetAuthority + AccountOwner + COption::None
      },
    ];
    const f = analyzeCpi(inner, USER);
    expect(f.some((x) => x.kind === "cpi-hidden-set-authority" && x.severity === "CRITICAL")).toBe(
      true,
    );
  });

  it("flags a hidden System Assign of the user's account as CRITICAL", () => {
    const inner: NormalizedInnerIx[] = [
      {
        programId: programIds.SYSTEM_PROGRAM,
        accounts: [USER],
        dataBase64: b64([1, 0, 0, 0, ...new Array(32).fill(9)]), // Assign + new owner
      },
    ];
    const f = analyzeCpi(inner, USER);
    expect(f.some((x) => x.kind === "cpi-hidden-assign" && x.severity === "CRITICAL")).toBe(true);
  });

  it("does NOT flag a benign inner SOL transfer (ambiguous with swaps — covered by the guard)", () => {
    const inner: NormalizedInnerIx[] = [
      {
        programId: programIds.SYSTEM_PROGRAM,
        accounts: [USER, "POOL"],
        dataBase64: b64([2, 0, 0, 0, ...new Array(8).fill(0)]), // Transfer
      },
    ];
    expect(analyzeCpi(inner, USER)).toEqual([]);
  });
});
