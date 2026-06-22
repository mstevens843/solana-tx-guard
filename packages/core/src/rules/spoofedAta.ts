// R13 — Lookalike mint. An address in the transaction that is byte-for-byte NOT a canonical mint
// but is confusingly similar to one (same first-6 + last-6 base58 chars — what a truncated wallet
// UI shows) is a likely spoof. (Full spoofed-token-account ownership verification is RPC-based and
// lives in @txshield/simulation's verifyTokenAccounts.)

import { CANONICAL_MINTS } from "../constants/programIds.js";
import type { Finding, Rule } from "../types.js";
import { isLookalike } from "../util/lookalike.js";

export const spoofedAtaRule: Rule = {
  id: "R13_LOOKALIKE_MINT",
  category: "account-confusion",
  evaluate(ctx) {
    const out: Finding[] = [];
    const seen = new Set<string>();
    for (const acc of ctx.tx.accounts) {
      const addr = acc.address;
      if (CANONICAL_MINTS.has(addr) || seen.has(addr)) continue;
      for (const canonical of CANONICAL_MINTS) {
        if (isLookalike(addr, canonical)) {
          seen.add(addr);
          out.push({
            id: "R13_LOOKALIKE_MINT",
            kind: "lookalike-mint",
            severity: "WARNING",
            address: addr,
            message:
              "An address in this transaction is suspiciously similar to a well-known token mint but is not it — a likely lookalike/spoof. Verify the exact mint.",
          });
          break;
        }
      }
    }
    return out;
  },
};
