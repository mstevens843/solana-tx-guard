# @txshield/playground

A demo of TxShield with two tabs:

- **Try a real swap** — the realistic flow: pick a token, the app builds a **real, unsigned** Jupiter
  swap, and TxShield checks it **before you'd sign** (the confirm-screen moment). No real SOL is
  spent — this is exactly how it runs inside a real app.
- **Check a transaction** — the manual / dev view: paste a base64 transaction (or click a crafted
  drain) and see the verdict. Runs fully client-side, no backend.

## Run locally

```
pnpm --filter @txshield/playground dev      # http://localhost:5173
```

The **swap tab** calls Jupiter + Helius through a dev-only Vite proxy that reads keys from the
repo-root `.env` (`HELIUS_RPC_URL`, `JUP_API_KEY`, `JUP_ULTRA_BASE`) — keys stay in the dev server,
never in the browser, and a browser User-Agent is injected so Jupiter's Cloudflare doesn't 403.
(Add `BIRDEYE_API_KEY` to enable token search; otherwise a curated token list is used.) The paste
tab needs no keys.

## Build a static site (deploy to GitHub Pages / Vercel / Netlify)

```
pnpm --filter @txshield/playground build     # → examples/playground/dist
```

`vite.config.ts` uses `base: "./"`. The proxy is dev-only, so a static deploy serves the paste tab;
the swap tab needs the dev server (or your own serverless proxy) to hold the API keys.

## Preloaded paste examples

Benign transfer · durable-nonce (never expires) · token-account takeover · ownership
reassignment · unlimited token approval · lookalike mint · ALT-hidden recipient. Each is built
in-browser by `src/buildExamples.ts` and asserted in `test/examples.test.ts`
(`pnpm --filter @txshield/playground test`) so the demo data can never drift from the analyzer.
