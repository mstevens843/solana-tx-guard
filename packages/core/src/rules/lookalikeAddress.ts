// R25 — Lookalike address (address poisoning). A referenced address that is a base58 lookalike
// (same first-6 + last-6 chars) of the protected user's OWN address, or a known/allowlisted address,
// but is not it — the classic address-poisoning misdirection (victim copies a spoofed address from
// their history). Provide recognized addresses via AnalyzeOptions.knownAddresses; the user's own
// address is always included.

import type { Finding, Rule } from "../types.js";
import { isLookalike } from "../util/lookalike.js";

export const lookalikeAddressRule: Rule = {
  id: "R25_LOOKALIKE_ADDRESS",
  category: "account-confusion",
  evaluate(ctx) {
    const refs = new Set<string>([ctx.user]);
    for (const a of ctx.options.knownAddresses ?? []) refs.add(a);
    for (const a of ctx.options.allowedCounterparties ?? []) refs.add(a);

    const out: Finding[] = [];
    const seen = new Set<string>();
    for (const acc of ctx.tx.accounts) {
      const addr = acc.address;
      if (refs.has(addr) || seen.has(addr) || addr.startsWith("lookup:")) continue;
      for (const ref of refs) {
        if (isLookalike(addr, ref)) {
          seen.add(addr);
          out.push({
            id: "R25_LOOKALIKE_ADDRESS",
            kind: "lookalike-address",
            severity: "WARNING",
            address: addr,
            message:
              "An address here is suspiciously similar to your own address or one you know but is not it — a likely address-poisoning / lookalike. Verify the full address before signing.",
          });
          break;
        }
      }
    }
    return out;
  },
};
