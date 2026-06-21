// R09–R13 — Token-2022 risky mint extensions.  [STUB — TODO implement; requires RPC mint read]
// tell: read mint TLV via getExtensionData/ExtensionType:
//   - PermanentDelegate (type 12, non-renounced)            → DANGER (can move any holder's tokens)
//   - TransferHook (type 14, unknown hook program)          → DANGER (arbitrary code per transfer)
//   - DefaultAccountState=Frozen (type 6) + freeze authority → WARN  (honeypot / unsellable)
//   - TransferFee near 100% (type 1)                        → WARN  (sell trap)
// Offline (no RPC): emit WARN "token-2022-extensions-uninspected" — NEVER Benign.
import type { Rule } from "@txshield/core";

export const token2022ExtensionsRule: Rule = {
  id: "R09_T22_RISKY_EXTENSIONS",
  category: "token2022-extension",
  evaluate() {
    return [];
  },
};
