// Throwaway in-browser test wallet for the swap demo. The secret key is stored UNENCRYPTED in
// localStorage — demo only, small amounts. (A real app would use a hardware wallet / secure enclave.)

import {
  Keypair,
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import bs58 from "bs58";

const STORE_KEY = "txshield_demo_wallet_v1";

export function createWallet(): Keypair {
  return Keypair.generate();
}

// Accepts a base58 secret key (Phantom export) or a JSON byte array (solana-keygen).
export function importWallet(secret: string): Keypair {
  const s = secret.trim();
  if (s.startsWith("[")) return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(s)));
  return Keypair.fromSecretKey(bs58.decode(s));
}

export function saveWallet(kp: Keypair): void {
  localStorage.setItem(STORE_KEY, bs58.encode(kp.secretKey));
}

export function loadWallet(): Keypair | null {
  const s = localStorage.getItem(STORE_KEY);
  if (!s) return null;
  try {
    return Keypair.fromSecretKey(bs58.decode(s));
  } catch {
    return null;
  }
}

export function clearWallet(): void {
  localStorage.removeItem(STORE_KEY);
}

export function exportSecret(kp: Keypair): string {
  return bs58.encode(kp.secretKey);
}

export function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function bytesToB64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

// Sign an already-built (e.g. Jupiter) versioned transaction; returns base64 of the signed tx.
export function signTx(b64: string, kp: Keypair): string {
  const tx = VersionedTransaction.deserialize(b64ToBytes(b64));
  tx.sign([kp]);
  return bytesToB64(tx.serialize());
}

// Build an UNSIGNED SOL-transfer tx (so the guard can analyze it before signing).
export function buildTransferTx(
  from: Keypair,
  to: string,
  lamports: number,
  recentBlockhash: string,
): string {
  const message = new TransactionMessage({
    payerKey: from.publicKey,
    recentBlockhash,
    instructions: [
      SystemProgram.transfer({
        fromPubkey: from.publicKey,
        toPubkey: new PublicKey(to),
        lamports,
      }),
    ],
  }).compileToV0Message();
  return bytesToB64(new VersionedTransaction(message).serialize());
}
