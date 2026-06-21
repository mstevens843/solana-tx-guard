// R17 — TOCTOU / simulation-spoofing composite.  [STUB — TODO implement with @txshield/simulation]
// tell: fires on STATIC facts regardless of a clean simulation: (a) unknown/unverified program
//       with user-writable accounts it controls, AND (b) durable-nonce (R01) or partial-sign (R18)
//       deferred window, OR (c) instructions reading sim-discriminating sysvars (Clock/SlotHashes/
//       SlotHistory/RecentBlockhashes) combined with a value-moving CPI. NEVER suppress on a benign
//       sim; if static found an authority/owner transfer the sim under-reports, ELEVATE. Mitigation:
//       emit Lighthouse assertions (atomic-guard) pinning post-state; re-simulate at sign time.
import type { Rule } from "@txshield/core";

export const toctouRule: Rule = {
  id: "R17_TOCTOU_SIM_SPOOF",
  category: "anti-simulation",
  evaluate() {
    return [];
  },
};
