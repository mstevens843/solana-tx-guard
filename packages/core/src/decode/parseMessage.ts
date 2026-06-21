// Wire-format decoder for a Solana transaction (legacy + v0). This is the trust anchor:
// it must fail closed on anything malformed/inconsistent rather than emit a partial decode.
//
// NOTE: address-lookup-table *contents* are not resolved here (offline-first). ALT-referenced
// accounts become placeholders with source "alt-writable"/"alt-readonly" and the message is
// marked `unresolvedLookupTables`. Sensitive rules treat ALT-sourced targets as dangerous.

import type { MessageVersion, ResolvedAccount } from "../types.js";
import { ByteReader, TxBytesError, toBytes } from "../util/bytes.js";
import { toBase58 } from "../util/base58.js";

export interface RawInstruction {
  programIdIndex: number;
  accountIndexes: number[];
  data: Uint8Array;
}

export interface ParsedMessage {
  version: MessageVersion;
  numRequiredSignatures: number;
  numReadonlySignedAccounts: number;
  numReadonlyUnsignedAccounts: number;
  signaturesPresent: number;
  accounts: ResolvedAccount[];
  instructions: RawInstruction[];
  recentBlockhash: string;
  hasAddressLookups: boolean;
  unresolvedLookupTables: boolean;
  messageBytes: Uint8Array;
}

const SIGNATURE_LEN = 64;
const PUBKEY_LEN = 32;
const MAX_ACCOUNTS = 256; // transaction account-index is a single byte

function isZero(bytes: Uint8Array): boolean {
  for (const b of bytes) if (b !== 0) return false;
  return true;
}

export function parseMessage(input: Uint8Array | string): ParsedMessage {
  const bytes = toBytes(input);
  const r = new ByteReader(bytes);

  // --- signatures ---
  const sigCount = r.readShortVec();
  if (sigCount > MAX_ACCOUNTS) throw new TxBytesError("implausible signature count");
  let signaturesPresent = 0;
  for (let i = 0; i < sigCount; i++) {
    const sig = r.readBytes(SIGNATURE_LEN);
    if (!isZero(sig)) signaturesPresent += 1;
  }

  // --- message ---
  const messageStart = r.pos;
  const first = r.readU8();
  let version: MessageVersion;
  let numRequiredSignatures: number;
  if ((first & 0x80) !== 0) {
    const v = first & 0x7f;
    if (v !== 0) throw new TxBytesError(`unsupported transaction version ${v}`);
    version = 0;
    numRequiredSignatures = r.readU8();
  } else {
    version = "legacy";
    numRequiredSignatures = first;
  }
  const numReadonlySignedAccounts = r.readU8();
  const numReadonlyUnsignedAccounts = r.readU8();

  // static account keys
  const staticCount = r.readShortVec();
  if (staticCount > MAX_ACCOUNTS) throw new TxBytesError("implausible account count");
  const staticKeys: string[] = [];
  for (let i = 0; i < staticCount; i++) staticKeys.push(toBase58(r.readBytes(PUBKEY_LEN)));

  const recentBlockhash = toBase58(r.readBytes(PUBKEY_LEN));

  // instructions (raw indices; resolved after the full account list is known)
  const ixCount = r.readShortVec();
  const instructions: RawInstruction[] = [];
  for (let i = 0; i < ixCount; i++) {
    const programIdIndex = r.readU8();
    const accCount = r.readShortVec();
    const accountIndexes: number[] = [];
    for (let j = 0; j < accCount; j++) accountIndexes.push(r.readU8());
    const dataLen = r.readShortVec();
    const data = r.readBytes(dataLen);
    instructions.push({ programIdIndex, accountIndexes, data });
  }

  // address table lookups (v0 only)
  let altWritableCount = 0;
  let altReadonlyCount = 0;
  const altTableKeys: string[] = [];
  let hasAddressLookups = false;
  if (version === 0) {
    const altCount = r.readShortVec();
    hasAddressLookups = altCount > 0;
    for (let i = 0; i < altCount; i++) {
      altTableKeys.push(toBase58(r.readBytes(PUBKEY_LEN)));
      const wCount = r.readShortVec();
      r.readBytes(wCount); // writable indexes (into the table) — count is what we need offline
      const rCount = r.readShortVec();
      r.readBytes(rCount);
      altWritableCount += wCount;
      altReadonlyCount += rCount;
    }
  }

  const messageBytes = bytes.subarray(messageStart, r.pos);

  // --- build the canonical ordered account list ---
  const accounts: ResolvedAccount[] = [];
  for (let i = 0; i < staticCount; i++) {
    const signer = i < numRequiredSignatures;
    const writable = signer
      ? i < numRequiredSignatures - numReadonlySignedAccounts
      : i < staticCount - numReadonlyUnsignedAccounts;
    accounts.push({ index: i, address: staticKeys[i]!, writable, signer, source: "static" });
  }
  let cursor = staticCount;
  const tableLabel = altTableKeys[0] ? `${altTableKeys[0].slice(0, 4)}..` : "alt";
  for (let i = 0; i < altWritableCount; i++) {
    accounts.push({
      index: cursor,
      address: `lookup:${tableLabel}:w#${i}`,
      writable: true,
      signer: false,
      source: "alt-writable",
    });
    cursor += 1;
  }
  for (let i = 0; i < altReadonlyCount; i++) {
    accounts.push({
      index: cursor,
      address: `lookup:${tableLabel}:r#${i}`,
      writable: false,
      signer: false,
      source: "alt-readonly",
    });
    cursor += 1;
  }

  // --- validate every instruction index against the resolved account list (fail closed) ---
  for (const ix of instructions) {
    if (ix.programIdIndex >= accounts.length) {
      throw new TxBytesError("instruction program-id index out of range");
    }
    for (const ai of ix.accountIndexes) {
      if (ai >= accounts.length) throw new TxBytesError("instruction account index out of range");
    }
  }

  return {
    version,
    numRequiredSignatures,
    numReadonlySignedAccounts,
    numReadonlyUnsignedAccounts,
    signaturesPresent,
    accounts,
    instructions,
    recentBlockhash,
    hasAddressLookups,
    unresolvedLookupTables: altWritableCount + altReadonlyCount > 0,
    messageBytes,
  };
}
