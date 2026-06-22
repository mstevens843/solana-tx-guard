// Turn a simulated AccountDiff[] into human-readable state changes — the "what this does to your
// wallet" preview (the headline a safety UI shows: send 0.01 SOL, receive ~1.4 USDC, owner change).
// Risky changes are prefixed "Warning — " (no emoji) so a UI can style them.

import type { AccountDiff } from "./types.js";

export interface TokenMetaEntry {
  symbol?: string;
  decimals?: number;
}
export type TokenMeta = Record<string, TokenMetaEntry>;

const short = (s: string) => `${s.slice(0, 4)}…${s.slice(-4)}`;

export function summarizeStateChanges(
  diff: AccountDiff[],
  user: string,
  tokenMeta: TokenMeta = {},
): string[] {
  const out: string[] = [];

  // SOL: net change to the user's own account (includes fees + rent — the real spend).
  for (const d of diff) {
    if (d.address !== user || d.preLamports == null || d.postLamports == null) continue;
    const delta = d.postLamports - d.preLamports;
    if (delta !== 0) {
      const sol = Math.abs(delta) / 1e9;
      out.push(`${delta < 0 ? "Send" : "Receive"} ${sol.toFixed(sol < 0.001 ? 9 : 6)} SOL`);
    }
    if (d.preOwner && d.postOwner && d.preOwner !== d.postOwner) {
      out.push(
        `Warning — your account's owner program changes: ${short(d.preOwner)} to ${short(d.postOwner)}`,
      );
    }
  }

  // Tokens: changes to token accounts the user owns.
  for (const d of diff) {
    if (!d.isTokenAccount) continue;
    const owner = d.postToken?.owner ?? d.preToken?.owner;
    if (owner !== user) continue;
    const mint = d.postToken?.mint ?? d.preToken?.mint ?? "";
    const meta = tokenMeta[mint] ?? {};
    const dec = meta.decimals ?? 0;
    const sym = meta.symbol ?? short(mint);
    const delta = (d.postToken?.amount ?? 0n) - (d.preToken?.amount ?? 0n);
    if (delta !== 0n) {
      const amt = Number(delta < 0n ? -delta : delta) / 10 ** dec;
      out.push(
        `${delta < 0n ? "Send" : "Receive"} ~${amt.toLocaleString("en-US", { maximumFractionDigits: 6 })} ${sym}`,
      );
    }
    if (d.preToken && d.postToken) {
      if (d.preToken.owner !== d.postToken.owner) {
        out.push(`Warning — a token account's owner changes to ${short(d.postToken.owner)}`);
      }
      if (!d.preToken.delegate && d.postToken.delegate) {
        out.push(
          `Warning — a delegate is granted over your tokens: ${short(d.postToken.delegate)}`,
        );
      }
    }
  }

  return out;
}
