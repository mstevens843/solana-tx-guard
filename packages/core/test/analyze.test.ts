import { describe, expect, it } from "vitest";
import { analyze } from "../src/index.js";
import {
  SYSTEM_ID,
  TOKEN_ID,
  buildLegacyTx,
  pk,
  sysAdvanceNonce,
  sysAssign,
  sysTransfer,
  tokenApprove,
  tokenSetAuthorityOwner,
} from "./helpers.js";

const feePayer = pk(1);

describe("durable nonce (flagship)", () => {
  it("flags a never-expiring tx that also moves value as CRITICAL/BLOCK", () => {
    const tx = buildLegacyTx(feePayer, [
      {
        programId: SYSTEM_ID,
        accounts: [
          { pubkey: pk(2), signer: false, writable: true }, // nonce account
          { pubkey: pk(3), signer: false, writable: false }, // recent-blockhashes sysvar
          { pubkey: feePayer, signer: true, writable: true }, // nonce authority
        ],
        data: sysAdvanceNonce(),
      },
      {
        programId: SYSTEM_ID,
        accounts: [
          { pubkey: feePayer, signer: true, writable: true },
          { pubkey: pk(4), signer: false, writable: true }, // attacker
        ],
        data: sysTransfer(1_000_000n),
      },
    ]);

    const report = analyze(tx);
    expect(report.action).toBe("BLOCK");
    expect(report.resultType).toBe("Malicious");
    expect(report.warnings.some((w) => w.kind === "durable-nonce")).toBe(true);
  });

  it("warns (not blocks) on a benign never-expiring tx with no value movement", () => {
    const tx = buildLegacyTx(feePayer, [
      {
        programId: SYSTEM_ID,
        accounts: [
          { pubkey: pk(2), signer: false, writable: true },
          { pubkey: pk(3), signer: false, writable: false },
          { pubkey: feePayer, signer: true, writable: true },
        ],
        data: sysAdvanceNonce(),
      },
    ]);
    const report = analyze(tx);
    expect(report.action).toBe("WARN");
    expect(report.warnings.some((w) => w.kind === "durable-nonce")).toBe(true);
  });
});

describe("ownership / authority hijacks", () => {
  it("blocks System Assign of the user's own account", () => {
    const tx = buildLegacyTx(feePayer, [
      {
        programId: SYSTEM_ID,
        accounts: [{ pubkey: feePayer, signer: true, writable: true }],
        data: sysAssign(pk(99)),
      },
    ]);
    const report = analyze(tx);
    expect(report.action).toBe("BLOCK");
    expect(report.warnings.some((w) => w.kind === "owner-reassignment")).toBe(true);
  });

  it("blocks SPL Token SetAuthority(AccountOwner) on the user", () => {
    const tx = buildLegacyTx(feePayer, [
      {
        programId: TOKEN_ID,
        accounts: [
          { pubkey: pk(20), signer: false, writable: true }, // token account
          { pubkey: feePayer, signer: true, writable: false }, // current authority (user)
        ],
        data: tokenSetAuthorityOwner(),
      },
    ]);
    const report = analyze(tx);
    expect(report.action).toBe("BLOCK");
    expect(report.warnings.some((w) => w.kind === "token-account-takeover")).toBe(true);
  });

  it("warns on a delegate approval to a non-allowlisted delegate", () => {
    const tx = buildLegacyTx(feePayer, [
      {
        programId: TOKEN_ID,
        accounts: [
          { pubkey: pk(20), signer: false, writable: true }, // source
          { pubkey: pk(21), signer: false, writable: false }, // delegate
          { pubkey: feePayer, signer: true, writable: false }, // owner (user)
        ],
        data: tokenApprove(1_000_000n),
      },
    ]);
    const report = analyze(tx);
    expect(report.action).toBe("WARN");
    expect(report.warnings.some((w) => w.kind === "delegate-approval")).toBe(true);
  });
});

describe("benign + fail-closed", () => {
  it("passes a plain SOL transfer as Benign", () => {
    const tx = buildLegacyTx(feePayer, [
      {
        programId: SYSTEM_ID,
        accounts: [
          { pubkey: feePayer, signer: true, writable: true },
          { pubkey: pk(50), signer: false, writable: true },
        ],
        data: sysTransfer(5_000n),
      },
    ]);
    const report = analyze(tx);
    expect(report.action).toBe("NONE");
    expect(report.resultType).toBe("Benign");
    expect(report.meta.atomicGuardRecommended).toBe(false);
  });

  it("warns when an unknown program holds write access to the user", () => {
    const tx = buildLegacyTx(feePayer, [
      {
        programId: pk(123), // unknown program
        accounts: [{ pubkey: feePayer, signer: true, writable: true }],
        data: new Uint8Array([1, 2, 3]),
      },
    ]);
    const report = analyze(tx);
    expect(report.action).toBe("WARN");
    expect(report.warnings.some((w) => w.kind === "unknown-program-writable")).toBe(true);
    expect(report.meta.atomicGuardRecommended).toBe(true);
  });

  it("never returns Benign on malformed bytes (fail-closed)", () => {
    const report = analyze(new Uint8Array([9, 9, 9, 9, 9]));
    expect(report.resultType).not.toBe("Benign");
    expect(report.action).not.toBe("NONE");
    expect(report.meta.failClosed).toBe(true);
  });
});
