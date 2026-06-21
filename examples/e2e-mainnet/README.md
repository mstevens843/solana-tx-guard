# @txshield/example-e2e-mainnet

Live **mainnet** proofs via Helius. No keypair and no SOL are spent — everything runs through
`simulateTransaction` against real on-chain state.

## Setup

Copy `.env.example` → `.env` at the repo root and fill in your keys:

```
HELIUS_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
JUP_ULTRA_BASE=https://api.jup.ag/ultra/v1
JUP_API_KEY=YOUR_KEY
```

## Proof 1 — the atomic-guard reverts on-chain

```
pnpm --filter @txshield/example-e2e-mainnet prove
```

Builds a Lighthouse `AssertAccountInfo` over a real mainnet account (the USDC mint) and simulates
it (`sigVerify:false`, `replaceRecentBlockhash:true`). A **FALSE** assertion (`lamports == 0`)
reverts with Lighthouse custom error **6001 (AssertionFailed)**; a **TRUE** assertion
(`lamports >= 0`) passes. This proves the atomic-guard's assertions actually enforce on-chain — the
non-spoofable backstop behind `@txshield/simulation`.

## Proof 2 — analyze a real Jupiter swap

```
pnpm --filter @txshield/example-e2e-mainnet analyze-jup
```

Fetches a live Jupiter Ultra SOL→USDC swap and runs `analyze()` on the real transaction bytes. A
real v0 swap with address lookup tables correctly yields **WARN** + `atomicGuardRecommended: true`
(the lookup tables aren't resolvable offline, and the swap exposes user-writable accounts to the
Jupiter program — exactly the case the atomic-guard exists for).
