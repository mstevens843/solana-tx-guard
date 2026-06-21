// Mainnet proof #2: run TxShield's analyzer on a REAL Jupiter Ultra swap (fetched live), showing it
// parses real-world v0 transactions and produces a sensible verdict.
//
// Run: pnpm --filter @txshield/example-e2e-mainnet analyze-jup

import { analyze } from "@txshield/core";
import { DEFAULT_PROGRAM_ALLOWLIST } from "@txshield/registry";
import { SOL, USDC, getRecentFeePayer } from "./helius.js";
import { data, fail, mask, ok, step } from "./log.js";

async function main(): Promise<void> {
  console.log("TxShield — analyzing a REAL Jupiter swap (mainnet)");
  const ULTRA = process.env.JUP_ULTRA_BASE ?? "https://api.jup.ag/ultra/v1";
  const JUP_KEY = process.env.JUP_API_KEY;

  step(1, "Fetch a real funded taker");
  const user = await getRecentFeePayer();
  data("taker", user);
  ok("ready");

  step(2, "Fetch a Jupiter Ultra SOL→USDC order");
  data("api key", mask(JUP_KEY));
  const res = await fetch(
    `${ULTRA}/order?inputMint=${SOL}&outputMint=${USDC}&amount=1000000&taker=${user}`,
    { headers: JUP_KEY ? { "x-api-key": JUP_KEY } : {} },
  );
  data("http status", res.status);
  const order = await res.json();
  data("response keys", Object.keys(order).join(", "));
  const swapTx: string | undefined = order?.transaction;
  if (!swapTx) {
    fail(`no transaction in response: ${JSON.stringify(order).slice(0, 200)}`);
    process.exit(1);
  }
  data("swap tx bytes", Buffer.from(swapTx, "base64").length);
  ok("received a swap transaction");

  step(3, "Analyze the real swap with TxShield");
  const report = analyze(swapTx, { user, allowedPrograms: DEFAULT_PROGRAM_ALLOWLIST });
  data("action", `${report.action} (${report.resultType})`);
  data("atomicGuardRecommended", report.meta.atomicGuardRecommended);
  data("version / hasAddressLookups", `${report.meta.version} / ${report.meta.hasAddressLookups}`);
  data("findings", report.warnings.map((w) => `${w.severity}:${w.kind}`).join(", ") || "none");
  data("top reason", report.validation.reason);
  ok("analyzed the real swap");
  process.exit(0);
}

main().catch((e) => {
  console.error("error:", e?.message ?? e);
  process.exit(1);
});
