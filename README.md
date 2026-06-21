# TxShield

**Open, embeddable Solana transaction-safety. Pre-sign drain detection + open on-chain
atomic-guard — for every wallet and app that the closed scanners lock out.**

> ⚠️ Pre-1.0 / in active development. The full static analyzer (17 rules), the simulation diff +
> inner-CPI walk + per-program capability model, and the **Lighthouse atomic-guard** all run today;
> the atomic-guard is **proven on mainnet** — a false assertion reverts the transaction on-chain
> with Lighthouse custom error `6001`. Do not rely on it as your sole control until 1.0. See
> [`SECURITY.md`](./SECURITY.md).

Every good "is this transaction safe to sign?" scanner on Solana is **closed and hosted** —
Blowfish (powers Phantom), Blockaid (MetaMask/Backpack/Coinbase), GoPlus, Wallet Guard.
A small wallet, an indie dApp, a Solana-Mobile app, or a trading UI gets *nothing*: you
can't drop a paid hosted API into your Confirm hot path (latency, cost, privacy, an
availability dependency on every signature).

TxShield is the **open** alternative: a tree-shakeable TypeScript library you embed in your
Confirm screen. Hand it the raw transaction bytes, get back a plain-English `RiskReport`.
No mandatory network for the static verdict; it runs in the browser, Node, React Native,
and Capacitor.

## Why it can't be easily sidestepped

A scanner a drainer can trick is worse than nothing, so TxShield uses three additive tiers:

1. **Static decode** (offline, instant) — flags explicit drain primitives and is
   **fail-closed**: anything it can't fully decode on a sensitive program is treated as
   dangerous, never "safe".
2. **Simulation** (optional RPC, advisory) — adds inner-CPI + balance/owner/delegate diffs.
   It can only *add* findings, never clear them; it *elevates* on divergence from the
   static read.
3. **Atomic-guard** (optional, on-chain) — appends [Lighthouse](https://github.com/Jac0xb/lighthouse)
   assertions pinning every user-writable account's post-state, so a divergent execution
   (hidden CPI drain, lookup-table swap, TOCTOU bit-flip) **reverts on-chain**. This is the
   open version of the guard logic Phantom keeps private.

## Flagship: durable-nonce detection

The headline finding most wallets get wrong: a transaction that **never expires**.
TxShield surfaces it as:

> 🔴 **This transaction never expires (durable nonce)** — it can be submitted at any future
> time, even after you think it failed.

## Quickstart

```ts
import { analyze } from "@txshield/core";

const report = analyze(rawTxBytes); // Uint8Array | base64 string

if (report.action === "BLOCK") {
  // refuse to sign
} else if (report.action === "WARN") {
  // show report.warnings in the Confirm screen
}
```

React Confirm-screen drop-in:

```tsx
import { useTxShield, TxWarning } from "@txshield/react";

const { report } = useTxShield(rawTxBytes);
return <TxWarning report={report} />;
```

CLI / CI:

```sh
npx @txshield/cli scan <base64 | file | signature>
```

## Try it

A live, **fully client-side** demo — paste a transaction or click a preloaded drain and watch the
verdict, no backend:

```sh
pnpm --filter @txshield/playground dev      # http://localhost:5173
```

Run the whole stack against mainnet with step-by-step diagnostics (exact payloads + PASS/FAIL at
every step; needs a Helius key in `.env`):

```sh
pnpm --filter @txshield/example-e2e-mainnet diagnose
```

## Packages

| Package | What it is |
|---|---|
| `@txshield/core` | Bytes → `RiskReport`. Decode + ALT resolution + rule engine. Runtime-agnostic, the trust anchor. |
| `@txshield/rules` | Built-in rule pack (durable-nonce, set-authority, approve, system-assign, …). Tree-shakeable. |
| `@txshield/registry` | Offline program allowlist, drainer denylist, trusted-mint registry. |
| `@txshield/simulation` | Optional RPC enrichment + the Lighthouse atomic-guard. |
| `@txshield/react` | `useTxShield()` + `<TxWarning/>` for web + React Native / Capacitor. |
| `@txshield/cli` | `txshield scan` for CI gates and incident triage. |

The full rule table lives in [`docs/rules.md`](./docs/rules.md); the threat model and how
each evasion technique is covered is in [`docs/threat-model.md`](./docs/threat-model.md).

## License

MIT © Mathew Stevens
