// R22 — A program holding write access to the user's account is an exfiltration surface
// because it can CPI arbitrarily (the drain lives in an inner instruction the top-level
// decoder never sees). Unknown programs → WARNING; allowlisted programs → INFO with a nudge
// to enable simulation + atomic-guard for a hard, on-chain guarantee. Allowlist is a label,
// never a CPI-safety grant (see SECURITY.md).

import {
  ASSOCIATED_TOKEN_PROGRAM,
  CORE_VALUE_CAPABLE_PROGRAMS,
  INERT_PROGRAMS,
} from "../constants/programIds.js";
import type { Finding, Rule } from "../types.js";
import { ixTouchesUserWritable } from "./shared.js";

export const unknownProgramWritableRule: Rule = {
  id: "R22_UNKNOWN_PROGRAM_WRITABLE",
  category: "opaque-cpi-surface",
  evaluate(ctx) {
    const out: Finding[] = [];
    const allow = ctx.options.allowedPrograms;
    for (const ix of ctx.tx.instructions) {
      const pid = ix.programId;
      if (
        INERT_PROGRAMS.has(pid) ||
        CORE_VALUE_CAPABLE_PROGRAMS.has(pid) ||
        pid === ASSOCIATED_TOKEN_PROGRAM
      ) {
        continue;
      }
      if (!ixTouchesUserWritable(ix, ctx.user)) continue;

      const known = allow?.has(pid) ?? false;
      out.push({
        id: "R22_UNKNOWN_PROGRAM_WRITABLE",
        kind: known ? "opaque-cpi-surface" : "unknown-program-writable",
        severity: known ? "INFO" : "WARNING",
        instructionIndex: ix.index,
        address: pid,
        message: known
          ? "A known program is given write access to your account. Its internal actions cannot be fully verified offline — enable simulation + atomic-guard for an on-chain guarantee."
          : "An unknown program is given write access to your account and could move your funds. Do not sign unless you trust this app.",
      });
    }
    return out;
  },
};
