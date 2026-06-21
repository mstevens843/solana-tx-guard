# Integrating TxShield

## Wallet / dApp Confirm screen (React)

```tsx
import { useTxShield, TxWarning } from "@txshield/react";
import { DEFAULT_PROGRAM_ALLOWLIST } from "@txshield/registry";

function ConfirmScreen({ txBytes }: { txBytes: Uint8Array }) {
  const { report } = useTxShield(txBytes, { allowedPrograms: DEFAULT_PROGRAM_ALLOWLIST });
  const blocked = report?.action === "BLOCK";
  return (
    <>
      <TxWarning report={report} />
      <button disabled={blocked} onClick={sign}>
        {blocked ? "Blocked by TxShield" : "Sign"}
      </button>
    </>
  );
}
```

## Headless / backend (Node, trading UI)

```ts
import { analyze } from "@txshield/core";

const report = analyze(base64Tx, { user: walletAddress });
if (report.action === "BLOCK") throw new Error(report.validation.reason);
```

`analyze()` accepts a `Uint8Array` or a base64 string (standard or url-safe). The static verdict
needs no network.

## Optional: simulation + atomic-guard (hard, on-chain guarantee)

```ts
import { analyze } from "@txshield/core";
import {
  createSimulateFn,
  simulateAndDiff,
  buildAtomicGuard,
  toLegacyDescriptors,
} from "@txshield/simulation";

// Adapt your RPC client (web3.js v1 or @solana/kit) to the SimRpc interface once.
const simulate = createSimulateFn(myRpcAdapter);

// 1) Simulate → advisory findings + structured diff (additive only).
const sim = await simulateAndDiff(base64Tx, simulate, { user });
const report = analyze(base64Tx, { user, simulation: sim });

// 2) When the static report flags an opaque/CPI surface, attach the atomic-guard.
if (report.meta.atomicGuardRecommended) {
  const guard = buildAtomicGuard(sim.diff, { user, originalTxLen: rawTxBytes.length });
  if (!guard.fits) {
    // Assertions can't fit the packet → HARD BLOCK. Never sign the unguarded tx.
  } else {
    // Append guard.instructions (@solana/kit) — or toLegacyDescriptors(guard.instructions)
    // for web3.js v1 — to the transaction BEFORE the user signs. Lighthouse assertions pin
    // each user-writable account's post-state, so any divergent execution reverts on-chain.
  }
}
```

The guard's instruction bytes are produced by `lighthouse-sdk` (program
`L2TExMFKdjpN9kozasaurPirfHy9P8sbXoAN1qA3S95`), so they match the on-chain program exactly.

## CLI / CI gate

```sh
npx @txshield/cli scan <base64-transaction>   # exit 1 on BLOCK
```

## Verdict shape

`RiskReport.action` is `NONE | WARN | BLOCK` (Blowfish-compatible); `resultType` is
`Benign | Warning | Malicious | Error` (Blockaid-compatible). `warnings[]` carries each finding
(`id`, `severity`, `kind`, `message`, `instructionIndex?`, `address?`). Recommended gate: refuse to
sign on `BLOCK`, surface `warnings` on `WARN`.
