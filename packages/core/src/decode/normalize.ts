// Orchestrates the wire parse + per-instruction decode into a single DecodedTransaction.

import type { DecodedInstruction, DecodedTransaction } from "../types.js";
import { decodeInstruction } from "./instructions.js";
import { parseMessage } from "./parseMessage.js";

export function decodeTransaction(
  input: Uint8Array | string,
  lookupTables?: ReadonlyMap<string, readonly string[]>,
): DecodedTransaction {
  const pm = parseMessage(input, lookupTables);

  const instructions: DecodedInstruction[] = pm.instructions.map((raw, index) => {
    const programAccount = pm.accounts[raw.programIdIndex]!;
    const accounts = raw.accountIndexes.map((ai) => pm.accounts[ai]!);
    const { decoded, undecodedSensitive } = decodeInstruction(programAccount.address, raw.data);
    return {
      index,
      programId: programAccount.address,
      programIdViaLookupTable: programAccount.source !== "static",
      accounts,
      data: raw.data,
      decoded,
      undecodedSensitive,
    };
  });

  const feePayer = pm.accounts[0]?.address ?? "";

  return {
    version: pm.version,
    feePayer,
    numRequiredSignatures: pm.numRequiredSignatures,
    signaturesPresent: pm.signaturesPresent,
    isFullySigned: pm.numRequiredSignatures > 0 && pm.signaturesPresent >= pm.numRequiredSignatures,
    accounts: pm.accounts,
    instructions,
    recentBlockhash: pm.recentBlockhash,
    hasAddressLookups: pm.hasAddressLookups,
    unresolvedLookupTables: pm.unresolvedLookupTables,
    lookupTableKeys: pm.lookupTableKeys,
    messageBytes: pm.messageBytes,
  };
}
