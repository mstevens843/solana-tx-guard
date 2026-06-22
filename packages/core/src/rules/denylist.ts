// R24 — Known-drainer denylist. A hard BLOCK when a transaction references any program / address /
// mint the host has flagged as confirmed-malicious (see @txshield/registry's DRAINER_*_DENYLIST).
// Empty by default — populate ONLY from verified incident reports; never an unverified list.

import type { Finding, Rule } from "../types.js";

export const denylistRule: Rule = {
  id: "R24_DENYLISTED",
  category: "denylist",
  evaluate(ctx) {
    const dl = ctx.options.denylists;
    if (!dl) return [];
    const out: Finding[] = [];
    const seen = new Set<string>();
    const flag = (kind: string, id: string, what: string) => {
      if (seen.has(id)) return;
      seen.add(id);
      out.push({
        id: "R24_DENYLISTED",
        severity: "CRITICAL",
        kind,
        address: id,
        message: `${what} is on the known-drainer denylist. Do NOT sign.`,
      });
    };

    if (dl.programs) {
      for (const ix of ctx.tx.instructions) {
        if (dl.programs.has(ix.programId)) {
          flag("denylisted-program", ix.programId, "A program in this transaction");
        }
      }
    }
    for (const a of ctx.tx.accounts) {
      if (dl.addresses?.has(a.address)) {
        flag("denylisted-address", a.address, "An address in this transaction");
      }
      if (dl.mints?.has(a.address)) {
        flag("denylisted-mint", a.address, "A token mint in this transaction");
      }
    }
    return out;
  },
};
