# @txshield/simulation

Optional RPC enrichment + the open **Lighthouse atomic-guard** for
[TxShield](https://github.com/mstevens843/txshield). Advisory only — it can only *add* findings,
never clear them. The atomic-guard appends on-chain assertions so a divergent execution **reverts**
(proven on mainnet: a false assertion reverts with Lighthouse custom error `6001`).

```sh
npm install @txshield/simulation @txshield/core
```

```ts
import { simulateAndDiff, buildAtomicGuard, verifyTokenAccounts } from "@txshield/simulation";
```
