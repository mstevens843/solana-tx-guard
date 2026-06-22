// Browser-side network for the swap demo. All calls go to the same-origin Vite dev proxy
// (/api/helius, /api/jup) so API keys stay in the dev server and never reach the client bundle.

import { AddressLookupTableAccount, VersionedTransaction } from "@solana/web3.js";
import type { SimRpc } from "@txshield/simulation";
import { b64ToBytes } from "./wallet";

const TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const TOKEN_2022 = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";

// biome-ignore lint/suspicious/noExplicitAny: thin JSON-RPC client
async function heliusRpc(method: string, params: unknown[]): Promise<any> {
  const res = await fetch("/api/helius", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!res.ok) throw new Error(`Helius proxy ${res.status} (is HELIUS_RPC_URL set in .env?)`);
  const json = await res.json();
  if (json.error) throw new Error(`${method}: ${JSON.stringify(json.error)}`);
  return json.result;
}

export async function getSolBalance(address: string): Promise<number> {
  const r = await heliusRpc("getBalance", [address, { commitment: "confirmed" }]);
  return (r?.value ?? 0) / 1e9;
}

export interface TokenBalance {
  mint: string;
  amount: number;
  decimals: number;
}

export async function getTokenBalances(address: string): Promise<TokenBalance[]> {
  const out: TokenBalance[] = [];
  for (const programId of [TOKEN_PROGRAM, TOKEN_2022]) {
    try {
      const r = await heliusRpc("getTokenAccountsByOwner", [
        address,
        { programId },
        { encoding: "jsonParsed", commitment: "confirmed" },
      ]);
      for (const acc of r?.value ?? []) {
        const info = acc?.account?.data?.parsed?.info;
        const amt = info?.tokenAmount;
        if (info?.mint && amt && Number(amt.uiAmount) > 0) {
          out.push({ mint: info.mint, amount: Number(amt.uiAmount), decimals: amt.decimals });
        }
      }
    } catch {
      // ignore one program's failure
    }
  }
  return out;
}

export async function getDecimals(mint: string): Promise<number> {
  const r = await heliusRpc("getTokenSupply", [mint]);
  return r?.value?.decimals ?? 0;
}

// Fetch the contents of every address-lookup-table the tx references, so analyze() can resolve
// ALT-hidden accounts (clears the unresolved-lookup-table warning). undefined if the tx has no ALTs.
export async function resolveLookupTables(
  txB64: string,
): Promise<ReadonlyMap<string, readonly string[]> | undefined> {
  let keys: string[];
  try {
    const vtx = VersionedTransaction.deserialize(b64ToBytes(txB64));
    const lookups = vtx.message.addressTableLookups ?? [];
    if (lookups.length === 0) return undefined;
    keys = lookups.map((l) => l.accountKey.toBase58());
  } catch {
    return undefined;
  }
  const infos = await heliusRpc("getMultipleAccounts", [
    keys,
    { encoding: "base64", commitment: "confirmed" },
  ]);
  const map = new Map<string, string[]>();
  for (let i = 0; i < keys.length; i++) {
    const data = infos?.value?.[i]?.data?.[0];
    if (!data) continue;
    try {
      const state = AddressLookupTableAccount.deserialize(b64ToBytes(data));
      map.set(
        keys[i] as string,
        state.addresses.map((a) => a.toBase58()),
      );
    } catch {
      // skip a table we can't decode
    }
  }
  return map.size > 0 ? map : undefined;
}

export async function getLatestBlockhash(): Promise<string> {
  const r = await heliusRpc("getLatestBlockhash", [{ commitment: "finalized" }]);
  return r.value.blockhash;
}

export async function sendRawTx(b64: string): Promise<string> {
  return heliusRpc("sendTransaction", [
    b64,
    { encoding: "base64", skipPreflight: false, maxRetries: 3, preflightCommitment: "confirmed" },
  ]);
}

// biome-ignore lint/suspicious/noExplicitAny: RPC account shape
const toSnap = (a: any) =>
  a
    ? { lamports: a.lamports, owner: a.owner, dataBase64: a.data?.[0], executable: a.executable }
    : null;

// A browser SimRpc over Helius for @txshield/simulation (pre = getMultipleAccounts, post =
// simulateTransaction). Inner-CPI normalization needs the resolved full account list (host adapter
// work); omitted here, so the diff-based checks + balance preview run, analyzeCpi sees no inner ix.
export function makeSimRpc(): SimRpc {
  return {
    async getAccounts(addresses) {
      if (addresses.length === 0) return [];
      const r = await heliusRpc("getMultipleAccounts", [
        addresses,
        { encoding: "base64", commitment: "confirmed" },
      ]);
      return (r?.value ?? []).map(toSnap);
    },
    async simulateTransaction(base64Tx, addresses) {
      const r = await heliusRpc("simulateTransaction", [
        base64Tx,
        {
          sigVerify: false,
          replaceRecentBlockhash: true,
          encoding: "base64",
          commitment: "processed",
          accounts: { encoding: "base64", addresses },
        },
      ]);
      const v = r?.value ?? {};
      return {
        ok: v.err == null,
        logs: v.logs ?? [],
        unitsConsumed: v.unitsConsumed,
        err: v.err ? JSON.stringify(v.err) : undefined,
        accounts: (v.accounts ?? []).map(toSnap),
      };
    },
  };
}

export interface SwapOrder {
  transaction: string;
  requestId?: string;
  inAmount?: string;
  outAmount?: string;
}

// Jupiter Ultra /order — no slippage param = Ultra's auto-slippage. taker = the wallet.
export async function buildSwapOrder(opts: {
  inputMint: string;
  outputMint: string;
  amount: string; // base units
  taker: string;
}): Promise<SwapOrder> {
  const { inputMint, outputMint, amount, taker } = opts;
  const url = `/api/jup/order?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&taker=${taker}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Jupiter order ${res.status} (is JUP_API_KEY set in .env?)`);
  const json = await res.json();
  if (!json.transaction) {
    throw new Error(json.errorMessage || json.error || "no route / insufficient balance");
  }
  return {
    transaction: json.transaction,
    requestId: json.requestId,
    inAmount: json.inAmount,
    outAmount: json.outAmount,
  };
}

export interface ExecuteResult {
  status?: string;
  signature?: string;
  error?: string;
  code?: number;
}

// Jupiter Ultra /execute — hands the signed tx back to Jupiter to land it. NOTE: Ultra returns a
// `signature` even on a FAILED swap, so success must be judged by `status === "Success"` + an
// on-chain confirmation (confirmSignature), never by signature presence.
export async function executeSwap(
  signedTransaction: string,
  requestId: string | undefined,
): Promise<ExecuteResult> {
  const res = await fetch("/api/jup/execute", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ signedTransaction, requestId }),
  });
  // biome-ignore lint/suspicious/noExplicitAny: external API shape
  const json: any = await res.json().catch(() => ({}));
  return {
    status: json.status,
    signature: json.signature,
    error:
      json.error ??
      json.errorMessage ??
      json.message ??
      (!res.ok ? `execute ${res.status}` : undefined),
    code: json.code ?? json.errorCode,
  };
}

export interface ConfirmResult {
  confirmed: boolean;
  err: string | null;
}

// Poll the chain for the real outcome — the truth, not Ultra's optimistic signature.
export async function confirmSignature(
  signature: string,
  timeoutMs = 35000,
): Promise<ConfirmResult> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const r = await heliusRpc("getSignatureStatuses", [
      [signature],
      { searchTransactionHistory: true },
    ]);
    const st = r?.value?.[0];
    if (st) {
      if (st.err) return { confirmed: false, err: JSON.stringify(st.err) };
      if (st.confirmationStatus === "confirmed" || st.confirmationStatus === "finalized") {
        return { confirmed: true, err: null };
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  return { confirmed: false, err: "timed out waiting for on-chain confirmation" };
}
