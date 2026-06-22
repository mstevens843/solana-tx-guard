// Self-contained inline SVG icons (no emoji, no icon-library dependency) so the shipped components
// render the same in any host app. Built with createElement (no JSX transform needed), matching
// TxWarning. Paths are the standard 24x24 stroke set.

import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { VerdictTone } from "./severityTheme.js";

export interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

function svg(props: IconProps, children: ReactElement[]): ReactElement {
  const { size = 16, color = "currentColor", strokeWidth = 2 } = props;
  return h(
    "svg",
    {
      width: size,
      height: size,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: color,
      strokeWidth,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": true,
    },
    ...children,
  );
}

export function ShieldIcon(p: IconProps = {}): ReactElement {
  return svg(p, [h("path", { key: "p", d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" })]);
}

export function AlertTriangleIcon(p: IconProps = {}): ReactElement {
  return svg(p, [
    h("path", {
      key: "p",
      d: "M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z",
    }),
    h("line", { key: "l1", x1: 12, y1: 9, x2: 12, y2: 13 }),
    h("line", { key: "l2", x1: 12, y1: 17, x2: 12.01, y2: 17 }),
  ]);
}

export function CheckCircleIcon(p: IconProps = {}): ReactElement {
  return svg(p, [
    h("path", { key: "p", d: "M22 11.08V12a10 10 0 1 1-5.93-9.14" }),
    h("polyline", { key: "pl", points: "22 4 12 14.01 9 11.01" }),
  ]);
}

export function InfoIcon(p: IconProps = {}): ReactElement {
  return svg(p, [
    h("circle", { key: "c", cx: 12, cy: 12, r: 10 }),
    h("line", { key: "l1", x1: 12, y1: 16, x2: 12, y2: 12 }),
    h("line", { key: "l2", x1: 12, y1: 8, x2: 12.01, y2: 8 }),
  ]);
}

export function XIcon(p: IconProps = {}): ReactElement {
  return svg(p, [
    h("line", { key: "l1", x1: 18, y1: 6, x2: 6, y2: 18 }),
    h("line", { key: "l2", x1: 6, y1: 6, x2: 18, y2: 18 }),
  ]);
}

export function ExternalLinkIcon(p: IconProps = {}): ReactElement {
  return svg(p, [
    h("path", { key: "p", d: "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" }),
    h("polyline", { key: "pl", points: "15 3 21 3 21 9" }),
    h("line", { key: "l", x1: 10, y1: 14, x2: 21, y2: 3 }),
  ]);
}

export function ArrowDownIcon(p: IconProps = {}): ReactElement {
  return svg(p, [
    h("line", { key: "l", x1: 12, y1: 5, x2: 12, y2: 19 }),
    h("polyline", { key: "pl", points: "19 12 12 19 5 12" }),
  ]);
}

export function ArrowUpIcon(p: IconProps = {}): ReactElement {
  return svg(p, [
    h("line", { key: "l", x1: 12, y1: 19, x2: 12, y2: 5 }),
    h("polyline", { key: "pl", points: "5 12 12 5 19 12" }),
  ]);
}

export function SpinnerIcon(p: IconProps = {}): ReactElement {
  const { size = 16, color = "currentColor" } = p;
  return h(
    "svg",
    {
      width: size,
      height: size,
      viewBox: "0 0 24 24",
      fill: "none",
      "aria-hidden": true,
      style: { animation: "txs-spin 0.7s linear infinite" },
    },
    h("circle", {
      key: "c",
      cx: 12,
      cy: 12,
      r: 9,
      stroke: color,
      strokeOpacity: 0.25,
      strokeWidth: 3,
    }),
    h("path", {
      key: "p",
      d: "M21 12a9 9 0 0 0-9-9",
      stroke: color,
      strokeWidth: 3,
      strokeLinecap: "round",
    }),
  );
}

/** The icon for a verdict tone (ok → check, warn/danger → triangle). */
export function verdictIcon(tone: VerdictTone, props: IconProps = {}): ReactElement {
  return tone === "ok" ? CheckCircleIcon(props) : AlertTriangleIcon(props);
}

/** The icon for a finding severity. */
export function severityIcon(
  severity: "INFO" | "WARNING" | "CRITICAL",
  props: IconProps = {},
): ReactElement {
  return severity === "INFO" ? InfoIcon(props) : AlertTriangleIcon(props);
}
