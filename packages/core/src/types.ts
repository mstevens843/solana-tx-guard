// Shared TxShield types. The RiskReport deliberately mirrors Blowfish (`action`) and
// Blockaid (`resultType`/`validation`) field names so it drops into teams wired to either.

export type Severity = "INFO" | "WARNING" | "CRITICAL";
export type Action = "NONE" | "WARN" | "BLOCK";
export type ResultType = "Benign" | "Warning" | "Malicious" | "Error";
export type MessageVersion = "legacy" | 0;

export type CoreProgram =
  | "system"
  | "token"
  | "token-2022"
  | "stake"
  | "vote"
  | "loader-upgradeable"
  | "compute-budget"
  | "memo"
  | "address-lookup-table"
  | "associated-token"
  | "unknown";

export interface ResolvedAccount {
  index: number;
  address: string;
  writable: boolean;
  signer: boolean;
  source: "static" | "alt-writable" | "alt-readonly";
}

export interface DecodedInstructionData {
  program: CoreProgram;
  /** identified instruction name for a recognized core-program ix (e.g. "AdvanceNonceAccount"). */
  kind?: string;
  /** raw discriminator (System u32 / Token u8) when applicable. */
  discriminator?: number;
  fields?: Record<string, unknown>;
}

export interface DecodedInstruction {
  index: number;
  programId: string;
  /** true if the program id itself came from an address-lookup-table (program ids should be static). */
  programIdViaLookupTable: boolean;
  accounts: ResolvedAccount[];
  data: Uint8Array;
  decoded: DecodedInstructionData;
  /**
   * true when the ix targets a value/authority-capable program but its variant could not be
   * cleanly recognized — must fail closed (rule R23 undecoded-sensitive-ix).
   */
  undecodedSensitive: boolean;
}

export interface DecodedTransaction {
  version: MessageVersion;
  feePayer: string;
  numRequiredSignatures: number;
  /** count of present (non-empty) signatures in the wire transaction. */
  signaturesPresent: number;
  isFullySigned: boolean;
  /** full ordered account list: static keys, then ALT writable, then ALT readonly. */
  accounts: ResolvedAccount[];
  instructions: DecodedInstruction[];
  recentBlockhash: string;
  hasAddressLookups: boolean;
  /** true if any referenced ALT could not be resolved (offline/missing) — degrade + fail closed. */
  unresolvedLookupTables: boolean;
  /** the raw message bytes that were decoded (for submit-time digest binding). */
  messageBytes: Uint8Array;
}

export interface Finding {
  /** rule id, e.g. "R01_DURABLE_NONCE". */
  id: string;
  severity: Severity;
  /** stable machine kind, e.g. "durable-nonce". */
  kind: string;
  message: string;
  instructionIndex?: number;
  address?: string;
}

/** Advisory simulation context (additive-only). Produced by @txshield/simulation. */
export interface SimulationContext {
  ok: boolean;
  findings?: Finding[];
}

/**
 * What value-flows a program is declared capable of. Used to catch an allowlisted/compromised
 * program performing an inner CPI beyond its role (e.g. a swap router doing a SetAuthority).
 * An undeclared `true` is treated as "not allowed".
 */
export interface ProgramCapability {
  transferToken?: boolean;
  transferSol?: boolean;
  setAuthority?: boolean;
  assign?: boolean;
  approve?: boolean;
  closeToNonOwner?: boolean;
  upgrade?: boolean;
}

export interface AnalyzeOptions {
  /** treat this address as the protected user; defaults to the fee payer (account index 0). */
  user?: string;
  /**
   * program ids that may legitimately hold writable user accounts. This is a HUMAN LABEL only
   * — it never exempts a program from value-flow analysis (an allowlisted program can still
   * CPI arbitrarily). See SECURITY.md.
   */
  allowedPrograms?: ReadonlySet<string>;
  /** known-good delegate / recipient addresses (suppresses some counterparty findings). */
  allowedCounterparties?: ReadonlySet<string>;
  /** optional advisory simulation result; may only ADD findings, never clear them. */
  simulation?: SimulationContext;
  /** set true once Token-2022 mint extensions were inspected via RPC — suppresses the offline guard (R09). */
  mintsInspected?: boolean;
  /** per-program capability declarations (see @txshield/registry's DEFAULT_PROGRAM_CAPABILITIES). */
  programCapabilities?: ReadonlyMap<string, ProgramCapability>;
}

export interface AnalysisContext {
  tx: DecodedTransaction;
  /** the protected user address. */
  user: string;
  options: AnalyzeOptions;
}

export interface Rule {
  id: string;
  category: string;
  evaluate(ctx: AnalysisContext): Finding[];
}

export interface RiskReport {
  /** Blowfish-shaped top-level verdict. */
  action: Action;
  /** Blockaid-shaped classification. */
  resultType: ResultType;
  warnings: Finding[];
  expectedStateChanges: string[];
  validation: {
    classification: string;
    reason: string;
    features: string[];
  };
  meta: {
    version: MessageVersion | null;
    /** true if the verdict was forced dangerous by a decode/parse failure rather than a rule. */
    failClosed: boolean;
    fullySigned: boolean;
    hasAddressLookups: boolean;
    /**
     * true when a user-writable account is exposed to a program TxShield can't fully model — the
     * host should attach the @txshield/simulation atomic-guard before signing for a hard guarantee.
     */
    atomicGuardRecommended: boolean;
  };
  /** present when the transaction could not be parsed at all. */
  error?: string;
}
