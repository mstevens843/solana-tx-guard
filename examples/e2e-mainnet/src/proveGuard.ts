// Mainnet proof: a Lighthouse assertion REVERTS a transaction on-chain when its condition is false
// (via simulation — no keypair, no SOL spent). Run: pnpm --filter @txshield/example-e2e-mainnet prove

import {
  IntegerOperator,
  USDC,
  buildAssertionTx,
  getRecentFeePayer,
  rpc,
  simulate,
} from "./helius.js";
import { data, fail, ok, step } from "./log.js";

async function main(): Promise<void> {
  console.log("TxShield atomic-guard — mainnet proof (Helius)");

  step(1, "Fetch a real funded fee payer + read the USDC mint");
  const feePayer = await getRecentFeePayer();
  data("fee payer", feePayer);
  const acc = await rpc("getAccountInfo", [USDC, { encoding: "base64" }]);
  data("USDC mint lamports", acc.value.lamports);
  ok("ready");

  step(2, "Simulate a FALSE assertion (USDC lamports == 0) — must REVERT");
  const falseSim = await simulate(buildAssertionTx(feePayer, 0n, IntegerOperator.Equal).wire);
  const customCode = falseSim.err?.InstructionError?.[1]?.Custom;
  data("err", JSON.stringify(falseSim.err));
  data("custom error code", customCode);
  const lhLog = (falseSim.logs ?? []).find((l: string) => /assert|6001|L2TExMF/i.test(l));
  if (lhLog) data("lighthouse log", lhLog);
  const reverted = falseSim.err != null;
  if (reverted) ok(`reverted with custom ${customCode}`);
  else fail("did NOT revert — the guard would not have protected the user");

  step(3, "Simulate a TRUE assertion (USDC lamports >= 0) — must PASS");
  const trueSim = await simulate(
    buildAssertionTx(feePayer, 0n, IntegerOperator.GreaterThanOrEqual).wire,
  );
  data("err", JSON.stringify(trueSim.err));
  const passed = trueSim.err == null;
  if (passed) ok("passed");
  else fail("did NOT pass — a valid assertion was rejected");

  const proven = reverted && passed;
  console.log(
    `\n=== Lighthouse atomic-guard PROVEN on mainnet: ${proven ? "✅ YES — a false assertion reverts the tx on-chain" : "❌ NO"} ===`,
  );
  process.exit(proven ? 0 : 1);
}

main().catch((e) => {
  console.error("error:", e?.message ?? e);
  process.exit(1);
});
