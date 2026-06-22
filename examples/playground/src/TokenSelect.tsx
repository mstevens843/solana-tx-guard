import { useEffect, useState } from "react";
import { TOKENS, type Token, searchBirdeye } from "./tokens";

function fmtPrice(p: number): string {
  if (p < 0.01) return `$${p.toExponential(2)}`;
  return `$${p.toFixed(p < 1 ? 4 : 2)}`;
}

export function TokenSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Token;
  onChange: (t: Token) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Token[]>([]);
  const [searching, setSearching] = useState(false);

  // Debounced Birdeye search: 1s after typing stops, ≥2 chars (mirrors SolPulse).
  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      const r = await searchBirdeye(q.trim());
      setResults(r);
      setSearching(false);
    }, 1000);
    return () => clearTimeout(t);
  }, [q]);

  function pick(t: Token) {
    onChange(t);
    setOpen(false);
    setQ("");
    setResults([]);
  }

  return (
    <div className="token-select">
      <span className="ts-label">{label}</span>
      <button type="button" className="ts-btn" onClick={() => setOpen((v) => !v)}>
        {value.logoURI && <img src={value.logoURI} alt="" className="ts-logo" />}
        <span className="ts-sym">{value.symbol}</span>
        <span className="ts-caret">▾</span>
      </button>

      {open && (
        <div className="ts-pop">
          <input
            // biome-ignore lint/a11y/noAutofocus: search box in a popover
            autoFocus
            placeholder="search any token (name or symbol)…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {searching && <div className="ts-hint">searching…</div>}

          {results.length > 0 ? (
            <div className="ts-list">
              {results.map((t) => (
                <button type="button" key={t.mint} className="ts-item" onClick={() => pick(t)}>
                  {t.logoURI ? (
                    <img src={t.logoURI} alt="" className="ts-logo" />
                  ) : (
                    <span className="ts-logo placeholder" />
                  )}
                  <span className="ts-sym">{t.symbol}</span>
                  <span className="ts-name">{t.name}</span>
                  {t.price != null && <span className="ts-price">{fmtPrice(t.price)}</span>}
                </button>
              ))}
            </div>
          ) : (
            q.trim().length < 2 && (
              <div className="ts-quick">
                {TOKENS.map((t) => (
                  <button type="button" key={t.mint} className="ts-chip" onClick={() => pick(t)}>
                    {t.symbol}
                  </button>
                ))}
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
