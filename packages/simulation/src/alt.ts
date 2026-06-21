// R14 submit-time hook — re-resolve address lookup tables at broadcast time and detect whether
// the writable/readonly account set changed since the user reviewed (ALTs are mutable). A host
// resolves once at review and once at submit; `changed` ⇒ hard-block. `mutable` flags a table
// whose authority hasn't been renounced (it can still change before landing).

import { bytes, toBase58 } from "@txshield/core";
import type { SimRpc } from "./types.js";

export interface AltLookup {
  tableAddress: string;
  writableIndexes: number[];
  readonlyIndexes: number[];
}

export interface ResolvedAlt {
  writable: string[];
  readonly: string[];
  /** true if any referenced table is still mutable (authority not renounced) or unresolved. */
  mutable: boolean;
}

const HEADER_LEN = 56; // AddressLookupTableMeta, then 32-byte addresses

/** Decode an on-chain address-lookup-table account (authority + address list). */
export function decodeAddressLookupTable(dataBase64: string): {
  authority: string | null;
  addresses: string[];
} {
  const b = bytes.fromBase64(dataBase64);
  // LookupTableMeta: ...; authority is an Option<Pubkey> with its 1-byte tag at offset 21.
  const authority = b.length > 54 && b[21] === 1 ? toBase58(b.subarray(22, 54)) : null;
  const addresses: string[] = [];
  for (let off = HEADER_LEN; off + 32 <= b.length; off += 32) {
    addresses.push(toBase58(b.subarray(off, off + 32)));
  }
  return { authority, addresses };
}

export async function resolveLookups(rpc: SimRpc, lookups: AltLookup[]): Promise<ResolvedAlt> {
  const snaps = await rpc.getAccounts(lookups.map((l) => l.tableAddress));
  const writable: string[] = [];
  const readonly: string[] = [];
  let mutable = false;

  lookups.forEach((l, i) => {
    const snap = snaps[i];
    if (!snap?.dataBase64) {
      mutable = true; // unresolved table → treat as unsafe
      return;
    }
    const { authority, addresses } = decodeAddressLookupTable(snap.dataBase64);
    if (authority !== null) mutable = true;
    for (const idx of l.writableIndexes) {
      const a = addresses[idx];
      if (a) writable.push(a);
    }
    for (const idx of l.readonlyIndexes) {
      const a = addresses[idx];
      if (a) readonly.push(a);
    }
  });

  return { writable, readonly, mutable };
}

const arrEq = (x: string[], y: string[]) => x.length === y.length && x.every((v, i) => v === y[i]);

export function verifyAltUnchanged(before: ResolvedAlt, after: ResolvedAlt): { changed: boolean } {
  return { changed: !(arrEq(before.writable, after.writable) && arrEq(before.readonly, after.readonly)) };
}
