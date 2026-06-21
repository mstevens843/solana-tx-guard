// Deterministic logger for the e2e diagnostics — numbered steps, exact values, explicit PASS/FAIL.
// The point: when something doesn't work, you see the step #, the exact data, and why it failed.

export function step(n: number, title: string): void {
  console.log(`\n[STEP ${n}] ${title}`);
}

export function data(label: string, value: unknown): void {
  const s =
    typeof value === "string"
      ? value
      : JSON.stringify(value, (_k, v) => (typeof v === "bigint" ? `${v}n` : v));
  console.log(`        ${label}: ${s}`);
}

export function note(msg: string): void {
  console.log(`        ${msg}`);
}

export function ok(msg = "ok"): true {
  console.log(`   ✅  PASS — ${msg}`);
  return true;
}

export function fail(msg: string): false {
  console.log(`   ❌  FAIL — ${msg}`);
  return false;
}

export function mask(secret: string | undefined): string {
  if (!secret) return "(unset)";
  if (secret.length <= 8) return "****";
  return `${secret.slice(0, 4)}…${secret.slice(-4)}`;
}

export function maskUrl(url: string | undefined): string {
  if (!url) return "(unset)";
  try {
    const u = new URL(url);
    const key = u.searchParams.get("api-key");
    if (key) u.searchParams.set("api-key", mask(key));
    return u.toString();
  } catch {
    return url;
  }
}

export function summary(results: { step: number; title: string; pass: boolean }[]): boolean {
  console.log("\n──────────────────────────── SUMMARY ────────────────────────────");
  for (const r of results) {
    console.log(`   ${r.pass ? "✅" : "❌"}  STEP ${r.step} — ${r.title}`);
  }
  const passed = results.filter((r) => r.pass).length;
  const allPass = passed === results.length;
  console.log(
    `\n   ${allPass ? "✅ ALL PASS" : "❌ FAILURES"} — ${passed}/${results.length} steps passed`,
  );
  console.log("──────────────────────────────────────────────────────────────────");
  return allPass;
}
