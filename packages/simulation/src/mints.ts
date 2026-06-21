// R09–R13 (full) — read Token-2022 mint extension TLV via RPC and emit additive findings for
// the dangerous extensions. Pair with core's offline guard (R09): once this has run, pass
// `mintsInspected: true` to analyze() so the offline WARN is suppressed.

import { bytes, programIds } from "@txshield/core";
import type { Finding } from "@txshield/core";
import type { SimRpc } from "./types.js";

// ExtensionType (subset we score). Mint extension TLV begins after the 165-byte padded base
// mint + a 1-byte account-type tag → offset 166.
const EXT_TLV_START = 166;
const EXT = {
  TransferFeeConfig: 1,
  MintCloseAuthority: 3,
  DefaultAccountState: 6,
  PermanentDelegate: 12,
  TransferHook: 14,
} as const;

function u16(b: Uint8Array, off: number): number {
  return (b[off] ?? 0) | ((b[off + 1] ?? 0) << 8);
}

export async function inspectToken2022Mints(rpc: SimRpc, mints: string[]): Promise<Finding[]> {
  if (mints.length === 0) return [];
  const out: Finding[] = [];
  const snaps = await rpc.getAccounts(mints);

  snaps.forEach((snap, i) => {
    const mint = mints[i]!;
    if (!snap || snap.owner !== programIds.TOKEN_2022_PROGRAM || !snap.dataBase64) return;
    const b = bytes.fromBase64(snap.dataBase64);
    if (b.length <= EXT_TLV_START) return;

    let off = EXT_TLV_START;
    while (off + 4 <= b.length) {
      const type = u16(b, off);
      const len = u16(b, off + 2);
      off += 4;
      if (type === 0) break; // Uninitialized → end of TLV
      switch (type) {
        case EXT.PermanentDelegate:
          out.push({
            id: "R09_T22_PERMANENT_DELEGATE",
            severity: "CRITICAL",
            kind: "token2022-permanent-delegate",
            address: mint,
            message:
              "This token has a permanent delegate — its issuer can move it out of any holder's wallet with no approval.",
          });
          break;
        case EXT.TransferHook:
          out.push({
            id: "R10_T22_TRANSFER_HOOK",
            severity: "WARNING",
            kind: "token2022-transfer-hook",
            address: mint,
            message: "This token runs custom code on every transfer (a transfer hook).",
          });
          break;
        case EXT.DefaultAccountState:
          out.push({
            id: "R11_T22_DEFAULT_FROZEN",
            severity: "WARNING",
            kind: "token2022-default-account-state",
            address: mint,
            message: "New accounts for this token may start frozen — you could be unable to sell.",
          });
          break;
        case EXT.TransferFeeConfig:
          out.push({
            id: "R12_T22_TRANSFER_FEE",
            severity: "WARNING",
            kind: "token2022-transfer-fee",
            address: mint,
            message: "This token charges a fee on every transfer.",
          });
          break;
        default:
          break;
      }
      off += len;
    }
  });

  return out;
}
