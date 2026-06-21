// Inner-CPI drain detection — the answer to the red-team's #1 critical. The worst drains hide
// in INNER instructions of an allowlisted/lookalike program that top-level static decode never
// sees. Simulation's innerInstructions reveal the real CPI tree, so we decode it and flag the
// UNAMBIGUOUS authority/ownership grabs that a legitimate swap never performs via CPI.
//
// We deliberately do NOT flag inner value transfers (SOL/token OUT) — those are normal for swaps;
// the balance diff (`elevate`) + the atomic-guard cover the value side. Here we catch the
// authority/ownership changes that are never part of a legitimate swap CPI.

import { bytes, decodeInstruction, programIds } from "@txshield/core";
import type { Finding, ProgramCapability } from "@txshield/core";
import type { NormalizedInnerIx } from "./types.js";

/** Map a decoded inner instruction to the capability it exercises (if any sensitive op). */
function opOf(
  program: string,
  kind: string | undefined,
  accounts: string[],
): keyof ProgramCapability | undefined {
  if (program === "system") {
    if (kind === "Transfer" || kind === "TransferWithSeed") return "transferSol";
    if (kind === "Assign" || kind === "AssignWithSeed") return "assign";
    return undefined;
  }
  if (program === "token" || program === "token-2022") {
    if (kind === "Transfer" || kind === "TransferChecked") return "transferToken";
    if (kind === "SetAuthority") return "setAuthority";
    if (kind === "Approve" || kind === "ApproveChecked") return "approve";
    if (kind === "CloseAccount") {
      const dest = accounts[1];
      const owner = accounts[2];
      return dest && owner && dest !== owner ? "closeToNonOwner" : undefined;
    }
    return undefined;
  }
  if (program === "loader-upgradeable") {
    if (kind === "Upgrade") return "upgrade";
    if (kind === "SetAuthority" || kind === "SetAuthorityChecked") return "setAuthority";
    return undefined;
  }
  return undefined;
}

export function analyzeCpi(
  inner: NormalizedInnerIx[],
  user: string,
  capabilities?: ReadonlyMap<string, ProgramCapability>,
): Finding[] {
  const out: Finding[] = [];
  const isUser = (a: string | undefined) => a === user;
  const prefix = "Hidden in an inner instruction you don't see at the top level: ";

  for (const ix of inner) {
    const { decoded } = decodeInstruction(ix.programId, bytes.fromBase64(ix.dataBase64));
    const k = decoded.kind;
    const a = ix.accounts;

    if (decoded.program === "token" || decoded.program === "token-2022") {
      if (k === "SetAuthority" && isUser(a[1])) {
        const at = decoded.fields?.authorityType as number | undefined;
        out.push({
          id: "R17_CPI_SET_AUTHORITY",
          kind: "cpi-hidden-set-authority",
          severity: at === 2 ? "CRITICAL" : "WARNING",
          address: a[0],
          message:
            at === 2
              ? `${prefix}ownership of your token account is being transferred to someone else.`
              : `${prefix}an authority on your token account is being changed.`,
        });
      } else if (k === "Approve" || k === "ApproveChecked") {
        const owner = k === "ApproveChecked" ? a[3] : a[2];
        if (isUser(owner)) {
          out.push({
            id: "R17_CPI_APPROVE",
            kind: "cpi-hidden-approve",
            severity: "CRITICAL",
            address: k === "ApproveChecked" ? a[2] : a[1],
            message: `${prefix}a delegate is being granted control of your tokens.`,
          });
        }
      } else if (k === "CloseAccount") {
        const owner = a[2];
        const dest = a[1];
        if (isUser(owner) && dest && !isUser(dest)) {
          out.push({
            id: "R17_CPI_CLOSE",
            kind: "cpi-hidden-close",
            severity: "WARNING",
            address: dest,
            message: `${prefix}one of your token accounts is being closed and swept to another address.`,
          });
        }
      }
    } else if (decoded.program === "system") {
      if ((k === "Assign" || k === "AssignWithSeed") && isUser(a[0])) {
        out.push({
          id: "R17_CPI_ASSIGN",
          kind: "cpi-hidden-assign",
          severity: "CRITICAL",
          address: a[0],
          message: `${prefix}ownership of one of your accounts is being handed to another program.`,
        });
      } else if (k === "AuthorizeNonceAccount" && a.some(isUser)) {
        out.push({
          id: "R17_CPI_NONCE_AUTHORITY",
          kind: "cpi-hidden-nonce-authority",
          severity: "CRITICAL",
          message: `${prefix}the authority of your durable-nonce account is being changed.`,
        });
      }
    } else if (ix.programId === programIds.STAKE_PROGRAM && k === "Authorize" && a.some(isUser)) {
      out.push({
        id: "R17_CPI_STAKE_AUTHORIZE",
        kind: "cpi-hidden-stake-authorize",
        severity: "CRITICAL",
        message: `${prefix}an authority on your stake account is being changed.`,
      });
    } else if (
      ix.programId === programIds.BPF_LOADER_UPGRADEABLE &&
      (k === "SetAuthority" || k === "SetAuthorityChecked") &&
      a.some(isUser)
    ) {
      out.push({
        id: "R17_CPI_PROGRAM_AUTHORITY",
        kind: "cpi-hidden-program-authority",
        severity: "CRITICAL",
        message: `${prefix}upgrade authority of a program is being transferred.`,
      });
    }

    // Capability check: a known/allowlisted program performing an inner op beyond its declared role.
    const op = opOf(decoded.program, k, a);
    if (op && capabilities && ix.invokingProgram) {
      const cap = capabilities.get(ix.invokingProgram);
      if (cap && cap[op] !== true) {
        out.push({
          id: "R22_CPI_CAPABILITY",
          kind: "cpi-capability-violation",
          severity: "CRITICAL",
          address: ix.invokingProgram,
          message: `A program performed an inner "${op}" operation it is not authorized to do — likely compromised or malicious.`,
        });
      }
    }
  }
  return out;
}
