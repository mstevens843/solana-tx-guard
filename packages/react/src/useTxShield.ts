import { analyze } from "@txshield/core";
import type { AnalyzeOptions, RiskReport } from "@txshield/core";
import { useMemo } from "react";

/**
 * Analyze a transaction for a Confirm screen. The static verdict is synchronous (no network),
 * so there is no loading state for the base result. Pass null/undefined to clear.
 */
export function useTxShield(
  input: Uint8Array | string | null | undefined,
  options?: AnalyzeOptions,
): { report: RiskReport | null } {
  return useMemo(
    () => ({ report: input != null ? analyze(input, options) : null }),
    [input, options],
  );
}
