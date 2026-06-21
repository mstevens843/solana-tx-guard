import type { RawSimulation, SimRpc, SimulateFn } from "./types.js";

/**
 * Build a SimulateFn from a host RPC adapter. Fetches PRE state (current accounts) and POST
 * state (simulation) for the tracked addresses and normalizes both into a RawSimulation.
 *
 * Recommended simulate config in your adapter: sigVerify:false, replaceRecentBlockhash:true,
 * innerInstructions:true, accounts:{ encoding:'base64', addresses }.
 */
export function createSimulateFn(rpc: SimRpc): SimulateFn {
  return async (base64Tx, addresses) => {
    const [pre, post] = await Promise.all([
      rpc.getAccounts(addresses),
      rpc.simulateTransaction(base64Tx, addresses),
    ]);

    const accounts = addresses.map((address, i) => {
      const entry: RawSimulation["accounts"][number] = { address };
      const p = pre[i];
      const q = post.accounts[i];
      if (p) entry.pre = p;
      if (q) entry.post = q;
      return entry;
    });

    const out: RawSimulation = { ok: post.ok, logs: post.logs, accounts };
    if (post.unitsConsumed != null) out.unitsConsumed = post.unitsConsumed;
    if (post.err != null) out.error = post.err;
    if (post.innerInstructions) out.innerInstructions = post.innerInstructions;
    return out;
  };
}
