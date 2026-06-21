# @txshield/registry

Offline data for [TxShield](https://github.com/mstevens843/txshield): the program allowlist, drainer
denylist, trusted-mint registry, and per-program capability declarations. No network dependency.

```sh
npm install @txshield/registry
```

```ts
import { DEFAULT_PROGRAM_ALLOWLIST, DEFAULT_PROGRAM_CAPABILITIES } from "@txshield/registry";

analyze(tx, { allowedPrograms: DEFAULT_PROGRAM_ALLOWLIST });
```
