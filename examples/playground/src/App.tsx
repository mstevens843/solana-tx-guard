import { useState } from "react";
import { PasteDemo } from "./PasteDemo";
import { SwapDemo } from "./SwapDemo";
import { WalletProvider } from "./WalletContext";
import { WalletPanel } from "./WalletPanel";
import { ShieldIcon } from "./icons";

export function App() {
  const [tab, setTab] = useState<"swap" | "paste">("swap");

  return (
    <div className="app">
      <header>
        <h1>
          <span className="brand-mark">
            <ShieldIcon size={26} />
          </span>
          TxShield
        </h1>
        <p className="sub">
          Open Solana transaction-safety — see if a transaction is safe before you sign.
        </p>
      </header>

      <div className="tabs">
        <button
          type="button"
          className={tab === "swap" ? "tab active" : "tab"}
          onClick={() => setTab("swap")}
        >
          Try a real swap
        </button>
        <button
          type="button"
          className={tab === "paste" ? "tab active" : "tab"}
          onClick={() => setTab("paste")}
        >
          Check a transaction
        </button>
      </div>

      {tab === "swap" ? (
        <WalletProvider>
          <WalletPanel />
          <SwapDemo />
        </WalletProvider>
      ) : (
        <PasteDemo />
      )}

      <footer>
        Static analysis runs in your browser. For inner-CPI detection + on-chain enforcement (the
        Lighthouse atomic-guard), add <code>@txshield/simulation</code>.
      </footer>
    </div>
  );
}
