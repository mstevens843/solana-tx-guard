import type { Keypair } from "@solana/web3.js";
import { type ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { type TokenBalance, getSolBalance, getTokenBalances } from "./jupiter";
import { loadWallet } from "./wallet";

interface WalletState {
  keypair: Keypair | null;
  address: string | null;
  sol: number;
  tokens: TokenBalance[];
  loading: boolean;
  setKeypair: (kp: Keypair | null) => void;
  refresh: () => Promise<void>;
}

const Ctx = createContext<WalletState | null>(null);

export function useWallet(): WalletState {
  const c = useContext(Ctx);
  if (!c) throw new Error("useWallet must be used within <WalletProvider>");
  return c;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [keypair, setKeypair] = useState<Keypair | null>(() => loadWallet());
  const [sol, setSol] = useState(0);
  const [tokens, setTokens] = useState<TokenBalance[]>([]);
  const [loading, setLoading] = useState(false);

  const address = keypair?.publicKey.toBase58() ?? null;

  const refresh = useCallback(async () => {
    if (!keypair) {
      setSol(0);
      setTokens([]);
      return;
    }
    setLoading(true);
    const addr = keypair.publicKey.toBase58();
    try {
      const [s, t] = await Promise.all([getSolBalance(addr), getTokenBalances(addr)]);
      setSol(s);
      setTokens(t);
    } catch {
      // leave previous balances
    } finally {
      setLoading(false);
    }
  }, [keypair]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ keypair, address, sol, tokens, loading, setKeypair, refresh }),
    [keypair, address, sol, tokens, loading, refresh],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
