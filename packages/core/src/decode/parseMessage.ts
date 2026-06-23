// Wire-format decoder for a Solana transaction (legacy + v0). This is the trust anchor:
// it must fail closed on anything malformed/inconsistent rather than emit a partial decode.
//
// NOTE: address-lookup-table *contents* are not resolved here (offline-first). ALT-referenced
// accounts become placeholders with source "alt-writable"/"alt-readonly" and the message is
// marked `unresolvedLookupTables`. Sensitive rules treat ALT-sourced targets as dangerous.

import type { MessageVersion, ResolvedAccount } from "../types.js";
import { toBase58 } from "../util/base58.js";
import { ByteReader, TxBytesError, toBytes } from "../util/bytes.js";

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
  /** the referenced address-lookup-table account pubkeys (so a host can fetch + resolve them). */
  lookupTableKeys: string[];
  messageBytes: Uint8Array;
}

const SIGNATURE_LEN = 64;
const PUBKEY_LEN = 32;
const MAX_ACCOUNTS = 256; // transaction account-index is a single byte

function isZero(bytes: Uint8Array): boolean {
  for (const b of bytes) if (b !== 0) return false;
  return true;
}

export function parseMessage(
  input: Uint8Array | string,
  lookupTables?: ReadonlyMap<string, readonly string[]>,
): ParsedMessage {
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
  if (sigCount !== numRequiredSignatures) {
    throw new TxBytesError("signature count does not match message header");
  }
  if (numRequiredSignatures === 0) {
    throw new TxBytesError("transaction requires at least one signature");
  }
  const numReadonlySignedAccounts = r.readU8();
  const numReadonlyUnsignedAccounts = r.readU8();

  // static account keys
  const staticCount = r.readShortVec();
  if (staticCount > MAX_ACCOUNTS) throw new TxBytesError("implausible account count");
  if (numRequiredSignatures > staticCount) {
    throw new TxBytesError("required signatures exceed account count");
  }
  if (numReadonlySignedAccounts > numRequiredSignatures) {
    throw new TxBytesError("readonly signed account count exceeds signer count");
  }
  if (numReadonlyUnsignedAccounts > staticCount - numRequiredSignatures) {
    throw new TxBytesError("readonly unsigned account count exceeds unsigned account count");
  }
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

  // address table lookups (v0 only) — capture the per-table indexes so they can be resolved
  // against RPC-fetched table contents (options.lookupTables); offline they stay placeholders.
  const altLookups: { key: string; writable: number[]; readonly: number[] }[] = [];
  let hasAddressLookups = false;
  if (version === 0) {
    const altCount = r.readShortVec();
    hasAddressLookups = altCount > 0;
    for (let i = 0; i < altCount; i++) {
      const key = toBase58(r.readBytes(PUBKEY_LEN));
      const wCount = r.readShortVec();
      const writable = Array.from(r.readBytes(wCount));
      const rCount = r.readShortVec();
      const readonly = Array.from(r.readBytes(rCount));
      altLookups.push({ key, writable, readonly });
    }
  }

  if (r.remaining !== 0) throw new TxBytesError("trailing bytes after transaction message");

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
  // Resolved ordering: static keys, then all writable ALT addresses (table order, index order),
  // then all readonly. Resolve each against options.lookupTables; unresolved → placeholder.
  let cursor = staticCount;
  let anyUnresolved = false;
  const resolve = (key: string, idx: number): string | undefined => lookupTables?.get(key)?.[idx];
  for (const tbl of altLookups) {
    for (const idx of tbl.writable) {
      const addr = resolve(tbl.key, idx);
      if (addr === undefined) anyUnresolved = true;
      accounts.push({
        index: cursor,
        address: addr ?? `lookup:${tbl.key.slice(0, 4)}..:w#${idx}`,
        writable: true,
        signer: false,
        source: "alt-writable",
      });
      cursor += 1;
    }
  }
  for (const tbl of altLookups) {
    for (const idx of tbl.readonly) {
      const addr = resolve(tbl.key, idx);
      if (addr === undefined) anyUnresolved = true;
      accounts.push({
        index: cursor,
        address: addr ?? `lookup:${tbl.key.slice(0, 4)}..:r#${idx}`,
        writable: false,
        signer: false,
        source: "alt-readonly",
      });
      cursor += 1;
    }
  }

  if (accounts.length > MAX_ACCOUNTS) {
    throw new TxBytesError("resolved account count exceeds index limit");
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
    unresolvedLookupTables: anyUnresolved,
    lookupTableKeys: altLookups.map((t) => t.key),
    messageBytes,
  };
}
