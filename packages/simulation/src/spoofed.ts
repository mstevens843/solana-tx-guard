// R13 (RPC) — spoofed token-account verification. Never trust a dApp-supplied "your token account":
// read its real on-chain owner and confirm it derives as your canonical ATA. ATA derivation uses
// @solana/kit's getProgramDerivedAddress (no extra dep, kit-version-safe).

import { address, getAddressEncoder, getProgramDerivedAddress } from "@solana/kit";
import type { Finding } from "@txshield/core";
import { decodeTokenState } from "./diff.js";
import type { SimRpc } from "./types.js";

const ATA_PROGRAM = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";

export interface TokenAccountRef {
  account: string;
  mint: string;
}

async function deriveAta(owner: string, tokenProgram: string, mint: string): Promise<string> {
  const enc = getAddressEncoder();
  const [pda] = await getProgramDerivedAddress({
    programAddress: address(ATA_PROGRAM),
    seeds: [enc.encode(address(owner)), enc.encode(address(tokenProgram)), enc.encode(address(mint))],
  });
  return pda;
}

export async function verifyTokenAccounts(
  rpc: SimRpc,
  refs: TokenAccountRef[],
  user: string,
): Promise<Finding[]> {
  if (refs.length === 0) return [];
  const out: Finding[] = [];
  const snaps = await rpc.getAccounts(refs.map((r) => r.account));

  for (let i = 0; i < refs.length; i++) {
    const ref = refs[i];
    const snap = snaps[i];
    if (!ref || !snap) continue;
    const ts = decodeTokenState(snap);
    if (!ts) continue;

    if (ts.owner !== user) {
      out.push({
        id: "R13_SPOOFED_TOKEN_ACCOUNT",
        kind: "spoofed-token-account",
        severity: "CRITICAL",
        address: ref.account,
        message:
          "This transaction operates on a token account that is not actually owned by you (possible account spoofing). Do not sign.",
      });
      continue;
    }

    const ata = await deriveAta(user, snap.owner, ref.mint);
    if (ata !== ref.account) {
      out.push({
        id: "R13_NON_CANONICAL_TOKEN_ACCOUNT",
        kind: "non-canonical-token-account",
        severity: "WARNING",
        address: ref.account,
        message:
          "This uses a non-standard token account (not your canonical associated token account). Verify it is yours.",
      });
    }
  }
  return out;
}
