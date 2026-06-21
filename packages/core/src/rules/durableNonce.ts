// R01 — Durable nonce (flagship). A transaction whose first/any instruction is
// System::AdvanceNonceAccount has NO expiry: it can be broadcast at any future time.
//
// Hardened per red-team:
//  - detect AdvanceNonceAccount at ANY index (not just 0) — the artifact the user signs is
//    what harms them, regardless of where the runtime requires the nonce advance to land.
//  - escalate to CRITICAL whenever the never-expiring tx also moves value OR exposes a
//    user-writable account to any non-core program (a held drain), not only when a value ix
//    is statically decodable.

import type { Finding, Rule } from "../types.js";
import { exposesUserWritableToOpaqueProgram, isValueOrAuthorityIx } from "./shared.js";

export const durableNonceRule: Rule = {
  id: "R01_DURABLE_NONCE",
  category: "replay/time-bomb",
  evaluate(ctx) {
    const hasNonce = ctx.tx.instructions.some(
      (ix) => ix.decoded.program === "system" && ix.decoded.kind === "AdvanceNonceAccount",
    );
    if (!hasNonce) return [];

    const heldDrain =
      ctx.tx.instructions.some(isValueOrAuthorityIx) || exposesUserWritableToOpaqueProgram(ctx);

    const finding: Finding = {
      id: "R01_DURABLE_NONCE",
      kind: "durable-nonce",
      severity: heldDrain ? "CRITICAL" : "WARNING",
      message: heldDrain
        ? "This transaction never expires (durable nonce) AND moves value or exposes your accounts. It can be submitted at any future time — even after you think it failed. Treat it as a held drain and do not sign."
        : "This transaction never expires (durable nonce) — it can be submitted at any future time. Only sign if you deliberately intend an offline or scheduled transaction.",
    };
    return [finding];
  },
};
