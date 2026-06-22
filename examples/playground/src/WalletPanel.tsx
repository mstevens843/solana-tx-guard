import { analyze } from "@txshield/core";
import type { RiskReport } from "@txshield/core";
import { DEFAULT_DENYLISTS } from "@txshield/registry";
import { useState } from "react";
import { AlertIcon, KeyIcon, RefreshIcon } from "./icons";
import { confirmSignature, getLatestBlockhash, sendRawTx } from "./jupiter";
import { TOKENS } from "./tokens";
import { useWallet } from "./WalletContext";
import {
  buildTransferTx,
  clearWallet,
  createWallet,
  exportSecret,
  importWallet,
  saveWallet,
  signTx,
} from "./wallet";

const SYMBOLS = new Map(TOKENS.map((t) => [t.mint, t.symbol]));
const short = (s: string) => `${s.slice(0, 4)}…${s.slice(-4)}`;

export function WalletPanel() {
  const { keypair, address, sol, tokens, loading, setKeypair, refresh } = useWallet();
  const [importing, setImporting] = useState(false);
  const [secret, setSecret] = useState("");
  const [importErr, setImportErr] = useState("");
  const [copied, setCopied] = useState(false);
  const [showSend, setShowSend] = useState(false);
  const [to, setTo] = useState("");
  const [sendAmt, setSendAmt] = useState("0.01");
  const [sending, setSending] = useState(false);
  const [sendReport, setSendReport] = useState<RiskReport | null>(null);
  const [sendStatus, setSendStatus] = useState("");
  const [sendSig, setSendSig] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [secretCopied, setSecretCopied] = useState(false);

  function onCreate() {
    const kp = createWallet();
    saveWallet(kp);
    setKeypair(kp);
  }

  function onImport() {
    setImportErr("");
    try {
      const kp = importWallet(secret);
      saveWallet(kp);
      setKeypair(kp);
      setSecret("");
      setImporting(false);
    } catch (e) {
      setImportErr(e instanceof Error ? e.message : String(e));
    }
  }

  function onCopy() {
    if (!address) return;
    navigator.clipboard?.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function onCopySecret() {
    if (!keypair) return;
    navigator.clipboard?.writeText(exportSecret(keypair));
    setSecretCopied(true);
    setTimeout(() => setSecretCopied(false), 1500);
  }

  async function onSend() {
    if (!keypair || !address) return;
    setSending(true);
    setSendStatus("");
    setSendSig("");
    setSendReport(null);
    try {
      const lamports = Math.round(Number(sendAmt) * 1e9);
      if (!Number.isFinite(lamports) || lamports <= 0) throw new Error("enter a SOL amount > 0");
      const blockhash = await getLatestBlockhash();
      const unsigned = buildTransferTx(keypair, to.trim(), lamports, blockhash);
      setSendReport(analyze(unsigned, { user: address, denylists: DEFAULT_DENYLISTS })); // guard runs on the send too
      const sig = await sendRawTx(signTx(unsigned, keypair));
      setSendStatus(`submitted ${short(sig)} — confirming…`);
      const conf = await confirmSignature(sig);
      if (conf.confirmed) {
        setSendSig(sig);
        setSendStatus("confirmed");
      } else {
        setSendStatus(`failed on-chain: ${conf.err}`);
      }
      setTimeout(refresh, 1500);
    } catch (e) {
      setSendStatus(`failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSending(false);
    }
  }

  if (!keypair) {
    return (
      <div className="wallet-card">
        <p className="wallet-prompt">Create or import a test wallet to try a real swap.</p>
        <div className="wallet-actions">
          <button type="button" className="primary" onClick={onCreate}>
            Create wallet
          </button>
          <button type="button" onClick={() => setImporting((v) => !v)}>
            Import
          </button>
        </div>
        {importing && (
          <div className="import-box">
            <input
              placeholder="paste a base58 secret key, or a [1,2,3,…] array"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
            />
            <button type="button" onClick={onImport}>
              Import
            </button>
            {importErr && <div className="error">{importErr}</div>}
          </div>
        )}
        <p className="warn">
          <AlertIcon size={13} /> Throwaway test wallet — its private key is stored unencrypted in
          your browser. Use a fresh wallet and small amounts only.
        </p>
      </div>
    );
  }

  return (
    <div className="wallet-card">
      <div className="wallet-head">
        <div>
          <div className="wallet-addr">{address ? short(address) : ""}</div>
          <div className="wallet-sol">{loading ? "…" : `${sol.toFixed(4)} SOL`}</div>
        </div>
        <div className="wallet-actions">
          <button type="button" onClick={onCopy}>
            {copied ? "Copied!" : "Receive"}
          </button>
          <button type="button" onClick={() => setShowSend((v) => !v)}>
            Send
          </button>
          <button type="button" onClick={refresh} title="refresh balances">
            <RefreshIcon size={14} />
          </button>
          <button type="button" onClick={() => setShowSecret((v) => !v)}>
            Export key
          </button>
          <button type="button" className="ghost" onClick={() => { clearWallet(); setKeypair(null); }}>
            Disconnect
          </button>
        </div>
      </div>

      {showSecret && keypair && (
        <div className="secret-box">
          <div className="secret-label">Private key (base58) — for import elsewhere:</div>
          <div className="secret-key">{exportSecret(keypair)}</div>
          <div className="secret-actions">
            <button type="button" onClick={onCopySecret}>
              {secretCopied ? "Copied!" : "Copy key"}
            </button>
            <button type="button" className="ghost" onClick={() => setShowSecret(false)}>
              Hide
            </button>
          </div>
          <p className="warn small">
            <KeyIcon size={13} /> Anyone with this key fully controls the wallet. Never share it or
            paste it anywhere you don't trust.
          </p>
        </div>
      )}

      {showSend && (
        <div className="send-box">
          <input placeholder="recipient address" value={to} onChange={(e) => setTo(e.target.value)} />
          <input
            type="number"
            value={sendAmt}
            min="0"
            step="0.01"
            onChange={(e) => setSendAmt(e.target.value)}
          />
          <button type="button" disabled={sending || !to.trim()} onClick={onSend}>
            {sending ? "Sending…" : "Send SOL"}
          </button>
          {sendReport && (
            <div className="send-verdict">
              guard: <b>{sendReport.action}</b> —{" "}
              {sendReport.warnings[0]?.message ?? "no risks detected"}
            </div>
          )}
          {sendStatus && (
            <div className="send-status">
              {sendStatus}
              {sendSig && (
                <>
                  {" "}
                  <a href={`https://solscan.io/tx/${sendSig}`} target="_blank" rel="noreferrer">
                    Solscan ↗
                  </a>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {tokens.length > 0 && (
        <div className="balances">
          {tokens.map((t) => (
            <div key={t.mint} className="bal-row">
              <span className="bal-sym">{SYMBOLS.get(t.mint) ?? short(t.mint)}</span>
              <span className="bal-amt">
                {t.amount.toLocaleString(undefined, { maximumFractionDigits: 4 })}
              </span>
            </div>
          ))}
        </div>
      )}

      <p className="warn small">
        <AlertIcon size={13} /> Throwaway test wallet — key stored in your browser. Small amounts only.
      </p>
    </div>
  );
}
