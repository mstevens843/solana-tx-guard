// Runtime-agnostic base58 (no Buffer, no Node deps) — used to render 32-byte account keys.

const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

export function toBase58(bytes: Uint8Array): string {
  let zeros = 0;
  while (zeros < bytes.length && bytes[zeros] === 0) zeros++;

  let num = 0n;
  for (const b of bytes) num = num * 256n + BigInt(b);

  let out = "";
  while (num > 0n) {
    const rem = Number(num % 58n);
    num /= 58n;
    out = ALPHABET.charAt(rem) + out;
  }
  return "1".repeat(zeros) + out;
}
