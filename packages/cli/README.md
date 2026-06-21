# @txshield/cli

Scan a Solana transaction for drain risk from the terminal — for CI gates and incident triage.
Part of [TxShield](https://github.com/mstevens843/txshield).

```sh
npx @txshield/cli scan <base64 | file | signature>
```

Exits non-zero on a `BLOCK` verdict, so it drops straight into a CI gate.
