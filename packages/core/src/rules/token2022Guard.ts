// R09 (offline) — When a transaction involves the Token-2022 program, its mint extensions
// (permanent delegate, transfer hook, default-frozen, transfer fee) can only be read with an
// RPC call. Offline we cannot clear them, so we WARN — never Benign. The host suppresses this
// by passing `mintsInspected: true` after running @txshield/simulation's inspectToken2022Mints.

import type { Finding, Rule } from "../types.js";
import { TOKEN_2022_PROGRAM } from "../constants/programIds.js";

export const token2022GuardRule: Rule = {
  id: "R09_T22_UNINSPECTED",
  category: "token2022-extension",
  evaluate(ctx) {
    if (ctx.options.mintsInspected) return [];
    const usesT22 = ctx.tx.instructions.some((ix) => ix.programId === TOKEN_2022_PROGRAM);
    if (!usesT22) return [];
    return [
      {
        id: "R09_T22_UNINSPECTED",
        kind: "token-2022-extensions-uninspected",
        severity: "WARNING",
        message:
          "This involves a Token-2022 token whose extensions (e.g. permanent delegate, transfer hook) were not inspected offline. Enable an RPC mint check before trusting it.",
      },
    ];
  },
};
