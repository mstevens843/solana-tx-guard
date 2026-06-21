// R14b — A value-moving instruction whose recipient/delegate/destination is resolved from an
// address lookup table. ALT contents are mutable, so the target a user "sees" at sign time can
// differ from what executes. Sensitive targets should be static keys; ALT-sourced ones are unsafe.

import type { Finding, ResolvedAccount, Rule } from "../types.js";

const altSourced = (a?: ResolvedAccount): boolean => a != null && a.source !== "static";

export const sensitiveViaAltRule: Rule = {
  id: "R14B_SENSITIVE_VIA_ALT",
  category: "obfuscation",
  evaluate(ctx) {
    const out: Finding[] = [];
    for (const ix of ctx.tx.instructions) {
      const d = ix.decoded;
      let target: ResolvedAccount | undefined;

      if (d.program === "system" && (d.kind === "Transfer" || d.kind === "TransferWithSeed")) {
        if (ix.accounts[0]?.address === ctx.user) target = ix.accounts[1]; // recipient
      } else if (
        (d.program === "token" || d.program === "token-2022") &&
        (d.kind === "Approve" || d.kind === "ApproveChecked")
      ) {
        target = d.kind === "ApproveChecked" ? ix.accounts[2] : ix.accounts[1]; // delegate
      } else if (
        (d.program === "token" || d.program === "token-2022") &&
        (d.kind === "Transfer" || d.kind === "TransferChecked")
      ) {
        target = d.kind === "TransferChecked" ? ix.accounts[2] : ix.accounts[1]; // destination
      }

      if (altSourced(target)) {
        out.push({
          id: "R14B_SENSITIVE_VIA_ALT",
          kind: "sensitive-account-via-alt",
          severity: "WARNING",
          instructionIndex: ix.index,
          message:
            "The recipient or delegate of a value-moving instruction is hidden behind a mutable address lookup table, which can be changed after you sign. Treat as unsafe.",
        });
      }
    }
    return out;
  },
};
