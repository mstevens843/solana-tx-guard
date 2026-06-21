import type { AnalysisContext, AnalyzeOptions, DecodedTransaction } from "../types.js";

export function buildContext(tx: DecodedTransaction, options: AnalyzeOptions): AnalysisContext {
  return { tx, user: options.user ?? tx.feePayer, options };
}
