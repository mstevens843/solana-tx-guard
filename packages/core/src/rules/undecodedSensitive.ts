// R23 — Fail closed on an unrecognized instruction to a value/authority-capable program
// (System / SPL Token / Token-2022 / Stake / Vote / upgradeable loader) that touches a
// user-writable account. A decoder-vs-runtime divergence on these programs is a silent drain,
// so an undecoded sensitive ix is treated as dangerous rather than "no finding".

import type { Finding, Rule } from "../types.js";

export const undecodedSensitiveRule: Rule = {
  id: "R23_UNDECODED_SENSITIVE_IX",
  category: "fail-closed",
  evaluate(ctx) {
    const out: Finding[] = [];
    for (const ix of ctx.tx.instructions) {
      if (!ix.undecodedSensitive) continue;
      const touchesUserWritable = ix.accounts.some((a) => a.address === ctx.user && a.writable);
      out.push({
        id: "R23_UNDECODED_SENSITIVE_IX",
        kind: "undecoded-sensitive-ix",
        severity: touchesUserWritable ? "CRITICAL" : "WARNING",
        instructionIndex: ix.index,
        address: ix.programId,
        message:
          "This transaction calls a sensitive program with an instruction TxShield could not fully decode. It is treated as unsafe (fail-closed) rather than assumed benign.",
      });
    }
    return out;
  },
};
