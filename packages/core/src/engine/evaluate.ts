// Runs every rule, unions findings, and adds intrinsic fail-closed gates. A rule that throws
// is treated as unsafe (WARNING) rather than silently dropped.

import type { AnalysisContext, Finding, Rule } from "../types.js";

export function evaluateRules(ctx: AnalysisContext, rules: ReadonlyArray<Rule>): Finding[] {
  const findings: Finding[] = [];

  // Intrinsic gate: ALT contents could not be resolved offline → sensitive targets unverifiable.
  if (ctx.tx.unresolvedLookupTables) {
    findings.push({
      id: "R14_ALT_UNRESOLVED",
      severity: "WARNING",
      kind: "unresolved-lookup-table",
      message:
        "This transaction hides accounts behind an address lookup table that could not be resolved offline. Sensitive targets can't be verified — enable an RPC resolver before trusting a clean verdict.",
    });
  }

  for (const rule of rules) {
    try {
      findings.push(...rule.evaluate(ctx));
    } catch {
      findings.push({
        id: rule.id,
        severity: "WARNING",
        kind: "rule-error",
        message: `A safety rule (${rule.id}) failed to evaluate; treated as unsafe.`,
      });
    }
  }

  return findings;
}
