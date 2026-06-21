import { analyze } from "@txshield/core";
import { describe, expect, it } from "vitest";
import { EXAMPLES } from "../src/buildExamples.js";

describe("playground examples produce their expected verdict", () => {
  for (const e of EXAMPLES) {
    it(`${e.label} → ${e.expectAction}`, () => {
      const report = analyze(e.base64);
      expect(report.action).toBe(e.expectAction);
      if (e.expectKind) {
        expect(report.warnings.some((w) => w.kind === e.expectKind)).toBe(true);
      }
    });
  }
});
