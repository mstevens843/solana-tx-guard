import type { RiskReport } from "@txshield/core";
import { createElement as h } from "react";
import type { ReactElement } from "react";
import { verdictIcon } from "./icons.js";
import { severityTheme } from "./severityTheme.js";

export interface TxWarningProps {
  report: RiskReport | null;
}

/**
 * Drop-in Confirm-screen warning. Renders nothing when the verdict is NONE. Built with
 * createElement (no JSX) so it works in web and React Native without a transform. Uses an inline
 * SVG icon (no emoji) and themeable verdict colors (CSS vars `--txs-danger/--txs-warn/--txs-ok`).
 */
export function TxWarning({ report }: TxWarningProps): ReactElement | null {
  if (!report || report.action === "NONE") return null;
  const theme = severityTheme(report.action);
  return h(
    "div",
    {
      role: "alert",
      style: {
        border: `1px solid ${theme.color}`,
        color: theme.color,
        padding: 12,
        borderRadius: 8,
        fontSize: 14,
        display: "flex",
        flexDirection: "column",
        gap: 6,
      },
    },
    h(
      "div",
      { key: "head", style: { display: "flex", alignItems: "center", gap: 8, fontWeight: 600 } },
      verdictIcon(theme.tone, { size: 16, color: theme.color }),
      theme.label,
    ),
    ...report.warnings.map((w, i) =>
      h("div", { key: `${w.id}-${i}`, style: { fontSize: 13, color: "inherit" } }, w.message),
    ),
  );
}
