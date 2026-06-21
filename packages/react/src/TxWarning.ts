import { createElement } from "react";
import type { ReactElement } from "react";
import type { RiskReport } from "@txshield/core";
import { severityTheme } from "./severityTheme.js";

export interface TxWarningProps {
  report: RiskReport | null;
}

/**
 * Drop-in Confirm-screen warning. Renders nothing when the verdict is NONE. Built with
 * createElement (no JSX) so it works in web and React Native without a transform.
 */
export function TxWarning({ report }: TxWarningProps): ReactElement | null {
  if (!report || report.action === "NONE") return null;
  const theme = severityTheme(report.action);
  return createElement(
    "div",
    {
      role: "alert",
      style: {
        border: `1px solid ${theme.color}`,
        color: theme.color,
        padding: 12,
        borderRadius: 8,
        fontSize: 14,
      },
    },
    createElement("strong", null, `${theme.icon} ${theme.label}`),
    ...report.warnings.map((w, i) =>
      createElement("div", { key: `${w.id}-${i}`, style: { marginTop: 6 } }, w.message),
    ),
  );
}
