# @txshield/react

`useTxShield()` hook + `<TxWarning/>` Confirm-screen component for web and React Native / Capacitor.
Part of [TxShield](https://github.com/mstevens843/txshield).

```sh
npm install @txshield/react @txshield/core react
```

```tsx
import { useTxShield, TxWarning } from "@txshield/react";

const { report } = useTxShield(rawTxBytes);
return <TxWarning report={report} />;
```
