import { decodeTransaction } from "@txshield/core";
import {
  TxGuardModal,
  type TxGuardOutcome,
  type UseTxGuardOptions,
  useTxGuard,
} from "@txshield/react";
import {
  DEFAULT_DENYLISTS,
  DEFAULT_PROGRAM_ALLOWLIST,
  DEFAULT_PROGRAM_CAPABILITIES,
} from "@txshield/registry";
import type { TokenMeta } from "@txshield/simulation";
import { useMemo, useState } from "react";
import { FlipIcon } from "./icons";
import { buildSwapOrder, confirmSignature, executeSwap, getDecimals, makeSimRpc } from "./jupiter";
import { SOL_MINT, type Token, USDC_MINT } from "./tokens";
import { TokenSelect } from "./TokenSelect";
import { useWallet } from "./WalletContext";
import { signTx } from "./wallet";

const DEFAULT_FROM: Token = { mint: SOL_MINT, symbol: "SOL", name: "Solana", decimals: 9 };
const DEFAULT_TO: Token = { mint: USDC_MINT, symbol: "USDC", name: "USD Coin", decimals: 6 };
const solscan = (sig?: string) => (sig ? `https://solscan.io/tx/${sig}` : undefined);

export function SwapDemo() {
  const { keypair, address, refresh } = useWallet();
  const [from, setFrom] = useState<Token>(DEFAULT_FROM);
  const [to, setTo] = useState<Token>(DEFAULT_TO);
  const [amount, setAmount] = useState("0.05");
  const [trustApp, setTrustApp] = useState(true);
  const [building, setBuilding] = useState(false);
  const [err, setErr] = useState("");
  const [order, setOrder] = useState<{ tx: string; requestId?: string } | null>(null);
  const [executing, setExecuting] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);
  const [outcome, setOutcome] = useState<TxGuardOutcome | null>(null);

  // A real app passes its own RPC adapter; the demo's is a browser Helius client.
  const rpc = useMemo(() => makeSimRpc(), []);

  // Configure the guard the way a real app would: trust your app's programs + an RPC that resolves
  // lookup tables + simulates. Trust OFF → strict, unconfigured (paranoid) static view.
  const guardOptions: UseTxGuardOptions = useMemo(() => {
    if (!address) return {};
    const baseOpts: UseTxGuardOptions = { user: address, denylists: DEFAULT_DENYLISTS };
    if (!trustApp || !order) return baseOpts;
    const top = new Set(decodeTransaction(order.tx).instructions.map((i) => i.programId));
    const tokenMeta: TokenMeta = {
      [from.mint]: { symbol: from.symbol, decimals: from.decimals },
      [to.mint]: { symbol: to.symbol, decimals: to.decimals },
    };
    return {
      ...baseOpts,
      allowedPrograms: new Set([...DEFAULT_PROGRAM_ALLOWLIST, ...top]),
      programCapabilities: DEFAULT_PROGRAM_CAPABILITIES,
      rpc,
      tokenMeta,
    };
  }, [address, trustApp, order, from, to, rpc]);

  // The shipped hook: static verdict synchronously, then simulation enrichment + balance preview.
  const { report, stateChanges, loading } = useTxGuard(order?.tx ?? null, guardOptions);

  function flip() {
    setFrom(to);
    setTo(from);
  }

  async function decimalsOf(t: Token): Promise<number> {
    if (typeof t.decimals === "number") return t.decimals;
    if (t.mint === SOL_MINT) return 9;
    return getDecimals(t.mint);
  }

  async function build(): Promise<void> {
    if (!address) throw new Error("create or import a wallet first");
    const dec = await decimalsOf(from);
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) throw new Error("enter an amount greater than 0");
    const baseUnits = BigInt(Math.round(n * 10 ** dec)).toString();
    const o = await buildSwapOrder({
      inputMint: from.mint,
      outputMint: to.mint,
      amount: baseUnits,
      taker: address,
    });
    setOrder({ tx: o.transaction, requestId: o.requestId });
  }

  async function onSwap() {
    if (!address) return;
    setBuilding(true);
    setErr("");
    setOrder(null);
    setOutcome(null);
    try {
      await build();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBuilding(false);
    }
  }

  // Quote expired → rebuild a fresh tx; useTxGuard re-checks the NEW bytes automatically.
  async function rebuild() {
    setRebuilding(true);
    try {
      await build();
      setOutcome(null);
    } catch (e) {
      setOutcome({ status: "error", message: `rebuild failed: ${e instanceof Error ? e.message : String(e)}` });
    } finally {
      setRebuilding(false);
    }
  }

  async function onExecute() {
    if (!keypair || !order) return;
    setExecuting(true);
    setOutcome(null);
    try {
      const signed = signTx(order.tx, keypair);
      const res = await executeSwap(signed, order.requestId);
      console.log("[TxShield demo] Ultra /execute response:", res); // deterministic execute log
      if (res.status === "Success" && res.signature) {
        const conf = await confirmSignature(res.signature);
        setOutcome(
          conf.confirmed
            ? { status: "success", message: "Swap confirmed on-chain.", signature: res.signature, explorerUrl: solscan(res.signature) }
            : { status: "error", message: `submitted but failed on-chain: ${conf.err}`, signature: res.signature, explorerUrl: solscan(res.signature) },
        );
        setTimeout(refresh, 1500);
      } else {
        const expired = !res.status || /expire|blockhash|block height|not.*processed/i.test(res.error ?? "");
        if (expired) {
          setOutcome({ status: "expired", message: "The quote expired (valid ~60–90s). Rebuild a fresh, re-checked transaction." });
        } else {
          const reason = res.error || (res.code != null ? `error code ${res.code}` : `status: ${res.status}`);
          setOutcome({ status: "error", message: reason, signature: res.signature, explorerUrl: solscan(res.signature) });
        }
      }
    } catch (e) {
      setOutcome({ status: "error", message: e instanceof Error ? e.message : String(e) });
    } finally {
      setExecuting(false);
    }
  }

  function closeModal() {
    if (executing) return;
    setOrder(null);
    setOutcome(null);
  }

  // Inject the rebuild handler into the expired outcome so the modal renders the rebuild button.
  const modalOutcome: TxGuardOutcome | null = outcome
    ? outcome.status === "expired"
      ? { ...outcome, onRebuild: rebuild, rebuilding }
      : outcome
    : null;

  return (
    <div className="swap">
      {!address && <div className="swap-locked">Create or import a wallet above to swap.</div>}

      <div className="swap-machine">
        <TokenSelect label="From" value={from} onChange={setFrom} />
        <input
          className="swap-amount"
          type="number"
          value={amount}
          min="0"
          step="0.01"
          placeholder="0.0"
          onChange={(e) => setAmount(e.target.value)}
        />
        <button type="button" className="flip" onClick={flip} title="flip sides">
          <FlipIcon size={16} />
        </button>
        <TokenSelect label="To" value={to} onChange={setTo} />
      </div>

      <label className="trust-toggle">
        <input type="checkbox" checked={trustApp} onChange={(e) => setTrustApp(e.target.checked)} />
        <span>
          Trust this app's programs{" "}
          <em>— how a developer configures TxShield; their own flows then show clean. Off = strict.</em>
        </span>
      </label>

      <button type="button" className="build-btn" disabled={!address || building} onClick={onSwap}>
        {building ? (
          <>
            <span className="spinner" /> Building &amp; checking…
          </>
        ) : (
          `Swap ${from.symbol} → ${to.symbol}`
        )}
      </button>
      {err && <div className="error">Couldn't build the swap: {err}</div>}

      <TxGuardModal
        open={!!order}
        report={report}
        stateChanges={stateChanges}
        loading={loading}
        busy={executing}
        outcome={modalOutcome}
        accent="#ff3b4e"
        title="Confirm swap"
        subtitle={`${from.symbol} → ${to.symbol} · checked before you sign`}
        confirmLabel="Sign & send"
        onConfirm={onExecute}
        onCancel={closeModal}
      />
    </div>
  );
}
