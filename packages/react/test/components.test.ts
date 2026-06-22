import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import type { RiskReport } from "@txshield/core";
import { ShieldIcon, severityTheme, TxGuardModal, TxWarning, verdictIcon } from "../src/index.js";

const report: RiskReport = {
  action: "WARN",
  resultType: "Warning",
  warnings: [{ id: "R01", severity: "WARNING", kind: "durable-nonce", message: "this transaction never expires" }],
  expectedStateChanges: ["Send 0.01 SOL", "Receive ~1.4 USDC"],
  validation: { classification: "warning", reason: "", features: [] },
  meta: {
    version: 0,
    failClosed: false,
    fullySigned: false,
    hasAddressLookups: false,
    atomicGuardRecommended: true,
  },
};

const typeOf = (el: ReactElement | null) => (el ? (el.type as string) : null);
const noop = () => {};

describe("@txshield/react components", () => {
  it("severityTheme maps actions to tone + color (no emoji)", () => {
    expect(severityTheme("BLOCK").tone).toBe("danger");
    expect(severityTheme("WARN").tone).toBe("warn");
    expect(severityTheme("NONE").tone).toBe("ok");
    expect(severityTheme("NONE").label).toBe("Looks OK");
  });

  it("TxWarning renders nothing on NONE, an alert otherwise", () => {
    expect(TxWarning({ report: { ...report, action: "NONE" } })).toBeNull();
    expect(typeOf(TxWarning({ report }))).toBe("div");
  });

  it("TxGuardModal renders nothing when closed, an element when open", () => {
    expect(TxGuardModal({ open: false, report, onConfirm: noop, onCancel: noop })).toBeNull();
    const el = TxGuardModal({
      open: true,
      report,
      stateChanges: report.expectedStateChanges,
      onConfirm: noop,
      onCancel: noop,
    });
    expect(typeOf(el)).toBe("div");
  });

  it("icons are svg elements (no emoji strings)", () => {
    expect(typeOf(ShieldIcon())).toBe("svg");
    expect(typeOf(verdictIcon("danger"))).toBe("svg");
    expect(typeOf(verdictIcon("ok"))).toBe("svg");
  });
});
