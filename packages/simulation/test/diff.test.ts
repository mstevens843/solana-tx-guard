import { programIds } from "@txshield/core";
import { describe, expect, it } from "vitest";
import { decodeTokenState, diffSimulation } from "../src/diff.js";
import type { RawSimulation } from "../src/types.js";

function tokenAccountBytes(amount: bigint, delegateFill: number | null): Uint8Array {
  const b = new Uint8Array(165);
  for (let i = 32; i < 64; i++) b[i] = 5; // owner
  let a = amount;
  for (let i = 0; i < 8; i++) {
    b[64 + i] = Number(a & 0xffn);
    a >>= 8n;
  }
  if (delegateFill != null) {
    b[72] = 1; // delegate option = Some
    for (let i = 76; i < 108; i++) b[i] = delegateFill;
  }
  b[108] = 1; // initialized
  return b;
}

const b64 = (bytes: Uint8Array) => Buffer.from(bytes).toString("base64");

describe("decodeTokenState", () => {
  it("decodes amount and delegate from a token account snapshot", () => {
    const state = decodeTokenState({
      lamports: 2_039_280,
      owner: programIds.TOKEN_PROGRAM,
      dataBase64: b64(tokenAccountBytes(1234n, 7)),
    });
    expect(state?.amount).toBe(1234n);
    expect(state?.delegate).not.toBeNull();
  });

  it("returns undefined for a non-token account", () => {
    expect(decodeTokenState({ lamports: 1, owner: programIds.SYSTEM_PROGRAM })).toBeUndefined();
  });
});

describe("diffSimulation", () => {
  it("detects a token amount decrease and a newly-set delegate", () => {
    const raw: RawSimulation = {
      ok: true,
      logs: [],
      accounts: [
        {
          address: "ATA",
          pre: { lamports: 2_039_280, owner: programIds.TOKEN_PROGRAM, dataBase64: b64(tokenAccountBytes(1000n, null)) },
          post: { lamports: 2_039_280, owner: programIds.TOKEN_PROGRAM, dataBase64: b64(tokenAccountBytes(900n, 7)) },
        },
      ],
    };
    const [d] = diffSimulation(raw);
    expect(d?.isTokenAccount).toBe(true);
    expect(d?.preToken?.amount).toBe(1000n);
    expect(d?.postToken?.amount).toBe(900n);
    expect(d?.preToken?.delegate).toBeNull();
    expect(d?.postToken?.delegate).not.toBeNull();
  });

  it("detects an account-owner change (Assign drain)", () => {
    const raw: RawSimulation = {
      ok: true,
      logs: [],
      accounts: [
        {
          address: "WALLET",
          pre: { lamports: 100, owner: programIds.SYSTEM_PROGRAM },
          post: { lamports: 100, owner: "EvilProgram1111111111111111111111111111111" },
        },
      ],
    };
    const [d] = diffSimulation(raw);
    expect(d?.preOwner).toBe(programIds.SYSTEM_PROGRAM);
    expect(d?.postOwner).toBe("EvilProgram1111111111111111111111111111111");
  });
});
