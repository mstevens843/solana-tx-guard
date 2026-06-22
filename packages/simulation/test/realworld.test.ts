// Simulation-layer 2026 attack corpus: inner-CPI laundered drains (incl. a compromised allowlisted
// router exceeding its capability) and the TOCTOU defense — even if a drainer kit fakes the wallet's
// preview, the on-chain atomic-guard pins the REAL post-state so a divergent execution reverts.

import type { ProgramCapability } from "@txshield/core";
import { programIds } from "@txshield/core";
import { describe, expect, it } from "vitest";
import { analyzeCpi } from "../src/cpi.js";
import { buildAtomicGuard, deriveAssertions } from "../src/lighthouse.js";
import type { AccountDiff, NormalizedInnerIx } from "../src/types.js";

const USER = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const SYSTEM = "11111111111111111111111111111111";
const JUP = "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"; // a swap router: may move value, NOT change authority
// What a swap router is allowed to do (no setAuthority/assign) — same shape as registry's DEFAULT_PROGRAM_CAPABILITIES.
const CAPS: ReadonlyMap<string, ProgramCapability> = new Map([
  [JUP, { transferToken: true, transferSol: true }],
]);
const b64 = (arr: number[]) => Buffer.from(arr).toString("base64");

describe("2026 attack corpus — simulation", () => {
  it("allowlisted DEX router doing an inner SetAuthority beyond its role → cpi-capability-violation CRITICAL", () => {
    const inner: NormalizedInnerIx[] = [
      {
        programId: programIds.TOKEN_PROGRAM,
        accounts: ["TOKENACCT", USER],
        dataBase64: b64([6, 2, 0]), // SetAuthority + AccountOwner + None
        invokingProgram: JUP,
      },
    ];
    const f = analyzeCpi(inner, USER, CAPS);
    expect(f.some((x) => x.kind === "cpi-capability-violation" && x.severity === "CRITICAL")).toBe(
      true,
    );
  });

  it("CPI-laundered System::Assign hidden under a router call → cpi-hidden-assign CRITICAL", () => {
    const inner: NormalizedInnerIx[] = [
      {
        programId: programIds.SYSTEM_PROGRAM,
        accounts: [USER],
        dataBase64: b64([1, 0, 0, 0, ...new Array(32).fill(9)]),
        invokingProgram: JUP,
      },
    ];
    expect(analyzeCpi(inner, USER).some((x) => x.kind === "cpi-hidden-assign")).toBe(true);
  });

  it("TOCTOU defense: even if the wallet preview is faked, the atomic-guard pins the real post-state", () => {
    const diff: AccountDiff[] = [
      {
        address: USER,
        isTokenAccount: false,
        preLamports: 1_000_000_000,
        postLamports: 990_000_000,
        preOwner: SYSTEM,
        postOwner: SYSTEM,
      },
    ];
    const assertions = deriveAssertions(diff, USER);
    expect(
      assertions.some((a) => a.type === "account-lamports-gte" && a.value === 990_000_000n),
    ).toBe(true);
    const guard = buildAtomicGuard(diff, { user: USER, originalTxLen: 200 });
    expect(guard.fits).toBe(true);
    expect(guard.instructions.length).toBeGreaterThan(0);
  });
});
