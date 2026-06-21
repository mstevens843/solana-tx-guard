// R08 — Split-drain via multiple System transfers. A single outgoing SOL transfer is normal;
// several to distinct non-allowlisted recipients in one transaction is the wallet-draining
// pattern. Near-full *single* transfers need a balance and are caught by simulation (R17).

import type { Finding, Rule } from "../types.js";

export const solDrainRule: Rule = {
  id: "R08_FULL_SOL_TRANSFER",
  category: "sweep",
  evaluate(ctx) {
    const recipients = new Set<string>();
    let total = 0n;
    for (const ix of ctx.tx.instructions) {
      if (ix.decoded.program !== "system") continue;
      if (ix.decoded.kind !== "Transfer" && ix.decoded.kind !== "TransferWithSeed") continue;
      const from = ix.accounts[0];
      const to = ix.accounts[1];
      if (!from || from.address !== ctx.user || !to) continue;
      if (ctx.options.allowedCounterparties?.has(to.address)) continue;
      recipients.add(to.address);
      const lamports = ix.decoded.fields?.lamports as string | undefined;
      if (lamports) total += BigInt(lamports);
    }
    if (recipients.size < 2) return [];
    return [
      {
        id: "R08_FULL_SOL_TRANSFER",
        kind: "sol-split-transfer",
        severity: "WARNING",
        message: `This sends SOL to ${recipients.size} different addresses in one transaction (${total} lamports total) — a pattern used to drain a wallet in pieces.`,
      },
    ];
  },
};
