# Integrating TxShield

## Wallet / dApp Confirm screen (React) — turnkey

`useTxGuard` runs the full pipeline (static verdict → resolve ALTs → simulate → balance preview) and
`<TxGuardModal>` is a minimal, themeable drop-in confirm sheet. Both are self-contained (inline SVG
icons, no Tailwind / CSS file / icon library) and theme to your app via the `accent` prop or CSS
variables (`--txs-accent`, `--txs-bg`, `--txs-surface`, `--txs-border`, `--txs-text`, `--txs-muted`,
`--txs-ok` / `--txs-warn` / `--txs-danger`).

```tsx
import { useTxGuard, TxGuardModal } from "@txshield/react";
import { DEFAULT_PROGRAM_ALLOWLIST, DEFAULT_PROGRAM_CAPABILITIES } from "@txshield/registry";

function ConfirmScreen({ txBytes, user, rpc, onSign, onClose }) {
  const { report, stateChanges, loading } = useTxGuard(txBytes, {
    user,
    rpc, // your SimRpc adapter (see "Optional: simulation" below) — enables the balance preview
    allowedPrograms: DEFAULT_PROGRAM_ALLOWLIST,
    programCapabilities: DEFAULT_PROGRAM_CAPABILITIES,
  });
  return (
    <TxGuardModal
      open
      report={report}
      stateChanges={stateChanges}
      loading={loading}
      accent="#5b8cff"
      onConfirm={onSign} // automatically disabled on a BLOCK verdict
      onCancel={onClose}
    />
  );
}
```

Prefer to render your own UI? Use the headless hook + minimal warning:

```tsx
import { useTxShield, TxWarning } from "@txshield/react";

const { report } = useTxShield(txBytes, { allowedPrograms: DEFAULT_PROGRAM_ALLOWLIST });
// report.action is NONE | WARN | BLOCK — gate Sign + render <TxWarning report={report} />.
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
