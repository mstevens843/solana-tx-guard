// R06 — SPL Token / Token-2022 Approve / ApproveChecked. A delegate approval lets another
// account move the user's tokens with no further signature. Per red-team: the STANDING grant
// is the risk, not the snapshot amount (a small/zero approval on a soon-funded ATA still
// drains future inflows), so any approval to a non-allowlisted delegate is dangerous;
// unlimited (u64::MAX) is critical.

import type { Finding, Rule } from "../types.js";
import { TOKEN_PROGRAMS } from "../constants/programIds.js";

const U64_MAX = "18446744073709551615";

export const approveDelegateRule: Rule = {
  id: "R06_TOKEN_APPROVE_DELEGATE",
  category: "delegate-allowance",
  evaluate(ctx) {
    const out: Finding[] = [];
    for (const ix of ctx.tx.instructions) {
      if (!TOKEN_PROGRAMS.has(ix.programId)) continue;
      const checked = ix.decoded.kind === "ApproveChecked";
      if (ix.decoded.kind !== "Approve" && !checked) continue;

      // Approve accounts: [source, delegate, owner]; ApproveChecked: [source, mint, delegate, owner]
      const owner = checked ? ix.accounts[3] : ix.accounts[2];
      if (!owner || owner.address !== ctx.user) continue;
      const delegate = checked ? ix.accounts[2] : ix.accounts[1];
      if (delegate && ctx.options.allowedCounterparties?.has(delegate.address)) continue;

      const amount = ix.decoded.fields?.amount as string | undefined;
      const unlimited = amount === U64_MAX;
      out.push({
        id: "R06_TOKEN_APPROVE_DELEGATE",
        kind: "delegate-approval",
        severity: unlimited ? "CRITICAL" : "WARNING",
        instructionIndex: ix.index,
        ...(delegate ? { address: delegate.address } : {}),
        message: unlimited
          ? "This grants UNLIMITED permission for another account to move your tokens at any time. Do not sign unless you trust this app completely."
          : "This grants another account a standing delegate over your tokens — it can move them later without asking you again, including funds you receive afterward.",
      });
    }
    return out;
  },
};
