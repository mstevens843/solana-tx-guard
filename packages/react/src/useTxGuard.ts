import { analyze } from "@txshield/core";
import type { AnalyzeOptions, RiskReport } from "@txshield/core";
import {
  type SimRpc,
  type TokenMeta,
  createSimulateFn,
  resolveLookupTables,
  simulateAndDiff,
  summarizeStateChanges,
} from "@txshield/simulation";
import { useEffect, useRef, useState } from "react";

export interface UseTxGuardOptions extends AnalyzeOptions {
  /**
   * RPC adapter (see @txshield/simulation `SimRpc`). When provided, runs the full pipeline:
   * resolve lookup tables → simulate → balance preview → analyze with the simulation context.
   * Omit for the static (offline, synchronous) verdict — same as `useTxShield`.
   */
  rpc?: SimRpc;
  /** mint → { symbol, decimals } for the human-readable balance preview. */
  tokenMeta?: TokenMeta;
}

export interface UseTxGuardResult {
  report: RiskReport | null;
  /** human-readable simulated balance changes (empty until simulation resolves). */
  stateChanges: string[];
  loading: boolean;
  error: string | null;
}

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function bytesToBase64(b: Uint8Array): string {
  let out = "";
  for (let i = 0; i < b.length; i += 3) {
    const a = b[i] as number;
    const c = i + 1 < b.length ? (b[i + 1] as number) : 0;
    const d = i + 2 < b.length ? (b[i + 2] as number) : 0;
    out += B64[a >> 2];
    out += B64[((a & 3) << 4) | (c >> 4)];
    out += i + 1 < b.length ? B64[((c & 15) << 2) | (d >> 6)] : "=";
    out += i + 2 < b.length ? B64[d & 63] : "=";
  }
  return out;
}

const EMPTY: UseTxGuardResult = { report: null, stateChanges: [], loading: false, error: null };

/**
 * Full-pipeline transaction guard for a Confirm screen. Returns the static verdict synchronously,
 * then (when `rpc` is set) enriches it: resolves lookup tables, simulates, computes the balance
 * preview (`stateChanges`), and re-runs analyze with the simulation context. Pass null to clear.
 */
export function useTxGuard(
  input: Uint8Array | string | null | undefined,
  options: UseTxGuardOptions = {},
): UseTxGuardResult {
  const optsRef = useRef(options);
  optsRef.current = options;

  const [state, setState] = useState<UseTxGuardResult>(EMPTY);

  // biome-ignore lint/correctness/useExhaustiveDependencies: options are read via a ref; the effect re-runs on the meaningful keys.
  useEffect(() => {
    if (input == null) {
      setState(EMPTY);
      return;
    }
    const { rpc, tokenMeta, ...analyzeOptions } = optsRef.current;

    let staticReport: RiskReport;
    try {
      staticReport = analyze(input, analyzeOptions);
    } catch (e) {
      setState({
        report: null,
        stateChanges: [],
        loading: false,
        error: e instanceof Error ? e.message : String(e),
      });
      return;
    }

    if (!rpc) {
      setState({
        report: staticReport,
        stateChanges: staticReport.expectedStateChanges,
        loading: false,
        error: null,
      });
      return;
    }

    setState({ report: staticReport, stateChanges: [], loading: true, error: null });
    let cancelled = false;
    (async () => {
      try {
        const base64 = typeof input === "string" ? input : bytesToBase64(input);
        const lookupTables = await resolveLookupTables(rpc, base64);
        const sim = await simulateAndDiff(base64, createSimulateFn(rpc), {
          user: analyzeOptions.user,
          capabilities: analyzeOptions.programCapabilities,
          lookupTables,
        });
        const stateChanges = summarizeStateChanges(sim.diff, sim.user, tokenMeta);
        const report = analyze(input, {
          ...analyzeOptions,
          lookupTables,
          simulation: { ok: sim.ok, findings: sim.findings, expectedStateChanges: stateChanges },
        });
        if (!cancelled) setState({ report, stateChanges, loading: false, error: null });
      } catch (e) {
        if (!cancelled) {
          setState({
            report: staticReport,
            stateChanges: staticReport.expectedStateChanges,
            loading: false,
            error: e instanceof Error ? e.message : String(e),
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [input, options.rpc, options.user]);

  return state;
}
