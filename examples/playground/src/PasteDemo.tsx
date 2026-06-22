import { useTxShield } from "@txshield/react";
import { useState } from "react";
import { EXAMPLES } from "./buildExamples";
import { ResultView } from "./ResultView";

export function PasteDemo() {
  const [input, setInput] = useState("");
  const trimmed = input.trim();
  const { report } = useTxShield(trimmed || null);

  return (
    <div className="paste">
      <p className="tag">
        Manual / developer view: paste a base64 transaction (or click a crafted sample) — the analysis
        runs <strong>entirely in your browser</strong>, no backend. For the realistic end-to-end flow,
        use the <strong>Try a real swap</strong> tab.
      </p>

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
    </div>
  );
}
