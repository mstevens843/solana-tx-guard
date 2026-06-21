import type { Action } from "@txshield/core";

export interface SeverityStyle {
  label: string;
  icon: string;
  color: string;
}

export function severityTheme(action: Action): SeverityStyle {
  switch (action) {
    case "BLOCK":
      return { label: "Dangerous", icon: "🔴", color: "#dc2626" };
    case "WARN":
      return { label: "Caution", icon: "🟠", color: "#d97706" };
    default:
      return { label: "Looks OK", icon: "🟢", color: "#16a34a" };
  }
}
