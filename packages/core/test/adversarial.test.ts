// Adversarial proof corpus — every red-team bypass must stay flagged. This is the regression
// suite that keeps TxShield honest as the rules evolve. (The CPI-laundered inner-instruction
// bypass is proven in @txshield/simulation's cpi.test.ts.)

import { toBase58 } from "@txshield/core";
import { describe, expect, it } from "vitest";
import { analyze } from "../src/index.js";
import {
  COMPUTE_BUDGET_ID,
  STAKE_ID,
  SYSTEM_ID,
  TOKEN_ID,
  buildLegacyTx,
  buildV0TransferWithAltRecipient,
  computeBudgetNoop,
  pk,
  stakeAuthorizeData,
  sysAdvanceNonce,
  sysTransfer,
  sysUnknown,
  tokenApprove,
  tokenSetAuthorityOwner,
} from "./helpers.js";

const fp = pk(1);

describe("red-team bypass corpus", () => {
  it("durable nonce NOT at instruction 0 is still flagged (any-index)", () => {
    const tx = buildLegacyTx(fp, [
      {
        programId: SYSTEM_ID,
        accounts: [
          { pubkey: fp, signer: true, writable: true },
          { pubkey: pk(80), signer: false, writable: true },
        ],
        data: sysTransfer(1000n),
      },
      {
        programId: SYSTEM_ID,
        accounts: [
          { pubkey: pk(2), signer: false, writable: true },
          { pubkey: pk(3), signer: false, writable: false },
          { pubkey: fp, signer: true, writable: true },
        ],
        data: sysAdvanceNonce(),
      },
    ]);
    const r = analyze(tx);
    expect(r.action).toBe("BLOCK");
    expect(r.warnings.some((w) => w.kind === "durable-nonce")).toBe(true);
  });

  it("decoy padding does not hide the buried SetAuthority", () => {
    const tx = buildLegacyTx(fp, [
      { programId: COMPUTE_BUDGET_ID, accounts: [], data: computeBudgetNoop() },
      { programId: COMPUTE_BUDGET_ID, accounts: [], data: computeBudgetNoop() },
      {
        programId: TOKEN_ID,
        accounts: [
          { pubkey: pk(20), signer: false, writable: true },
          { pubkey: fp, signer: true, writable: false },
        ],
        data: tokenSetAuthorityOwner(),
      },
    ]);
    const r = analyze(tx);
    expect(r.action).toBe("BLOCK");
    expect(r.warnings.some((w) => w.kind === "token-account-takeover")).toBe(true);
    expect(r.warnings.some((w) => w.kind === "review-all-instructions")).toBe(true);
  });

  it("an ALT-hidden transfer recipient is flagged", () => {
    const r = analyze(buildV0TransferWithAltRecipient(fp));
    expect(r.warnings.some((w) => w.kind === "sensitive-account-via-alt")).toBe(true);
  });

  it("an undecodable instruction to a core program fails closed", () => {
    const tx = buildLegacyTx(fp, [
      { programId: SYSTEM_ID, accounts: [{ pubkey: fp, signer: true, writable: true }], data: sysUnknown() },
    ]);
    const r = analyze(tx);
    expect(r.action).toBe("BLOCK");
    expect(r.warnings.some((w) => w.kind === "undecoded-sensitive-ix")).toBe(true);
  });

  it("a low-amount delegate approval is still flagged (standing grant beats the amount)", () => {
    const tx = buildLegacyTx(fp, [
      {
        programId: TOKEN_ID,
        accounts: [
          { pubkey: pk(20), signer: false, writable: true },
          { pubkey: pk(21), signer: false, writable: false },
          { pubkey: fp, signer: true, writable: false },
        ],
        data: tokenApprove(1n),
      },
    ]);
    expect(analyze(tx).warnings.some((w) => w.kind === "delegate-approval")).toBe(true);
  });

  it("a co-signed deferred-broadcast transfer is flagged", () => {
    const user2 = toBase58(pk(2));
    const tx = buildLegacyTx(fp, [
      {
        programId: SYSTEM_ID,
        accounts: [
          { pubkey: pk(2), signer: true, writable: true },
          { pubkey: pk(80), signer: false, writable: true },
        ],
        data: sysTransfer(1000n),
      },
    ]);
    expect(analyze(tx, { user: user2 }).warnings.some((w) => w.kind === "deferred-broadcast")).toBe(
      true,
    );
  });

  it("a stake withdraw-authority hijack is blocked", () => {
    const tx = buildLegacyTx(fp, [
      {
        programId: STAKE_ID,
        accounts: [
          { pubkey: pk(40), signer: false, writable: true },
          { pubkey: pk(41), signer: false, writable: false },
          { pubkey: fp, signer: true, writable: false },
        ],
        data: stakeAuthorizeData(1),
      },
    ]);
    const r = analyze(tx);
    expect(r.action).toBe("BLOCK");
    expect(r.warnings.some((w) => w.kind === "stake-withdraw-authority-hijack")).toBe(true);
  });
});
