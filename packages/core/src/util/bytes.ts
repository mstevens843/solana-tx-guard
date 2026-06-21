// Runtime-agnostic byte helpers: base64 decode + a bounds-checked wire reader.
// No Buffer / atob dependency, so this runs unchanged in browser workers, Node, and Hermes.

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const B64_LOOKUP: Int16Array = (() => {
  const t = new Int16Array(128).fill(-1);
  for (let i = 0; i < B64.length; i++) t[B64.charCodeAt(i)] = i;
  return t;
})();

export function fromBase64(input: string): Uint8Array {
  // Accept standard and url-safe base64; strip whitespace and padding.
  const s = input.replace(/[\s]/g, "").replace(/-/g, "+").replace(/_/g, "/").replace(/=+$/, "");
  const out = new Uint8Array(Math.floor((s.length * 6) / 8));
  let bits = 0;
  let acc = 0;
  let oi = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    const v = c < 128 ? B64_LOOKUP[c]! : -1;
    if (v < 0) throw new TxBytesError(`invalid base64 character at index ${i}`);
    acc = (acc << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[oi++] = (acc >> bits) & 0xff;
    }
  }
  return out.subarray(0, oi);
}

export function toBytes(input: Uint8Array | string): Uint8Array {
  return typeof input === "string" ? fromBase64(input) : input;
}

export class TxBytesError extends Error {}

/** Bounds-checked little-endian reader for Solana wire format. Throws on EOF. */
export class ByteReader {
  pos: number;
  constructor(
    private readonly buf: Uint8Array,
    start = 0,
  ) {
    this.pos = start;
  }

  get length(): number {
    return this.buf.length;
  }

  get remaining(): number {
    return this.buf.length - this.pos;
  }

  readU8(): number {
    if (this.pos >= this.buf.length) throw new TxBytesError("unexpected end of buffer");
    return this.buf[this.pos++]!;
  }

  readBytes(n: number): Uint8Array {
    if (n < 0 || this.pos + n > this.buf.length) {
      throw new TxBytesError(`out-of-range read of ${n} bytes at ${this.pos}`);
    }
    const slice = this.buf.subarray(this.pos, this.pos + n);
    this.pos += n;
    return slice;
  }

  /** compact-u16 (shortvec) length prefix used throughout Solana wire format. */
  readShortVec(): number {
    let len = 0;
    let size = 0;
    for (;;) {
      const b = this.readU8();
      len |= (b & 0x7f) << (size * 7);
      if ((b & 0x80) === 0) break;
      size += 1;
      if (size > 2) throw new TxBytesError("compact-u16 length too long");
    }
    return len;
  }
}

/** Little-endian u32 read out of an instruction data buffer (System discriminators). */
export function readU32LE(data: Uint8Array, offset = 0): number | undefined {
  if (offset + 4 > data.length) return undefined;
  return (
    (data[offset]! | (data[offset + 1]! << 8) | (data[offset + 2]! << 16) | (data[offset + 3]! << 24)) >>>
    0
  );
}

export function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}
