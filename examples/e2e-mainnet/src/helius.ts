// Shared Helius JSON-RPC client + Lighthouse assertion builder used by proveGuard / analyzeJupiter /
// diagnose. Loads the gitignored repo-root .env once on import.

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  address,
  appendTransactionMessageInstruction,
  blockhash,
  compileTransaction,
  createTransactionMessage,
  getBase64EncodedWireTransaction,
  pipe,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
} from "@solana/kit";
import { config } from "dotenv";
import {
  IntegerOperator,
  accountInfoAssertion,
  getAssertAccountInfoInstruction,
} from "lighthouse-sdk";

const here = dirname(fileURLToPath(import.meta.url));
export const ENV_PATH = resolve(here, "../../../.env");
config({ path: ENV_PATH });

export const HELIUS = process.env.HELIUS_RPC_URL;
export const LIGHTHOUSE_PROGRAM = "L2TExMFKdjpN9kozasaurPirfHy9P8sbXoAN1qA3S95";
export const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
export const SOL = "So11111111111111111111111111111111111111112";
const DUMMY_BLOCKHASH = "11111111111111111111111111111111";

export { IntegerOperator };

// biome-ignore lint/suspicious/noExplicitAny: thin JSON-RPC client
export async function rpc(method: string, params: unknown[]): Promise<any> {
  if (!HELIUS) throw new Error("HELIUS_RPC_URL not set (see .env)");
  const res = await fetch(HELIUS, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = await res.json();
  if (json.error) throw new Error(`${method}: ${JSON.stringify(json.error)}`);
  return json.result;
}

// A real, currently-funded system fee payer = whoever just paid fees in a recent block
// (getLargestAccounts is blocked on the Helius free tier).
export async function getRecentFeePayer(): Promise<string> {
  const slot: number = await rpc("getSlot", [{ commitment: "finalized" }]);
  for (let s = slot - 25; s < slot; s++) {
    try {
      const block = await rpc("getBlock", [
        s,
        {
          transactionDetails: "accounts",
          maxSupportedTransactionVersion: 0,
          rewards: false,
          commitment: "finalized",
        },
      ]);
      for (const t of block?.transactions ?? []) {
        const fp = (
          t.transaction.accountKeys as { pubkey: string; signer: boolean; writable: boolean }[]
        ).find((k) => k.signer && k.writable);
        if (fp) return fp.pubkey;
      }
    } catch {
      // skipped slot — try the next
    }
  }
  throw new Error("no recent fee payer found in the last 25 slots");
}

export interface AssertionTx {
  wire: string;
  programAddress: string;
  dataLen: number;
  accountCount: number;
}

export function buildAssertionTx(
  feePayer: string,
  value: bigint,
  operator: IntegerOperator,
): AssertionTx {
  const ix = getAssertAccountInfoInstruction({
    targetAccount: address(USDC),
    assertion: accountInfoAssertion("Lamports", { value, operator }),
  });
  const message = pipe(
    createTransactionMessage({ version: 0 }),
    (m) => setTransactionMessageFeePayer(address(feePayer), m),
    (m) =>
      setTransactionMessageLifetimeUsingBlockhash(
        { blockhash: blockhash(DUMMY_BLOCKHASH), lastValidBlockHeight: 0n },
        m,
      ),
    (m) => appendTransactionMessageInstruction(ix, m),
  );
  return {
    wire: getBase64EncodedWireTransaction(compileTransaction(message)),
    programAddress: String(ix.programAddress),
    dataLen: ix.data?.length ?? 0,
    accountCount: ix.accounts?.length ?? 0,
  };
}

// biome-ignore lint/suspicious/noExplicitAny: RPC value shape
export async function simulate(wire: string): Promise<any> {
  const r = await rpc("simulateTransaction", [
    wire,
    { sigVerify: false, replaceRecentBlockhash: true, encoding: "base64", commitment: "processed" },
  ]);
  return r.value;
}
