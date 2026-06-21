// Digest binding (R27). Lets a host enforce that the bytes it broadcasts are the exact bytes it
// analyzed/showed the user — defeating pre-broadcast message mutation (e.g. a durable-nonce
// re-pack). Compares the canonical message bytes (signatures excluded).

import { decodeTransaction } from "./decode/normalize.js";
import { bytesEqual } from "./util/bytes.js";

/** The canonical message bytes of a transaction (the part a signature covers). */
export function transactionMessageBytes(input: Uint8Array | string): Uint8Array {
  return decodeTransaction(input).messageBytes;
}

/** True iff two transactions carry the exact same message (ignoring signatures). */
export function sameMessage(a: Uint8Array | string, b: Uint8Array | string): boolean {
  try {
    return bytesEqual(transactionMessageBytes(a), transactionMessageBytes(b));
  } catch {
    return false;
  }
}
