// A minimal, themeable, drop-in transaction-confirm modal. Self-contained: inline styles + inline
// SVG icons (no emoji, no CSS file, no Tailwind, no icon library) so it renders identically in any
// host app. Neutral dark by default; the accent + all colors are overridable via props or CSS
// variables (--txs-bg, --txs-surface, --txs-border, --txs-text, --txs-muted, --txs-accent, and the
// verdict colors --txs-ok/--txs-warn/--txs-danger). Built with createElement (no JSX transform).

import type { CSSProperties } from "react";
import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import type { RiskReport } from "@txshield/core";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckCircleIcon,
  ExternalLinkIcon,
  ShieldIcon,
  SpinnerIcon,
  XIcon,
  severityIcon,
  verdictIcon,
} from "./icons.js";
import { severityTheme } from "./severityTheme.js";

export interface TxGuardOutcome {
  status: "success" | "error" | "expired";
  message?: string;
  signature?: string;
  /** explorer URL for the signature (e.g. https://solscan.io/tx/<sig>). */
  explorerUrl?: string;
  /** when set (typically on an expired quote), renders a "rebuild & re-check" button. */
  onRebuild?: () => void;
  rebuildLabel?: string;
  rebuilding?: boolean;
}

export interface TxGuardModalProps {
  open: boolean;
  report: RiskReport | null;
  /** simulated balance preview lines (from useTxGuard / summarizeStateChanges). */
  stateChanges?: string[];
  title?: string;
  subtitle?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** disables the actions + shows a spinner on confirm (signing/sending in progress). */
  busy?: boolean;
  /** simulation still resolving — shows a subtle "checking on-chain…" hint. */
  loading?: boolean;
  /** allow confirming even on a BLOCK verdict (default false — confirm is disabled on BLOCK). */
  allowBlocked?: boolean;
  /** terminal result; when set, the actions are replaced by the outcome. */
  outcome?: TxGuardOutcome | null;
  accent?: string;
  theme?: "dark" | "light";
  onConfirm: () => void;
  onCancel: () => void;
}

function palette(theme: "dark" | "light", accent?: string) {
  const dark = {
    overlay: "rgba(4, 5, 8, 0.66)",
    bg: "#16181d",
    surface: "#1d2026",
    border: "#2b3038",
    text: "#e7e9ed",
    muted: "#9aa3af",
    accent: accent ?? "#5b8cff",
  };
  const light = {
    overlay: "rgba(15, 18, 25, 0.35)",
    bg: "#ffffff",
    surface: "#f5f6f8",
    border: "#e3e6ea",
    text: "#1b1f27",
    muted: "#5b6472",
    accent: accent ?? "#3b6cf0",
  };
  const b = theme === "light" ? light : dark;
  // CSS variables win over the theme fallback, so a host can theme without props.
  return {
    overlay: `var(--txs-overlay, ${b.overlay})`,
    bg: `var(--txs-bg, ${b.bg})`,
    surface: `var(--txs-surface, ${b.surface})`,
    border: `var(--txs-border, ${b.border})`,
    text: `var(--txs-text, ${b.text})`,
    muted: `var(--txs-muted, ${b.muted})`,
    accent: `var(--txs-accent, ${b.accent})`,
  };
}

const FONT =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, system-ui, sans-serif';

function findingColor(severity: "INFO" | "WARNING" | "CRITICAL"): string {
  if (severity === "CRITICAL") return "var(--txs-danger, #f0506e)";
  if (severity === "WARNING") return "var(--txs-warn, #f59e0b)";
  return "var(--txs-muted, #9aa3af)";
}

export function TxGuardModal(props: TxGuardModalProps): ReactElement | null {
  const {
    open,
    report,
    stateChanges = [],
    title = "Confirm transaction",
    subtitle,
    confirmLabel = "Sign & send",
    cancelLabel = "Cancel",
    busy = false,
    loading = false,
    allowBlocked = false,
    outcome = null,
    accent,
    theme = "dark",
    onConfirm,
    onCancel,
  } = props;

  if (!open) return null;
  const p = palette(theme, accent);
  const verdict = report ? severityTheme(report.action) : null;
  const isBlocked = report?.action === "BLOCK";

  const sections: ReactNode[] = [];

  // ---- header ----
  sections.push(
    h(
      "div",
      { key: "head", style: styles.head(p) },
      h(
        "div",
        { key: "l", style: { display: "flex", alignItems: "center", gap: 10, minWidth: 0 } },
        h("span", { key: "ic", style: { color: p.accent, display: "flex" } }, ShieldIcon({ size: 20, color: p.accent })),
        h(
          "div",
          { key: "t", style: { minWidth: 0 } },
          h("div", { key: "tt", style: { fontWeight: 600, fontSize: 15, color: p.text } }, title),
          subtitle
            ? h("div", { key: "st", style: { fontSize: 12.5, color: p.muted, marginTop: 2 } }, subtitle)
            : null,
        ),
      ),
      h(
        "button",
        { key: "x", type: "button", "aria-label": "Close", onClick: onCancel, style: styles.iconBtn(p) },
        XIcon({ size: 18, color: p.muted }),
      ),
    ),
  );

  // ---- body ----
  const body: ReactNode[] = [];

  // balance preview
  if (stateChanges.length > 0) {
    body.push(
      h(
        "div",
        { key: "preview", style: styles.panel(p) },
        h("div", { key: "lbl", style: styles.panelLabel(p) }, "What this does to your wallet"),
        h(
          "div",
          { key: "list", style: { display: "flex", flexDirection: "column", gap: 6 } },
          ...stateChanges.map((s, i) => {
            const warn = s.startsWith("Warning");
            const recv = s.startsWith("Receive");
            const color = warn ? "var(--txs-warn, #f59e0b)" : p.text;
            const icon = warn
              ? severityIcon("WARNING", { size: 15, color })
              : recv
                ? ArrowUpIcon({ size: 15, color: "var(--txs-ok, #34d399)" })
                : ArrowDownIcon({ size: 15, color: p.muted });
            return h(
              "div",
              { key: `${s}-${i}`, style: { display: "flex", alignItems: "center", gap: 8, fontSize: 14, color, fontWeight: warn ? 600 : 500 } },
              h("span", { key: "i", style: { display: "flex", flexShrink: 0 } }, icon),
              h("span", { key: "s" }, s),
            );
          }),
        ),
        report?.meta.atomicGuardRecommended
          ? h("div", { key: "guard", style: styles.guardNote(p) }, "With the atomic-guard attached, these outcomes are pinned on-chain — a divergent execution reverts.")
          : null,
      ),
    );
  }

  // verdict + findings (skip while showing an outcome to keep it focused)
  if (report && verdict && !outcome) {
    const metaLine = `version: ${report.meta.version ?? "?"} · lookup tables: ${report.meta.hasAddressLookups} · atomic-guard: ${report.meta.atomicGuardRecommended}`;
    body.push(
      h(
        "div",
        { key: "verdict", style: styles.panel(p) },
        h(
          "div",
          { key: "badge", style: styles.badge(verdict.color) },
          h("span", { key: "i", style: { display: "flex" } }, verdictIcon(verdict.tone, { size: 16, color: verdict.color })),
          h("span", { key: "t" }, `${report.action} — ${report.resultType}`),
        ),
        h("div", { key: "meta", style: { fontSize: 11.5, color: p.muted, marginTop: 8, fontFamily: "ui-monospace, monospace" } }, metaLine),
        report.warnings.length > 0
          ? h(
              "div",
              { key: "findings", style: { display: "flex", flexDirection: "column", gap: 10, marginTop: 12 } },
              ...report.warnings.map((w, i) => {
                const c = findingColor(w.severity);
                return h(
                  "div",
                  { key: `${w.id}-${i}`, style: { display: "flex", gap: 9, paddingLeft: 10, borderLeft: `2px solid ${c}` } },
                  h("span", { key: "i", style: { display: "flex", flexShrink: 0, marginTop: 1, color: c } }, severityIcon(w.severity, { size: 15, color: c })),
                  h(
                    "div",
                    { key: "t", style: { minWidth: 0 } },
                    h("div", { key: "k", style: { fontSize: 11, letterSpacing: "0.03em", textTransform: "uppercase", color: p.muted } }, `${w.severity} · ${w.kind}`),
                    h("div", { key: "m", style: { fontSize: 13.5, color: p.text, marginTop: 2, lineHeight: 1.45 } }, w.message),
                  ),
                );
              }),
            )
          : h("div", { key: "clean", style: { fontSize: 13, color: p.muted, marginTop: 10 } }, "No risks detected in this transaction."),
        loading
          ? h(
              "div",
              { key: "loading", style: { display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: p.muted, marginTop: 12 } },
              SpinnerIcon({ size: 14, color: p.muted }),
              "Simulating on-chain…",
            )
          : null,
      ),
    );
  }

  // outcome
  if (outcome) {
    body.push(renderOutcome(outcome, p));
  }

  sections.push(h("div", { key: "body", style: styles.body }, ...body));

  // ---- actions ----
  if (!outcome) {
    const confirmDisabled = busy || (isBlocked && !allowBlocked);
    sections.push(
      h(
        "div",
        { key: "actions", style: styles.actions },
        h(
          "button",
          {
            key: "confirm",
            type: "button",
            disabled: confirmDisabled,
            onClick: onConfirm,
            style: styles.primaryBtn(p, confirmDisabled),
          },
          busy
            ? h("span", { key: "b", style: { display: "inline-flex", alignItems: "center", gap: 8 } }, SpinnerIcon({ size: 15, color: "#fff" }), "Working…")
            : isBlocked && !allowBlocked
              ? "Blocked by TxShield"
              : confirmLabel,
        ),
        h("button", { key: "cancel", type: "button", onClick: onCancel, style: styles.ghostBtn(p) }, cancelLabel),
      ),
    );
  }

  return h(
    "div",
    { role: "dialog", "aria-modal": true, onClick: onCancel, style: styles.overlay(p) },
    h("style", { key: "kf" }, "@keyframes txs-spin{to{transform:rotate(360deg)}}"),
    h(
      "div",
      { key: "panel", onClick: stop, style: styles.panelOuter(p) },
      ...sections,
    ),
  );
}

function stop(e: { stopPropagation: () => void }): void {
  e.stopPropagation();
}

function renderOutcome(o: TxGuardOutcome, p: ReturnType<typeof palette>): ReactElement {
  const color =
    o.status === "success" ? "var(--txs-ok, #34d399)" : o.status === "expired" ? "var(--txs-warn, #f59e0b)" : "var(--txs-danger, #f0506e)";
  const icon = o.status === "success" ? CheckCircleIcon({ size: 18, color }) : severityIcon("WARNING", { size: 18, color });
  const defaultMsg =
    o.status === "success" ? "Transaction confirmed on-chain." : o.status === "expired" ? "The quote expired — rebuild a fresh, re-checked transaction." : "Transaction failed.";
  const kids: ReactNode[] = [
    h(
      "div",
      { key: "row", style: { display: "flex", alignItems: "center", gap: 9, color, fontWeight: 600, fontSize: 14 } },
      h("span", { key: "i", style: { display: "flex" } }, icon),
      h("span", { key: "m" }, o.message ?? defaultMsg),
    ),
  ];
  if (o.explorerUrl) {
    kids.push(
      h(
        "a",
        { key: "link", href: o.explorerUrl, target: "_blank", rel: "noreferrer", style: { display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, color: p.accent, marginTop: 8, textDecoration: "none" } },
        "View on explorer",
        ExternalLinkIcon({ size: 13, color: p.accent }),
      ),
    );
  }
  if (o.onRebuild) {
    kids.push(
      h(
        "button",
        { key: "rebuild", type: "button", disabled: o.rebuilding, onClick: o.onRebuild, style: { ...styles.primaryBtn(p, !!o.rebuilding), marginTop: 12 } },
        o.rebuilding
          ? h("span", { key: "b", style: { display: "inline-flex", alignItems: "center", gap: 8 } }, SpinnerIcon({ size: 15, color: "#fff" }), "Rebuilding…")
          : (o.rebuildLabel ?? "Rebuild & re-check"),
      ),
    );
  }
  return h("div", { key: "outcome", style: { ...styles.panel(p), borderColor: color } }, ...kids);
}

const styles = {
  overlay: (p: ReturnType<typeof palette>): CSSProperties => ({
    position: "fixed",
    inset: 0,
    background: p.overlay,
    backdropFilter: "blur(3px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    zIndex: 2147483000,
    fontFamily: FONT,
  }),
  panelOuter: (p: ReturnType<typeof palette>): CSSProperties => ({
    width: "min(440px, 100%)",
    maxHeight: "calc(100dvh - 32px)",
    overflowY: "auto",
    background: p.bg,
    border: `1px solid ${p.border}`,
    borderRadius: 16,
    boxShadow: "0 24px 70px rgba(0,0,0,0.5)",
    color: p.text,
  }),
  head: (p: ReturnType<typeof palette>): CSSProperties => ({
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    padding: "16px 18px",
    borderBottom: `1px solid ${p.border}`,
  }),
  iconBtn: (p: ReturnType<typeof palette>): CSSProperties => ({
    display: "flex",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    padding: 4,
    borderRadius: 8,
    color: p.muted,
  }),
  body: { padding: 16, display: "flex", flexDirection: "column", gap: 12 } as CSSProperties,
  panel: (p: ReturnType<typeof palette>): CSSProperties => ({
    background: p.surface,
    border: `1px solid ${p.border}`,
    borderRadius: 12,
    padding: 14,
  }),
  panelLabel: (p: ReturnType<typeof palette>): CSSProperties => ({
    fontSize: 11,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    color: p.muted,
    marginBottom: 10,
  }),
  badge: (color: string): CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "5px 11px",
    borderRadius: 999,
    border: `1px solid ${color}`,
    color,
    fontWeight: 700,
    fontSize: 13,
  }),
  guardNote: (p: ReturnType<typeof palette>): CSSProperties => ({
    fontSize: 12,
    color: p.muted,
    marginTop: 10,
    paddingTop: 9,
    borderTop: `1px dashed ${p.border}`,
    lineHeight: 1.45,
  }),
  actions: { display: "flex", gap: 10, padding: "0 16px 16px" } as CSSProperties,
  primaryBtn: (p: ReturnType<typeof palette>, disabled: boolean): CSSProperties => ({
    flex: 1,
    padding: "11px 14px",
    borderRadius: 10,
    border: "none",
    background: disabled ? p.border : p.accent,
    color: disabled ? p.muted : "#fff",
    fontWeight: 600,
    fontSize: 14,
    cursor: disabled ? "not-allowed" : "pointer",
    boxShadow: disabled ? "none" : `0 0 18px -4px ${p.accent}`,
  }),
  ghostBtn: (p: ReturnType<typeof palette>): CSSProperties => ({
    padding: "11px 16px",
    borderRadius: 10,
    border: `1px solid ${p.border}`,
    background: "transparent",
    color: p.text,
    fontWeight: 500,
    fontSize: 14,
    cursor: "pointer",
  }),
};
