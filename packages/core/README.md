# @txshield/core

Decode a Solana transaction (raw bytes or base64) and get back a plain-English `RiskReport` — drain
detection that runs with **no network**, in the browser, Node, React Native, or Capacitor. The
runtime-agnostic trust anchor of [TxShield](https://github.com/mstevens843/txshield).

```sh
npm install @txshield/core
```

```ts
import { analyze } from "@txshield/core";

const report = analyze(rawTxBytes); // Uint8Array | base64 string
if (report.action === "BLOCK") refuseToSign();
else if (report.action === "WARN") show(report.warnings);
```

Flagship check: **durable-nonce detection** ("this transaction never expires"). Full rule table and
threat model in the [TxShield repo](https://github.com/mstevens843/txshield).
