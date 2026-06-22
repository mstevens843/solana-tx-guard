import type { RiskReport } from "@txshield/core";
import { severityTheme, TxWarning, verdictIcon } from "@txshield/react";

export function ResultView({ report }: { report: RiskReport }) {
  const theme = severityTheme(report.action);
  return (
    <div className="result">
      <div className="badge" style={{ background: theme.color }}>
        <span className="badge-ic">{verdictIcon(theme.tone, { size: 15, color: "#fff" })}</span>
        {report.action} — {report.resultType}
      </div>

      <div className="meta">
        version: {String(report.meta.version)} · lookup&nbsp;tables:{" "}
        {String(report.meta.hasAddressLookups)} · atomic-guard&nbsp;recommended:{" "}
        {String(report.meta.atomicGuardRecommended)}
      </div>

      {report.warnings.length ? (
        <ul className="findings">
          {report.warnings.map((w, i) => (
            <li key={`${w.id}-${i}`} className={`sev-${w.severity.toLowerCase()}`}>
              <span className="kind">
                {w.severity} · {w.kind}
              </span>
              <span className="msg">{w.message}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="ok">No risks detected by static analysis.</div>
      )}

      <div className="component-demo">
        <div className="demo-label">This is what the drop-in &lt;TxWarning/&gt; renders:</div>
        <TxWarning report={report} />
      </div>
    </div>
  );
}
