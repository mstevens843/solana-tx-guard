// txshield scan <base64-transaction>
// Exit codes: 0 = NONE/WARN (sign allowed by your gate), 1 = BLOCK, 2 = usage error.

import { analyze } from "@txshield/core";

function run(): number {
  const argv = process.argv.slice(2);
  const args = argv[0] === "scan" ? argv.slice(1) : argv;
  const input = args[0];
  if (!input) {
    process.stderr.write("usage: txshield scan <base64-transaction>\n");
    return 2;
  }

  const report = analyze(input);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

  const icon = report.action === "BLOCK" ? "🔴" : report.action === "WARN" ? "🟠" : "🟢";
  process.stderr.write(`\n${icon} ${report.action} — ${report.validation.reason}\n`);
  return report.action === "BLOCK" ? 1 : 0;
}

process.exit(run());
