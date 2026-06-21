// The atomic-guard. Given the simulation diff, derive the expected post-state for each
// user-writable account and synthesize Lighthouse assertion instructions to append LAST. If the
// real execution diverges (takes more, changes owner/delegate), the assertion fails and the
// whole transaction reverts on-chain — the only non-spoofable channel.
//
// Encoding is delegated entirely to lighthouse-sdk (Codama/@solana/kit builders) — never
// hand-rolled — so it stays correct against the on-chain program.

import {
  address,
  isSignerRole,
  isWritableRole,
  type IInstruction,
} from "@solana/kit";
import {
  EquatableOperator,
  IntegerOperator,
  LIGHTHOUSE_PROGRAM_ADDRESS,
  accountInfoAssertion,
  getAssertAccountInfoInstruction,
  getAssertTokenAccountInstruction,
  tokenAccountAssertion,
} from "lighthouse-sdk";
import type { AccountDiff } from "./types.js";

/** Solana packet size limit; a guarded tx must still fit. */
export const MAX_TX_SIZE = 1232;

export { LIGHTHOUSE_PROGRAM_ADDRESS };

export type GuardAssertion =
  | { account: string; type: "account-lamports-gte"; value: bigint }
  | { account: string; type: "account-owner-eq"; value: string }
  | { account: string; type: "token-amount-gte"; value: bigint }
  | { account: string; type: "token-owner-eq"; value: string }
  | { account: string; type: "token-delegate-eq"; value: string | null }
  | { account: string; type: "token-close-authority-eq"; value: string | null };

/** Neutral instruction descriptor for non-kit hosts. */
export interface GuardInstruction {
  programAddress: string;
  accounts: { address: string; role: number }[];
  data: Uint8Array;
}

export interface LegacyInstructionDescriptor {
  programId: string;
  keys: { pubkey: string; isSigner: boolean; isWritable: boolean }[];
  data: Uint8Array;
}

export interface AtomicGuard {
  assertions: GuardAssertion[];
  /** @solana/kit instructions to append to the transaction before signing. */
  instructions: IInstruction[];
  /** neutral descriptors (host-agnostic). */
  descriptors: GuardInstruction[];
  /** whether the assertions fit within the tx size budget. */
  fits: boolean;
  addedBytes: number;
}

/** Pin the simulated post-state of every user-writable account. */
export function deriveAssertions(diff: AccountDiff[], user: string): GuardAssertion[] {
  const out: GuardAssertion[] = [];
  for (const d of diff) {
    if (d.postToken) {
      const ownedByUser = d.preToken?.owner === user || d.postToken.owner === user;
      if (!ownedByUser) continue;
      out.push({ account: d.address, type: "token-amount-gte", value: d.postToken.amount });
      out.push({ account: d.address, type: "token-owner-eq", value: d.postToken.owner });
      out.push({ account: d.address, type: "token-delegate-eq", value: d.postToken.delegate });
      out.push({ account: d.address, type: "token-close-authority-eq", value: d.postToken.closeAuthority });
    } else if (d.postLamports != null) {
      if (d.address === user) {
        out.push({ account: d.address, type: "account-lamports-gte", value: BigInt(d.postLamports) });
      }
      if (d.postOwner) out.push({ account: d.address, type: "account-owner-eq", value: d.postOwner });
    }
  }
  return out;
}

function buildIx(a: GuardAssertion): IInstruction {
  switch (a.type) {
    case "account-lamports-gte":
      return getAssertAccountInfoInstruction({
        targetAccount: address(a.account),
        assertion: accountInfoAssertion("Lamports", {
          value: a.value,
          operator: IntegerOperator.GreaterThanOrEqual,
        }),
      });
    case "account-owner-eq":
      return getAssertAccountInfoInstruction({
        targetAccount: address(a.account),
        assertion: accountInfoAssertion("Owner", {
          value: address(a.value),
          operator: EquatableOperator.Equal,
        }),
      });
    case "token-amount-gte":
      return getAssertTokenAccountInstruction({
        targetAccount: address(a.account),
        assertion: tokenAccountAssertion("Amount", {
          value: a.value,
          operator: IntegerOperator.GreaterThanOrEqual,
        }),
      });
    case "token-owner-eq":
      return getAssertTokenAccountInstruction({
        targetAccount: address(a.account),
        assertion: tokenAccountAssertion("Owner", {
          value: address(a.value),
          operator: EquatableOperator.Equal,
        }),
      });
    case "token-delegate-eq":
      return getAssertTokenAccountInstruction({
        targetAccount: address(a.account),
        assertion: tokenAccountAssertion("Delegate", {
          value: a.value ? address(a.value) : null,
          operator: EquatableOperator.Equal,
        }),
      });
    case "token-close-authority-eq":
      return getAssertTokenAccountInstruction({
        targetAccount: address(a.account),
        assertion: tokenAccountAssertion("CloseAuthority", {
          value: a.value ? address(a.value) : null,
          operator: EquatableOperator.Equal,
        }),
      });
  }
}

function toDescriptor(ix: IInstruction): GuardInstruction {
  return {
    programAddress: ix.programAddress as string,
    accounts: (ix.accounts ?? []).map((acc) => ({ address: acc.address as string, role: acc.role })),
    data: (ix.data ?? new Uint8Array()) as Uint8Array,
  };
}

export function buildGuardInstructions(assertions: GuardAssertion[]): {
  instructions: IInstruction[];
  descriptors: GuardInstruction[];
} {
  const instructions = assertions.map(buildIx);
  return { instructions, descriptors: instructions.map(toDescriptor) };
}

/**
 * Conservative size check: would appending these assertions keep the tx within the packet
 * limit? Overestimates (Lighthouse program key once + per-ix overhead + data), so a `fits:false`
 * is safe — the host must then HARD-BLOCK rather than silently drop assertions.
 */
export function guardFeasibility(
  originalTxLen: number,
  descriptors: GuardInstruction[],
): { fits: boolean; addedBytes: number; limit: number } {
  let added = descriptors.length > 0 ? 32 : 0; // Lighthouse program key, added once
  for (const d of descriptors) added += 3 + d.data.length + d.accounts.length;
  return { fits: originalTxLen + added <= MAX_TX_SIZE, addedBytes: added, limit: MAX_TX_SIZE };
}

export function toLegacyDescriptors(instructions: IInstruction[]): LegacyInstructionDescriptor[] {
  return instructions.map((ix) => ({
    programId: ix.programAddress as string,
    keys: (ix.accounts ?? []).map((acc) => ({
      pubkey: acc.address as string,
      isSigner: isSignerRole(acc.role),
      isWritable: isWritableRole(acc.role),
    })),
    data: (ix.data ?? new Uint8Array()) as Uint8Array,
  }));
}

export function buildAtomicGuard(
  diff: AccountDiff[],
  opts: { user: string; originalTxLen?: number },
): AtomicGuard {
  const assertions = deriveAssertions(diff, opts.user);
  const { instructions, descriptors } = buildGuardInstructions(assertions);
  const { fits, addedBytes } = guardFeasibility(opts.originalTxLen ?? 0, descriptors);
  return { assertions, instructions, descriptors, fits, addedBytes };
}
