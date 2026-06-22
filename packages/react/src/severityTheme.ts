import type { Action } from "@txshield/core";

export type VerdictTone = "ok" | "warn" | "danger";

export interface SeverityStyle {
  label: string;
  tone: VerdictTone;
  /** semantic verdict color (not the brand accent) — green/amber/red, themeable via CSS vars. */
  color: string;
}

export function severityTheme(action: Action): SeverityStyle {
  switch (action) {
    case "BLOCK":
      return { label: "Dangerous", tone: "danger", color: "var(--txs-danger, #f0506e)" };
    case "WARN":
      return { label: "Caution", tone: "warn", color: "var(--txs-warn, #f59e0b)" };
    default:
      return { label: "Looks OK", tone: "ok", color: "var(--txs-ok, #34d399)" };
  }
}
