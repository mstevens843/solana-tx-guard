// Assembles findings into a RiskReport mirroring Blowfish (`action`) + Blockaid (`resultType`).
// Severity → action: CRITICAL ⇒ BLOCK, WARNING ⇒ WARN, INFO/none ⇒ NONE.

import type { Action, Finding, MessageVersion, ResultType, RiskReport, Severity } from "../types.js";

const RANK: Record<Severity, number> = { INFO: 0, WARNING: 1, CRITICAL: 2 };

export interface ReportMeta {
  failClosed: boolean;
  fullySigned: boolean;
  hasAddressLookups: boolean;
  atomicGuardRecommended: boolean;
  error?: string;
}

export function buildReport(
  version: MessageVersion | null,
  findings: ReadonlyArray<Finding>,
  meta: ReportMeta,
): RiskReport {
  const sorted = [...findings].sort((a, b) => RANK[b.severity] - RANK[a.severity]);
  let sev: Severity = "INFO";
  for (const f of findings) if (RANK[f.severity] > RANK[sev]) sev = f.severity;

  const action: Action = sev === "CRITICAL" ? "BLOCK" : sev === "WARNING" ? "WARN" : "NONE";
  const resultType: ResultType = meta.error
    ? "Error"
    : sev === "CRITICAL"
      ? "Malicious"
      : sev === "WARNING"
        ? "Warning"
        : "Benign";

  const top = sorted[0];

  const report: RiskReport = {
    action,
    resultType,
    warnings: sorted,
    expectedStateChanges: sorted.filter((f) => f.severity !== "INFO").map((f) => f.message),
    validation: {
      classification: resultType,
      reason: top?.message ?? "No risks detected by static analysis.",
      features: [...new Set(sorted.map((f) => f.kind))],
    },
    meta: {
      version,
      failClosed: meta.failClosed,
      fullySigned: meta.fullySigned,
      hasAddressLookups: meta.hasAddressLookups,
      atomicGuardRecommended: meta.atomicGuardRecommended,
    },
  };
  if (meta.error !== undefined) report.error = meta.error;
  return report;
}
