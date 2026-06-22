// Shared predicates used across the danger-pattern rules.

import { CORE_VALUE_CAPABLE_PROGRAMS, INERT_PROGRAMS } from "../constants/programIds.js";
import type { AnalysisContext, DecodedInstruction } from "../types.js";

export function ixTouchesUserWritable(ix: DecodedInstruction, user: string): boolean {
  return ix.accounts.some((a) => a.address === user && a.writable);
}

/** A top-level instruction that, on its face, moves value or changes authority. */
export function isValueOrAuthorityIx(ix: DecodedInstruction): boolean {
  if (ix.undecodedSensitive) return true;
  const d = ix.decoded;
  if (d.program === "system") {
    return (
      d.kind === "Transfer" ||
      d.kind === "TransferWithSeed" ||
      d.kind === "Assign" ||
      d.kind === "AssignWithSeed" ||
      d.kind === "WithdrawNonceAccount" ||
      d.kind === "AuthorizeNonceAccount" ||
      d.kind === "Allocate" ||
      d.kind === "AllocateWithSeed"
    );
  }
  if (d.program === "token" || d.program === "token-2022") {
    return (
      d.kind === "Transfer" ||
      d.kind === "TransferChecked" ||
      d.kind === "Approve" ||
      d.kind === "ApproveChecked" ||
      d.kind === "SetAuthority" ||
      d.kind === "CloseAccount" ||
      d.kind === "Burn" ||
      d.kind === "BurnChecked" ||
      d.kind === "MintTo" ||
      d.kind === "MintToChecked"
    );
  }
  return false;
}

/**
 * Any non-inert program holding a writable user account is an exfiltration surface: even an
 * allowlisted program can CPI arbitrarily, so this is the seam that mandatory simulation +
 * atomic-guard ultimately close.
 */
export function exposesUserWritableToOpaqueProgram(ctx: AnalysisContext): boolean {
  return ctx.tx.instructions.some(
    (ix) =>
      !INERT_PROGRAMS.has(ix.programId) &&
      !CORE_VALUE_CAPABLE_PROGRAMS.has(ix.programId) &&
      ixTouchesUserWritable(ix, ctx.user),
  );
}

export function userIsSigner(ctx: AnalysisContext): boolean {
  return ctx.tx.accounts.some((a) => a.address === ctx.user && a.signer);
}
