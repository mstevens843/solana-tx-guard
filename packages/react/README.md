# @txshield/react

Drop-in React surface for [TxShield](https://github.com/mstevens843/solana-tx-guard) — the open
Solana pre-sign transaction-safety layer. Two paths: a **headless hook** (you render) and an
optional **minimal, themeable confirm modal** (turnkey). No Tailwind, no CSS file, no icon library —
self-contained inline SVG icons + inline styles, so it blends into any app.

```sh
npm install @txshield/react @txshield/core react
# for the full pipeline (simulation + balance preview):
npm install @txshield/simulation
```

## Turnkey: `useTxGuard` + `<TxGuardModal>`

`useTxGuard` runs the full pipeline — static verdict synchronously, then (when given an `rpc`)
resolves lookup tables, simulates, and produces a **balance preview** (`stateChanges`). Drop the
result into `<TxGuardModal>`:

```tsx
import { useTxGuard, TxGuardModal } from "@txshield/react";
import { DEFAULT_PROGRAM_ALLOWLIST, DEFAULT_PROGRAM_CAPABILITIES } from "@txshield/registry";

function ConfirmSwap({ txBytes, user, rpc, onSign, onClose }) {
  const { report, stateChanges, loading } = useTxGuard(txBytes, {
    user,
    rpc, // your SimRpc adapter — enables simulation + the balance preview
    allowedPrograms: DEFAULT_PROGRAM_ALLOWLIST,
    programCapabilities: DEFAULT_PROGRAM_CAPABILITIES,
    tokenMeta: { [usdcMint]: { symbol: "USDC", decimals: 6 } },
  });

  return (
    <TxGuardModal
      open
      report={report}
      stateChanges={stateChanges}
      loading={loading}
      accent="#5b8cff"      // your brand color
      onConfirm={onSign}    // disabled automatically on a BLOCK verdict
      onCancel={onClose}
    />
  );
}
```

`<TxGuardModal>` renders the verdict badge, the **"what this does to your wallet"** balance preview,
every finding, and Sign/Cancel — plus success / failure / expired outcomes (pass `outcome`).

### Theming

Neutral dark by default. Override the accent with the `accent` prop or `theme="light"`, or set CSS
variables on any ancestor (these win over the defaults):

```css
:root {
  --txs-bg: #16131a;      --txs-surface: #1c1820;   --txs-border: #2a1d24;
  --txs-text: #ececf1;    --txs-muted: #8f8794;     --txs-accent: #ff3b4e;
  --txs-ok: #34d399;      --txs-warn: #f59e0b;      --txs-danger: #f0506e;
}
```

## Headless: `useTxShield` + `<TxWarning>`

Static (offline, synchronous) verdict + a minimal inline warning — for when you render your own UI:

```tsx
import { useTxShield, TxWarning } from "@txshield/react";

const { report } = useTxShield(rawTxBytes, { allowedPrograms });
return <TxWarning report={report} />;
```

Icons (`ShieldIcon`, `AlertTriangleIcon`, `CheckCircleIcon`, …) and `severityTheme` are exported too.
