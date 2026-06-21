// Canonical mint pubkeys, matched by full 32-byte equality — the defense against symbol/metadata
// spoofing (a lookalike "USDC" is just a different mint). Used by R13 (spoofed/lookalike mint).

export const CANONICAL_MINTS: Readonly<Record<string, string>> = {
  SOL: "So11111111111111111111111111111111111111112",
  USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  USDT: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
};

export const CANONICAL_MINT_SET: ReadonlySet<string> = new Set(Object.values(CANONICAL_MINTS));
