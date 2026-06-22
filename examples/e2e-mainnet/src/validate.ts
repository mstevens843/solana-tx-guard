// Broad validation: pull recent REAL mainnet transactions across diverse programs and run analyze()
// on each (configured the way a real app would: trust allowlist + RPC-resolved ALTs). Reports the
// verdict distribution + flags any confirmed-legit tx that gets BLOCKed (a false positive to look at).
//
// Run: pnpm --filter @txshield/example-e2e-mainnet validate

import { AddressLookupTableAccount, VersionedTransaction } from "@solana/web3.js";
import { analyze, decodeTransaction } from "@txshield/core";
import { DEFAULT_PROGRAM_ALLOWLIST, DEFAULT_PROGRAM_CAPABILITIES } from "@txshield/registry";
import { rpc } from "./helius.js";
import { data, fail, note, ok, step } from "./log.js";

const TARGETS: [string, string][] = [
  ["Jupiter v6", "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"],
  ["Jupiter Ultra", "61DFfeTKM7trxYcPQCM78bJ794ddZprZpAwAnLiwTpYH"],
  ["Raydium AMM", "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8"],
  ["Orca Whirlpool", "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc"],
  ["SPL Token", "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"],
  ["System", "11111111111111111111111111111111"],
  ["Stake", "Stake11111111111111111111111111111111111111"],
  ["Token-2022", "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"],
];
const PER_PROGRAM = 6;

const b64ToBytes = (b64: string) => new Uint8Array(Buffer.from(b64, "base64"));

async function resolveLookupTables(
  txB64: string,
): Promise<ReadonlyMap<string, readonly string[]> | undefined> {
  let keys: string[];
  try {
    const vtx = VersionedTransaction.deserialize(b64ToBytes(txB64));
    const lk = vtx.message.addressTableLookups ?? [];
    if (lk.length === 0) return undefined;
    keys = lk.map((l) => l.accountKey.toBase58());
  } catch {
    return undefined;
  }
  const infos = await rpc("getMultipleAccounts", [
    keys,
    { encoding: "base64", commitment: "confirmed" },
  ]);
  const map = new Map<string, string[]>();
  for (let i = 0; i < keys.length; i++) {
    const d = infos?.value?.[i]?.data?.[0];
    if (!d) continue;
    try {
      map.set(
        keys[i] as string,
        AddressLookupTableAccount.deserialize(b64ToBytes(d)).addresses.map((a) => a.toBase58()),
      );
    } catch {
      // skip
    }
  }
  return map.size > 0 ? map : undefined;
}

type Tally = { NONE: number; WARN: number; BLOCK: number; n: number };

async function main(): Promise<void> {
  console.log("TxShield — broad validation against real mainnet transactions");
  const tally: Record<string, Tally> = {};
  const blocks: { program: string; sig: string; rules: string }[] = [];

  let i = 0;
  for (const [label, program] of TARGETS) {
    step(++i, label);
    const t: Tally = { NONE: 0, WARN: 0, BLOCK: 0, n: 0 };
    try {
      const sigs: { signature: string }[] = await rpc("getSignaturesForAddress", [
        program,
        { limit: PER_PROGRAM },
      ]);
      for (const s of sigs ?? []) {
        try {
          const txr = await rpc("getTransaction", [
            s.signature,
            { encoding: "base64", maxSupportedTransactionVersion: 0, commitment: "confirmed" },
          ]);
          const txB64: string | undefined = txr?.transaction?.[0];
          if (!txB64) continue;
          const top = new Set(decodeTransaction(txB64).instructions.map((ix) => ix.programId));
          const allow = new Set([...DEFAULT_PROGRAM_ALLOWLIST, ...top]);
          const lut = await resolveLookupTables(txB64);
          const r = analyze(txB64, {
            allowedPrograms: allow,
            programCapabilities: DEFAULT_PROGRAM_CAPABILITIES,
            lookupTables: lut,
          });
          t[r.action]++;
          t.n++;
          if (r.action === "BLOCK") {
            blocks.push({
              program: label,
              sig: s.signature,
              rules: r.warnings
                .filter((w) => w.severity === "CRITICAL")
                .map((w) => w.kind)
                .join(", "),
            });
          }
        } catch {
          // skip a tx we couldn't fetch/decode
        }
      }
      data(label, `NONE ${t.NONE} · WARN ${t.WARN} · BLOCK ${t.BLOCK}  (of ${t.n})`);
    } catch (e) {
      fail(`${label}: ${e instanceof Error ? e.message : String(e)}`);
    }
    tally[label] = t;
  }

  console.log("\n──────────── verdict distribution (trust config + resolved ALTs) ────────────");
  let blk = 0;
  let total = 0;
  for (const [label, t] of Object.entries(tally)) {
    console.log(`   ${label.padEnd(16)}  NONE ${t.NONE}   WARN ${t.WARN}   BLOCK ${t.BLOCK}`);
    blk += t.BLOCK;
    total += t.n;
  }
  console.log(
    `\n   Real-traffic BLOCK rate: ${blk}/${total} = ${total ? ((blk / total) * 100).toFixed(1) : "0"}%  (BLOCKs on confirmed-legit txs — investigate each)`,
  );
  if (blocks.length > 0) {
    console.log("\n   BLOCK cases to review:");
    for (const b of blocks) {
      console.log(`    • ${b.program}: [${b.rules}] https://solscan.io/tx/${b.sig}`);
    }
    note(
      "(a BLOCK on a legit tx may be a correct fail-closed call — e.g. a real SetAuthority — or an over-aggressive rule)",
    );
  } else {
    ok("No legit transaction was BLOCKed in this sample — no false positives.");
  }
}

main().catch((e) => {
  console.error("error:", e?.message ?? e);
  process.exit(1);
});
