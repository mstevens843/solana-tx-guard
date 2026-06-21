import { useState } from "react";
import { useTxShield } from "@txshield/react";
import { EXAMPLES } from "./buildExamples";
import { ResultView } from "./ResultView";

export function App() {
  const [input, setInput] = useState("");
  const trimmed = input.trim();
  const { report } = useTxShield(trimmed || null);

  return (
    <div className="app">
      <header>
        <h1>🛡️ TxShield</h1>
        <p className="tag">
          Open Solana transaction-safety. Paste a transaction (base64) or try a sample — the
          analysis runs <strong>entirely in your browser</strong>, no backend.
        </p>
      </header>

      <div className="examples">
        {EXAMPLES.map((e) => (
          <button
            key={e.label}
            type="button"
            className="chip"
            title={e.description}
            onClick={() => setInput(e.base64)}
          >
            {e.label}
          </button>
        ))}
      </div>

      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Paste a base64-encoded Solana transaction…"
        rows={5}
        spellCheck={false}
      />

      {report && <ResultView report={report} />}

      <footer>
        Static analysis only. For inner-CPI detection + on-chain enforcement (the Lighthouse
        atomic-guard), add <code>@txshield/simulation</code>.
      </footer>
    </div>
  );
}
