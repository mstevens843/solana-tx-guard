# @txshield/playground

A static, **fully client-side** demo of TxShield. Paste a base64 Solana transaction (or click a
preloaded drain) and watch the analysis run live in your browser — no backend, no RPC. It dogfoods
`@txshield/react` (`useTxShield` + `<TxWarning/>`) and showcases the static analyzer.

## Run locally

```
pnpm --filter @txshield/playground dev      # http://localhost:5173
```

## Build a static site (deploy to GitHub Pages / Vercel / Netlify)

```
pnpm --filter @txshield/playground build     # → examples/playground/dist
```

`vite.config.ts` uses `base: "./"` so the build works from any subpath.

## Preloaded examples

Benign transfer · durable-nonce (never expires) · token-account takeover · ownership
reassignment · unlimited token approval · lookalike mint · ALT-hidden recipient. Each is built
in-browser by `src/buildExamples.ts` and asserted in `test/examples.test.ts`
(`pnpm --filter @txshield/playground test`) so the demo data can never drift from the analyzer.
