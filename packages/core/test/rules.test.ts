import { describe, expect, it } from "vitest";
import { analyze, sameMessage } from "../src/index.js";
import {
  LOADER_ID,
  STAKE_ID,
  SYSTEM_ID,
  TOKEN2022_ID,
  TOKEN_ID,
  buildLegacyTx,
  buildV0TransferWithAltRecipient,
  loaderSetAuthority,
  pk,
  stakeAuthorizeData,
  sysAuthorizeNonce,
  sysTransfer,
  tokenCloseAccount,
  tokenTransfer,
} from "./helpers.js";

const fp = pk(1);

describe("R07 close-account sweep", () => {
  it("warns on CloseAccount sending rent to a non-owner", () => {
    const tx = buildLegacyTx(fp, [
      {
        programId: TOKEN_ID,
        accounts: [
          { pubkey: pk(20), signer: false, writable: true }, // token account
          { pubkey: pk(21), signer: false, writable: true }, // destination (not owner)
          { pubkey: fp, signer: true, writable: false }, // owner
        ],
        data: tokenCloseAccount(),
      },
    ]);
    const r = analyze(tx);
    expect(r.warnings.some((w) => w.kind === "close-account-sweep")).toBe(true);
  });
});

describe("R08b nonce-authority", () => {
  it("warns on AuthorizeNonceAccount by the user", () => {
    const tx = buildLegacyTx(fp, [
      {
        programId: SYSTEM_ID,
        accounts: [
          { pubkey: pk(30), signer: false, writable: true },
          { pubkey: fp, signer: true, writable: false },
        ],
        data: sysAuthorizeNonce(pk(99)),
      },
    ]);
    expect(analyze(tx).warnings.some((w) => w.kind === "nonce-authority-change")).toBe(true);
  });
});

describe("R19 stake authorize", () => {
  const stakeTx = (sa: number) =>
    buildLegacyTx(fp, [
      {
        programId: STAKE_ID,
        accounts: [
          { pubkey: pk(40), signer: false, writable: true },
          { pubkey: pk(41), signer: false, writable: false },
          { pubkey: fp, signer: true, writable: false },
        ],
        data: stakeAuthorizeData(sa),
      },
    ]);

  it("blocks handing WITHDRAW authority away", () => {
    const r = analyze(stakeTx(1));
    expect(r.action).toBe("BLOCK");
    expect(r.warnings.some((w) => w.kind === "stake-withdraw-authority-hijack")).toBe(true);
  });

  it("only warns on a staker-authority change", () => {
    const r = analyze(stakeTx(0));
    expect(r.action).toBe("WARN");
    expect(r.warnings.some((w) => w.kind === "stake-staker-authority-change")).toBe(true);
  });
});

describe("R21 program upgrade authority", () => {
  it("blocks transferring upgrade authority", () => {
    const tx = buildLegacyTx(fp, [
      {
        programId: LOADER_ID,
        accounts: [
          { pubkey: pk(50), signer: false, writable: true }, // program data
          { pubkey: fp, signer: true, writable: false }, // current authority
          { pubkey: pk(51), signer: false, writable: false }, // new authority
        ],
        data: loaderSetAuthority(),
      },
    ]);
    const r = analyze(tx);
    expect(r.action).toBe("BLOCK");
    expect(r.warnings.some((w) => w.kind === "program-authority-transfer")).toBe(true);
  });
});

describe("R09 Token-2022 offline guard", () => {
  const t22Tx = buildLegacyTx(fp, [
    {
      programId: TOKEN2022_ID,
      accounts: [
        { pubkey: pk(60), signer: false, writable: true },
        { pubkey: pk(61), signer: false, writable: true },
        { pubkey: fp, signer: true, writable: false },
      ],
      data: tokenTransfer(100n),
    },
  ]);

  it("warns when Token-2022 is involved and mints are not inspected", () => {
    expect(
      analyze(t22Tx).warnings.some((w) => w.kind === "token-2022-extensions-uninspected"),
    ).toBe(true);
  });

  it("suppresses the guard once mintsInspected is set", () => {
    const r = analyze(t22Tx, { mintsInspected: true });
    expect(r.warnings.some((w) => w.kind === "token-2022-extensions-uninspected")).toBe(false);
  });
});

describe("R14b sensitive-account-via-ALT", () => {
  it("flags a transfer whose recipient is resolved from a lookup table", () => {
    const tx = buildV0TransferWithAltRecipient(fp);
    const r = analyze(tx);
    expect(r.warnings.some((w) => w.kind === "sensitive-account-via-alt")).toBe(true);
  });
});

describe("R08 split-drain", () => {
  it("warns on SOL sent to multiple recipients in one tx", () => {
    const tx = buildLegacyTx(fp, [
      {
        programId: SYSTEM_ID,
        accounts: [
          { pubkey: fp, signer: true, writable: true },
          { pubkey: pk(70), signer: false, writable: true },
        ],
        data: sysTransfer(1000n),
      },
      {
        programId: SYSTEM_ID,
        accounts: [
          { pubkey: fp, signer: true, writable: true },
          { pubkey: pk(71), signer: false, writable: true },
        ],
        data: sysTransfer(1000n),
      },
    ]);
    expect(analyze(tx).warnings.some((w) => w.kind === "sol-split-transfer")).toBe(true);
  });
});

describe("digest binding", () => {
  it("matches identical messages and rejects different ones", () => {
    const a = buildLegacyTx(fp, [
      {
        programId: SYSTEM_ID,
        accounts: [
          { pubkey: fp, signer: true, writable: true },
          { pubkey: pk(70), signer: false, writable: true },
        ],
        data: sysTransfer(1000n),
      },
    ]);
    const c = buildLegacyTx(fp, [
      {
        programId: SYSTEM_ID,
        accounts: [
          { pubkey: fp, signer: true, writable: true },
          { pubkey: pk(71), signer: false, writable: true },
        ],
        data: sysTransfer(1000n),
      },
    ]);
    expect(sameMessage(a, a)).toBe(true);
    expect(sameMessage(a, c)).toBe(false);
  });
});
