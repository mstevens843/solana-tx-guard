// R17 reconciliation. Turns the simulation diff into ADDITIVE findings. These are merged with
// the static findings and may only raise the verdict — a benign simulation never clears a
// static finding (that posture lives in core's report assembly + the caller never subtracts).

import type { Finding } from "@txshield/core";
import type { AccountDiff } from "./types.js";

export function elevate(diff: AccountDiff[], user: string): Finding[] {
  const out: Finding[] = [];
  for (const d of diff) {
    // Native SOL leaving the user's wallet.
    if (d.address === user && d.preLamports != null && d.postLamports != null && d.postLamports < d.preLamports) {
      out.push({
        id: "R17_SIM_SOL_OUTFLOW",
        severity: "WARNING",
        kind: "sim-sol-outflow",
        address: d.address,
        message: `Simulation shows ${d.preLamports - d.postLamports} lamports leaving your wallet.`,
      });
    }
    // Account owner reassignment (the Assign drain), observed in simulation.
    if (d.preOwner && d.postOwner && d.preOwner !== d.postOwner && d.address === user) {
      out.push({
        id: "R17_SIM_OWNER_CHANGE",
        severity: "CRITICAL",
        kind: "sim-owner-reassignment",
        address: d.address,
        message: "Simulation shows the owner of your account changing — an ownership takeover.",
      });
    }
    // Token account state changes on accounts the user owns.
    if (d.preToken && d.postToken && d.preToken.owner === user) {
      if (d.postToken.owner !== user) {
        out.push({
          id: "R17_SIM_TOKEN_OWNER_CHANGE",
          severity: "CRITICAL",
          kind: "sim-token-account-takeover",
          address: d.address,
          message: "Simulation shows ownership of your token account being transferred away.",
        });
      }
      if (d.postToken.amount < d.preToken.amount) {
        out.push({
          id: "R17_SIM_TOKEN_OUTFLOW",
          severity: "WARNING",
          kind: "sim-token-outflow",
          address: d.address,
          message: `Simulation shows ${d.preToken.amount - d.postToken.amount} tokens leaving your account.`,
        });
      }
      if (d.postToken.delegate && d.postToken.delegate !== d.preToken.delegate) {
        out.push({
          id: "R17_SIM_DELEGATE_SET",
          severity: "WARNING",
          kind: "sim-delegate-set",
          address: d.address,
          message: "Simulation shows a delegate being granted over your token account.",
        });
      }
      if (d.postToken.closeAuthority && d.postToken.closeAuthority !== d.preToken.closeAuthority) {
        out.push({
          id: "R17_SIM_CLOSE_AUTHORITY_SET",
          severity: "WARNING",
          kind: "sim-close-authority-set",
          address: d.address,
          message: "Simulation shows a close authority being granted over your token account.",
        });
      }
    }
  }
  return out;
}
