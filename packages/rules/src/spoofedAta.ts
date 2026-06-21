// R13 — Spoofed token account / lookalike mint (account confusion).  [STUB — TODO implement]
// tell: never trust a dApp/RPC-supplied "user token account". Authority/close/approve checks
//       must fire on ANY token account whose authority is the user signer (ATA or not). For
//       lookalike mints, match by full 32-byte equality against a trusted mint registry — NEVER
//       by symbol/metadata string.
import type { Rule } from "@txshield/core";

export const spoofedAtaRule: Rule = {
  id: "R13_SPOOFED_ATA_LOOKALIKE_MINT",
  category: "account-confusion",
  evaluate() {
    return [];
  },
};
