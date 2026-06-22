// TxShield end-to-end diagnostics (mainnet). Runs the whole stack as numbered steps and logs the
// exact data/payloads/counts at every point of possible failure, with an explicit PASS/FAIL per
// step + a final summary and non-zero exit on any failure. This is the "see exactly what works and
// what doesn't" harness.
//
// Run: pnpm --filter @txshield/example-e2e-mainnet diagnose

import { analyze } from "@txshield/core";
import { EXAMPLES } from "./examples.js";
import {
  ENV_PATH,
  HELIUS,
  IntegerOperator,
  LIGHTHOUSE_PROGRAM,
  SOL,
  USDC,
  buildAssertionTx,
  getRecentFeePayer,
  rpc,
  simulate,
} from "./helius.js";
import { data, fail, mask, maskUrl, note, ok, step, summary } from "./log.js";

const results: { step: number; title: string; pass: boolean }[] = [];
const record = (n: number, title: string, pass: boolean): boolean => {
  results.push({ step: n, title, pass });
  return pass;
};
const msg = (e: unknown): string => (e instanceof Error ? e.message : String(e));

function finishAndExit(): never {
  const allPass = summary(results);
  process.exit(allPass ? 0 : 1);
}

async function main(): Promise<void> {
  console.log("════════════════ TxShield — mainnet diagnostics ════════════════");

  // ── STEP 1 — environment ──────────────────────────────────────────────────
  step(1, "Environment");
  data(".env path", ENV_PATH);
  data("HELIUS_RPC_URL", maskUrl(HELIUS));
  data("JUP_ULTRA_BASE", process.env.JUP_ULTRA_BASE ?? "(unset)");
  data("JUP_API_KEY", mask(process.env.JUP_API_KEY));
  record(
    1,
    "Environment",
    HELIUS ? ok("HELIUS_RPC_URL set") : fail("HELIUS_RPC_URL missing — set it in .env"),
  );
  if (!HELIUS) finishAndExit();

  // ── STEP 2 — RPC reachability ─────────────────────────────────────────────
  step(2, "RPC reachability");
  let rpcPass = false;
  try {
    const version = await rpc("getVersion", []);
    const health = await rpc("getHealth", []);
    const slot = await rpc("getSlot", [{ commitment: "finalized" }]);
    data("solana-core", version["solana-core"]);
    data("getHealth", health);
    data("slot", slot);
    rpcPass = ok("RPC reachable");
  } catch (e) {
    rpcPass = fail(`RPC error: ${msg(e)}`);
  }
  record(2, "RPC reachability", rpcPass);

  // ── STEP 3 — static analyzer self-test (offline) ──────────────────────────
  step(3, "Static analyzer self-test (offline)");
  let correct = 0;
  for (const ex of EXAMPLES) {
    const r = analyze(ex.base64);
    const good = r.action === ex.expectAction;
    if (good) correct++;
    note(`${good ? "✓" : "✗"} ${ex.label.padEnd(30)} → ${r.action} (expected ${ex.expectAction})`);
  }
  data("correct", `${correct}/${EXAMPLES.length}`);
  record(
    3,
    "Static analyzer self-test",
    correct === EXAMPLES.length
      ? ok("all examples classified correctly")
      : fail(`${EXAMPLES.length - correct} mismatched`),
  );

  // fee payer for the on-chain steps (degrade gracefully if it can't be fetched)
  let feePayer = "";
  try {
    feePayer = await getRecentFeePayer();
  } catch (e) {
    note(`could not fetch a recent fee payer (${msg(e)}); falling back to the USDC mint`);
  }

  // ── STEP 4 — Lighthouse guard build ───────────────────────────────────────
  step(4, "Lighthouse atomic-guard build");
  let buildPass = false;
  try {
    const guard = buildAssertionTx(feePayer || USDC, 0n, IntegerOperator.Equal);
    data("program", guard.programAddress);
    data("assertion data bytes", guard.dataLen);
    data("account count", guard.accountCount);
    data("wire bytes", Buffer.from(guard.wire, "base64").length);
    buildPass =
      guard.programAddress === LIGHTHOUSE_PROGRAM
        ? ok("built a Lighthouse assertion instruction")
        : fail(`program ${guard.programAddress} ≠ Lighthouse ${LIGHTHOUSE_PROGRAM}`);
  } catch (e) {
    buildPass = fail(`build error: ${msg(e)}`);
  }
  record(4, "Lighthouse guard build", buildPass);

  // ── STEP 5 — atomic-guard mainnet proof ───────────────────────────────────
  step(5, "Atomic-guard mainnet proof (false reverts, true passes)");
  let provePass = false;
  try {
    data("fee payer", feePayer || "(none — using USDC mint)");
    const falseSim = await simulate(
      buildAssertionTx(feePayer || USDC, 0n, IntegerOperator.Equal).wire,
    );
    const trueSim = await simulate(
      buildAssertionTx(feePayer || USDC, 0n, IntegerOperator.GreaterThanOrEqual).wire,
    );
    const customCode = falseSim.err?.InstructionError?.[1]?.Custom;
    data("FALSE assertion err", JSON.stringify(falseSim.err));
    data("FALSE custom error code", customCode);
    const lhLog = (falseSim.logs ?? []).find((l: string) => /assert|6001|L2TExMF/i.test(l));
    if (lhLog) data("lighthouse log", lhLog);
    data("FALSE compute units", falseSim.unitsConsumed);
    data("TRUE assertion err", JSON.stringify(trueSim.err));
    const reverted = falseSim.err != null;
    const passed = trueSim.err == null;
    provePass =
      reverted && passed
        ? ok(`false reverted (custom ${customCode}) + true passed`)
        : fail(`reverted=${reverted} truePassed=${passed}`);
  } catch (e) {
    provePass = fail(`sim error: ${msg(e)}`);
  }
  record(5, "Atomic-guard mainnet proof", provePass);

  // ── STEP 6 — Jupiter Ultra order fetch ────────────────────────────────────
  step(6, "Jupiter Ultra order fetch");
  const ULTRA = process.env.JUP_ULTRA_BASE ?? "https://api.jup.ag/ultra/v1";
  const JUP_KEY = process.env.JUP_API_KEY;
  let swapTx: string | undefined;
  let jupPass = false;
  try {
    const taker = feePayer || USDC;
    data(
      "request",
      `${ULTRA}/order?inputMint=SOL&outputMint=USDC&amount=1000000&taker=${taker} (key ${mask(JUP_KEY)})`,
    );
    const res = await fetch(
      `${ULTRA}/order?inputMint=${SOL}&outputMint=${USDC}&amount=1000000&taker=${taker}`,
      {
        headers: JUP_KEY ? { "x-api-key": JUP_KEY } : {},
      },
    );
    data("http status", res.status);
    const order = await res.json();
    data("response keys", Object.keys(order).join(", "));
    swapTx = order?.transaction;
    if (swapTx) data("swap tx bytes", Buffer.from(swapTx, "base64").length);
    jupPass = swapTx
      ? ok("received a swap transaction")
      : fail(`no transaction in response: ${JSON.stringify(order).slice(0, 160)}`);
  } catch (e) {
    jupPass = fail(`fetch error: ${msg(e)}`);
  }
  record(6, "Jupiter Ultra fetch", jupPass);

  // ── STEP 7 — analyze the real swap ────────────────────────────────────────
  step(7, "Analyze the real Jupiter swap");
  let analyzePass = false;
  if (swapTx) {
    try {
      const report = analyze(swapTx, { user: feePayer || undefined });
      data("action", `${report.action} (${report.resultType})`);
      data("atomicGuardRecommended", report.meta.atomicGuardRecommended);
      data(
        "version / hasAddressLookups",
        `${report.meta.version} / ${report.meta.hasAddressLookups}`,
      );
      data("findings", report.warnings.map((w) => `${w.severity}:${w.kind}`).join(", ") || "none");
      analyzePass = ok("analyzed the real swap transaction");
    } catch (e) {
      analyzePass = fail(`analyze error: ${msg(e)}`);
    }
  } else {
    analyzePass = fail("skipped — no swap tx from step 6");
  }
  record(7, "Analyze real Jupiter swap", analyzePass);

  // ── STEP 8 — raw simulation of the real swap ──────────────────────────────
  step(8, "Raw simulation of the real swap");
  let simPass = false;
  if (swapTx) {
    try {
      const sim = await simulate(swapTx);
      data("err", JSON.stringify(sim.err));
      data("log lines", (sim.logs ?? []).length);
      data("unitsConsumed", sim.unitsConsumed);
      data("innerInstructions count", (sim.innerInstructions ?? []).length);
      data("returned accounts", (sim.accounts ?? []).length);
      note("(full inner-CPI normalization is the host adapter's job — this is the raw RPC path)");
      simPass = ok("simulation RPC path works end-to-end");
    } catch (e) {
      simPass = fail(`sim error: ${msg(e)}`);
    }
  } else {
    simPass = fail("skipped — no swap tx from step 6");
  }
  record(8, "Raw simulation of real swap", simPass);

  finishAndExit();
}

main().catch((e) => {
  console.error("fatal:", msg(e));
  process.exit(1);
});
