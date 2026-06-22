// Curated quick-pick tokens + Birdeye search (matches SolPulse's working /defi/v3/search params).

export interface Token {
  mint: string;
  symbol: string;
  name: string;
  decimals?: number;
  logoURI?: string;
  price?: number;
}

export const SOL_MINT = "So11111111111111111111111111111111111111112";
export const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

export const TOKENS: Token[] = [
  { symbol: "SOL", name: "Solana", mint: SOL_MINT, decimals: 9 },
  { symbol: "USDC", name: "USD Coin", mint: USDC_MINT, decimals: 6 },
  {
    symbol: "USDT",
    name: "Tether",
    mint: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    decimals: 6,
  },
  {
    symbol: "JUP",
    name: "Jupiter",
    mint: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
    decimals: 6,
  },
  {
    symbol: "BONK",
    name: "Bonk",
    mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    decimals: 5,
  },
  {
    symbol: "WIF",
    name: "dogwifhat",
    mint: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
    decimals: 6,
  },
  { symbol: "JTO", name: "Jito", mint: "jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL", decimals: 9 },
  {
    symbol: "PYTH",
    name: "Pyth Network",
    mint: "HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3",
    decimals: 6,
  },
  {
    symbol: "RAY",
    name: "Raydium",
    mint: "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R",
    decimals: 6,
  },
  {
    symbol: "JitoSOL",
    name: "Jito Staked SOL",
    mint: "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn",
    decimals: 9,
  },
  {
    symbol: "mSOL",
    name: "Marinade SOL",
    mint: "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So",
    decimals: 9,
  },
];

// Birdeye token search (top 5). Params mirror SolPulse's backend/api/tokenList.js. Returns [] on
// any error (e.g. no BIRDEYE_API_KEY) so the curated quick-picks still work.
export async function searchBirdeye(keyword: string): Promise<Token[]> {
  try {
    const params = new URLSearchParams({
      keyword,
      target: "token",
      chain: "solana",
      search_by: "combination",
      search_mode: "fuzzy",
      sort_by: "volume_24h_usd",
      sort_type: "desc",
      verify_token: "true",
      limit: "5",
      offset: "0",
    });
    const res = await fetch(`/api/birdeye/defi/v3/search?${params.toString()}`);
    if (!res.ok) return [];
    const json = await res.json();
    const items: unknown[] = json?.data?.items ?? [];
    const out: Token[] = [];
    for (const group of items) {
      // biome-ignore lint/suspicious/noExplicitAny: external API shape
      const g = group as any;
      if (g?.type && g.type !== "token") continue;
      for (const r of g?.result ?? []) {
        const mint = r?.address ?? r?.token;
        if (mint && r?.symbol) {
          out.push({
            mint,
            symbol: r.symbol,
            name: r.name ?? r.symbol,
            decimals: typeof r.decimals === "number" ? r.decimals : undefined,
            logoURI: r.logo_uri ?? r.logoURI ?? r.icon,
            price: typeof r.price === "number" ? r.price : undefined,
          });
        }
      }
    }
    return out.slice(0, 5);
  } catch {
    return [];
  }
}
