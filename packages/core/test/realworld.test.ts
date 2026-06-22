// Battle-readiness corpus: each case is a synthetic transaction modelled on a REAL 2026 Solana
// drain technique. The goal is to prove TxShield flags every major attack class at the right
// severity, and stays NONE on benign/legit transactions. (Cases marked GAP fail until Phase 16
// Round 2 adds R25 lookalike-address + expands the canonical-mint set.)

import { describe, expect, it } from "vitest";
import { analyze } from "../src/index.js";
import type { RiskReport } from "../src/types.js";
import { toBase58 } from "../src/util/base58.js";
import {
  LOADER_ID,
  STAKE_ID,
  SYSTEM_ID,
  TOKEN_ID,
  buildLegacyTx,
  buildV0TransferWithAltRecipient,
  fromBase58,
  loaderSetAuthority,
  pk,
  stakeAuthorizeData,
  sysAdvanceNonce,
  sysAssign,
  sysTransfer,
  sysUnknown,
  tokenApprove,
  tokenSetAuthorityOwner,
} from "./helpers.js";

const ATA_ID = fromBase58("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
const MEMO_ID = fromBase58("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
const memo = () => new Uint8Array([0x68, 0x69]);
const U64_MAX = 18446744073709551615n;

const fp = pk(1);
const attackerProgram = pk(200);
const attacker = pk(201);
const attacker2 = pk(202);

const has = (r: RiskReport, kind: string) => r.warnings.some((w) => w.kind === kind);

describe("2026 attack corpus — static", () => {
  it("Q1-2026 Blink 'free mint': ATA-create + gas transfer + System::Assign owner takeover → BLOCK", () => {
    const tx = buildLegacyTx(fp, [
      // looks-normal ATA create
      {
        programId: ATA_ID,
        accounts: [
          { pubkey: fp, signer: true, writable: true },
          { pubkey: pk(10), signer: false, writable: true },
          { pubkey: fp, signer: false, writable: false },
          { pubkey: pk(11), signer: false, writable: false },
          { pubkey: SYSTEM_ID, signer: false, writable: false },
        ],
        data: new Uint8Array([]),
      },
      // "gas" transfer
      {
        programId: SYSTEM_ID,
        accounts: [
          { pubkey: fp, signer: true, writable: true },
          { pubkey: attacker, signer: false, writable: true },
        ],
        data: sysTransfer(10_000_000n),
      },
      // the real takeover
      {
        programId: SYSTEM_ID,
        accounts: [{ pubkey: fp, signer: true, writable: true }],
        data: sysAssign(attackerProgram),
      },
    ]);
    const r = analyze(tx);
    expect(r.action).toBe("BLOCK");
    expect(has(r, "owner-reassignment")).toBe(true);
  });

  it("Q2-2026 full-portfolio phishing bundle: SOL split-drain + unlimited token Approve → BLOCK", () => {
    const tx = buildLegacyTx(fp, [
      {
        programId: SYSTEM_ID,
        accounts: [
          { pubkey: fp, signer: true, writable: true },
          { pubkey: attacker, signer: false, writable: true },
        ],
        data: sysTransfer(900_000_000n),
      },
      {
        programId: SYSTEM_ID,
        accounts: [
          { pubkey: fp, signer: true, writable: true },
          { pubkey: attacker2, signer: false, writable: true },
        ],
        data: sysTransfer(50_000_000n),
      },
      {
        programId: TOKEN_ID,
        accounts: [
          { pubkey: pk(12), signer: false, writable: true }, // user's token account
          { pubkey: attacker, signer: false, writable: false }, // delegate
          { pubkey: fp, signer: true, writable: false }, // owner
        ],
        data: tokenApprove(U64_MAX),
      },
    ]);
    const r = analyze(tx);
    expect(r.action).toBe("BLOCK");
    expect(has(r, "delegate-approval")).toBe(true);
    expect(has(r, "sol-split-transfer")).toBe(true);
  });

  it("Drift-style durable-nonce pre-signed transfer, user not the fee-payer → BLOCK (never-expires + deferred-broadcast)", () => {
    const broadcaster = pk(2);
    const tx = buildLegacyTx(broadcaster, [
      {
        programId: SYSTEM_ID,
        accounts: [
          { pubkey: pk(20), signer: false, writable: true }, // nonce account
          { pubkey: pk(21), signer: false, writable: false }, // recent-blockhashes sysvar
          { pubkey: broadcaster, signer: true, writable: true }, // nonce authority
        ],
        data: sysAdvanceNonce(),
      },
      {
        programId: SYSTEM_ID,
        accounts: [
          { pubkey: fp, signer: true, writable: true }, // the victim (a co-signer, not fee-payer)
          { pubkey: attacker, signer: false, writable: true },
        ],
        data: sysTransfer(500_000_000n),
      },
    ]);
    const r = analyze(tx, { user: toBase58(fp) });
    expect(r.action).toBe("BLOCK");
    expect(has(r, "durable-nonce")).toBe(true);
    expect(has(r, "deferred-broadcast")).toBe(true);
  });

  it("Token SetAuthority(AccountOwner) takeover → BLOCK", () => {
    const tx = buildLegacyTx(fp, [
      {
        programId: TOKEN_ID,
        accounts: [
          { pubkey: pk(12), signer: false, writable: true }, // token account
          { pubkey: fp, signer: true, writable: false }, // current owner
        ],
        data: tokenSetAuthorityOwner(),
      },
    ]);
    const r = analyze(tx);
    expect(r.action).toBe("BLOCK");
    expect(has(r, "token-account-takeover")).toBe(true);
  });

  it("Stake withdraw-authority hijack → BLOCK", () => {
    const tx = buildLegacyTx(fp, [
      {
        programId: STAKE_ID,
        accounts: [
          { pubkey: pk(30), signer: false, writable: true }, // stake account
          { pubkey: pk(31), signer: false, writable: false }, // clock sysvar
          { pubkey: fp, signer: true, writable: false }, // current authority
        ],
        data: stakeAuthorizeData(1), // 1 = Withdrawer
      },
    ]);
    const r = analyze(tx);
    expect(r.action).toBe("BLOCK");
    expect(has(r, "stake-withdraw-authority-hijack")).toBe(true);
  });

  it("Program upgrade-authority transfer → BLOCK", () => {
    const tx = buildLegacyTx(fp, [
      {
        programId: LOADER_ID,
        accounts: [
          { pubkey: pk(40), signer: false, writable: true }, // program data
          { pubkey: fp, signer: true, writable: false }, // current authority
          { pubkey: attacker, signer: false, writable: false }, // new authority
        ],
        data: loaderSetAuthority(),
      },
    ]);
    const r = analyze(tx);
    expect(r.action).toBe("BLOCK");
    expect(has(r, "program-authority-transfer")).toBe(true);
  });

  it("ALT-hidden transfer recipient (offline, unresolved) → flagged", () => {
    const r = analyze(buildV0TransferWithAltRecipient(fp));
    expect(r.action === "WARN" || r.action === "BLOCK").toBe(true);
    expect(has(r, "sensitive-account-via-alt") || has(r, "unresolved-lookup-table")).toBe(true);
  });

  it("decoy-buried owner takeover (Assign after 2 memos) → BLOCK + review-all-instructions", () => {
    const tx = buildLegacyTx(fp, [
      { programId: MEMO_ID, accounts: [], data: memo() },
      { programId: MEMO_ID, accounts: [], data: memo() },
      {
        programId: SYSTEM_ID,
        accounts: [{ pubkey: fp, signer: true, writable: true }],
        data: sysAssign(attackerProgram),
      },
    ]);
    const r = analyze(tx);
    expect(r.action).toBe("BLOCK");
    expect(has(r, "owner-reassignment")).toBe(true);
    expect(has(r, "review-all-instructions")).toBe(true);
  });

  it("undecodable sensitive System instruction on a user account → fail closed", () => {
    const tx = buildLegacyTx(fp, [
      {
        programId: SYSTEM_ID,
        accounts: [{ pubkey: fp, signer: true, writable: true }],
        data: sysUnknown(),
      },
    ]);
    const r = analyze(tx);
    expect(has(r, "undecoded-sensitive-ix")).toBe(true);
    expect(r.action === "WARN" || r.action === "BLOCK").toBe(true);
  });

  it("lookalike fake-USDC mint → WARN lookalike-mint", () => {
    const FAKE_USDC = "EPjFWdd5AufqSSqeM3qN1xzybapC8G4wEGGkZwyTDt1v";
    const tx = buildLegacyTx(fp, [
      {
        programId: SYSTEM_ID,
        accounts: [
          { pubkey: fp, signer: true, writable: true },
          { pubkey: fromBase58(FAKE_USDC), signer: false, writable: true },
        ],
        data: sysTransfer(1n),
      },
    ]);
    expect(has(analyze(tx), "lookalike-mint")).toBe(true);
  });

  it("GAP→Round2: lookalike fake-JUP mint → WARN lookalike-mint", () => {
    const FAKE_JUP = "JUPyiwrYJFskUPiHa7hkeR8WUtAeFoSYbKedZNsDvCN"; // first6/last6 of JUP, one middle char off
    const tx = buildLegacyTx(fp, [
      {
        programId: SYSTEM_ID,
        accounts: [
          { pubkey: fp, signer: true, writable: true },
          { pubkey: fromBase58(FAKE_JUP), signer: false, writable: true },
        ],
        data: sysTransfer(1n),
      },
    ]);
    expect(has(analyze(tx), "lookalike-mint")).toBe(true);
  });

  it("GAP→Round2: address-poisoning — transfer to a lookalike of the user's own address → WARN lookalike-address", () => {
    const USER = "74Xkp2iLXm315h69sFRiCFjmKnaWkMV8W2LgJwPRSgN5";
    const POISON = "74Xkp2iLXm315h69sFRiCFjmKnaWkMV9W2LgJwPRSgN5"; // same first6/last6, one middle char off
    const tx = buildLegacyTx(fromBase58(USER), [
      {
        programId: SYSTEM_ID,
        accounts: [
          { pubkey: fromBase58(USER), signer: true, writable: true },
          { pubkey: fromBase58(POISON), signer: false, writable: true },
        ],
        data: sysTransfer(1_000_000n),
      },
    ]);
    expect(has(analyze(tx, { user: USER }), "lookalike-address")).toBe(true);
  });

  // ---- benign guards: these MUST stay clean (no false positives) ----

  it("benign: a plain single SOL transfer to a normal recipient → NONE", () => {
    const tx = buildLegacyTx(fp, [
      {
        programId: SYSTEM_ID,
        accounts: [
          { pubkey: fp, signer: true, writable: true },
          { pubkey: attacker, signer: false, writable: true },
        ],
        data: sysTransfer(1_000_000n),
      },
    ]);
    expect(analyze(tx).action).toBe("NONE");
  });

  it("benign: a transfer to a non-lookalike recipient does not trip address-poisoning", () => {
    const tx = buildLegacyTx(fp, [
      {
        programId: SYSTEM_ID,
        accounts: [
          { pubkey: fp, signer: true, writable: true },
          { pubkey: pk(150), signer: false, writable: true },
        ],
        data: sysTransfer(1_000_000n),
      },
    ]);
    expect(has(analyze(tx), "lookalike-address")).toBe(false);
  });
});
