// Pluggable rule registry. A Rule is { id, category, evaluate(ctx) => Finding[] }.
// createRuleSet de-dupes by id so consumers can compose the built-in pack with their own.

import type { Rule } from "../types.js";

export function createRuleSet(...groups: ReadonlyArray<readonly Rule[]>): Rule[] {
  const seen = new Set<string>();
  const out: Rule[] = [];
  for (const group of groups) {
    for (const rule of group) {
      if (seen.has(rule.id)) continue;
      seen.add(rule.id);
      out.push(rule);
    }
  }
  return out;
}
