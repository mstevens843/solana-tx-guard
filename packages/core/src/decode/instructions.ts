// Best-effort decode of core-program instructions (System, SPL Token, Token-2022) so rules
// can read instruction *kind* without re-parsing bytes. Anything on a value/authority-capable
// program that we cannot recognize is marked `undecodedSensitive` so it fails closed (R23).
//
// NOTE: production will route this through the Codama `identify*Instruction` clients
// (@solana-program/system|token|token-2022). The hand-rolled discriminator tables below are
// the minimal, fully-tested subset for the static slice; the `undecodedSensitive` fail-closed
// flag is exactly what guards against decoder/runtime drift.

import {
  ADDRESS_LOOKUP_TABLE_PROGRAM,
  ASSOCIATED_TOKEN_PROGRAM,
  BPF_LOADER_UPGRADEABLE,
  COMPUTE_BUDGET_PROGRAM,
  CORE_VALUE_CAPABLE_PROGRAMS,
  MEMO_PROGRAM,
  STAKE_PROGRAM,
  SYSTEM_PROGRAM,
  TOKEN_2022_PROGRAM,
  TOKEN_PROGRAM,
  VOTE_PROGRAM,
} from "../constants/programIds.js";
import type { DecodedInstructionData } from "../types.js";
import { readU32LE } from "../util/bytes.js";

const SYSTEM_IX: Record<number, string> = {
  0: "CreateAccount",
  1: "Assign",
  2: "Transfer",
  3: "CreateAccountWithSeed",
  4: "AdvanceNonceAccount",
  5: "WithdrawNonceAccount",
  6: "InitializeNonceAccount",
  7: "AuthorizeNonceAccount",
  8: "Allocate",
  9: "AllocateWithSeed",
  10: "AssignWithSeed",
  11: "TransferWithSeed",
  12: "UpgradeNonceAccount",
};

const TOKEN_IX: Record<number, string> = {
  0: "InitializeMint",
  1: "InitializeAccount",
  2: "InitializeMultisig",
  3: "Transfer",
  4: "Approve",
  5: "Revoke",
  6: "SetAuthority",
  7: "MintTo",
  8: "Burn",
  9: "CloseAccount",
  10: "FreezeAccount",
  11: "ThawAccount",
  12: "TransferChecked",
  13: "ApproveChecked",
  14: "MintToChecked",
  15: "BurnChecked",
  16: "InitializeAccount2",
  17: "SyncNative",
  18: "InitializeAccount3",
};

export const TOKEN_AUTHORITY_TYPE: Record<number, string> = {
  0: "MintTokens",
  1: "FreezeAccount",
  2: "AccountOwner",
  3: "CloseAccount",
};

// Bincode u32-LE enum tags.
const STAKE_IX: Record<number, string> = {
  0: "Initialize",
  1: "Authorize",
  2: "DelegateStake",
  3: "Split",
  4: "Withdraw",
  5: "Deactivate",
  6: "SetLockup",
  7: "Merge",
  8: "AuthorizeWithSeed",
  9: "InitializeChecked",
  10: "AuthorizeChecked",
  11: "AuthorizeCheckedWithSeed",
  12: "SetLockupChecked",
  13: "GetMinimumDelegation",
  14: "DeactivateDelinquent",
};

const VOTE_IX: Record<number, string> = {
  0: "InitializeAccount",
  1: "Authorize",
  2: "Vote",
  3: "Withdraw",
  4: "UpdateValidatorIdentity",
  5: "UpdateCommission",
  6: "VoteSwitch",
  7: "AuthorizeChecked",
  10: "AuthorizeWithSeed",
  11: "AuthorizeCheckedWithSeed",
};

const LOADER_IX: Record<number, string> = {
  0: "InitializeBuffer",
  1: "Write",
  2: "DeployWithMaxDataLen",
  3: "Upgrade",
  4: "SetAuthority",
  5: "Close",
  6: "ExtendProgram",
  7: "SetAuthorityChecked",
  8: "Migrate",
  9: "ExtendProgramChecked",
};

/** StakeAuthorize enum. */
export const STAKE_AUTHORIZE = { Staker: 0, Withdrawer: 1 } as const;

function readU64LE(data: Uint8Array, offset: number): bigint | undefined {
  if (offset + 8 > data.length) return undefined;
  let v = 0n;
  for (let i = 7; i >= 0; i--) v = (v << 8n) | BigInt(data[offset + i]!);
  return v;
}

function programCategory(programId: string): DecodedInstructionData["program"] {
  switch (programId) {
    case SYSTEM_PROGRAM:
      return "system";
    case TOKEN_PROGRAM:
      return "token";
    case TOKEN_2022_PROGRAM:
      return "token-2022";
    case STAKE_PROGRAM:
      return "stake";
    case VOTE_PROGRAM:
      return "vote";
    case BPF_LOADER_UPGRADEABLE:
      return "loader-upgradeable";
    case COMPUTE_BUDGET_PROGRAM:
      return "compute-budget";
    case MEMO_PROGRAM:
      return "memo";
    case ASSOCIATED_TOKEN_PROGRAM:
      return "associated-token";
    case ADDRESS_LOOKUP_TABLE_PROGRAM:
      return "address-lookup-table";
    default:
      return "unknown";
  }
}

export interface DecodeResult {
  decoded: DecodedInstructionData;
  undecodedSensitive: boolean;
}

export function decodeInstruction(programId: string, data: Uint8Array): DecodeResult {
  const program = programCategory(programId);
  const valueCapable = CORE_VALUE_CAPABLE_PROGRAMS.has(programId);

  if (program === "system") {
    const disc = readU32LE(data, 0);
    const kind = disc === undefined ? undefined : SYSTEM_IX[disc];
    const fields: Record<string, unknown> = {};
    if (kind === "Transfer" || kind === "WithdrawNonceAccount") {
      const lamports = readU64LE(data, 4);
      if (lamports !== undefined) fields.lamports = lamports.toString();
    }
    return {
      decoded: { program, kind, discriminator: disc, fields },
      undecodedSensitive: kind === undefined,
    };
  }

  if (program === "token" || program === "token-2022") {
    const disc = data.length > 0 ? data[0]! : undefined;
    const kind = disc === undefined ? undefined : TOKEN_IX[disc];
    const fields: Record<string, unknown> = {};
    if (kind === "SetAuthority") {
      const at = data.length > 1 ? data[1]! : undefined;
      if (at !== undefined) {
        fields.authorityType = at;
        fields.authorityTypeName = TOKEN_AUTHORITY_TYPE[at] ?? `unknown(${at})`;
      }
    } else if (kind === "Approve" || kind === "ApproveChecked") {
      const amount = readU64LE(data, 1);
      if (amount !== undefined) fields.amount = amount.toString();
    }
    return {
      decoded: { program, kind, discriminator: disc, fields },
      // A token ix we can't name is sensitive (token is value-capable).
      undecodedSensitive: kind === undefined,
    };
  }

  // Stake / Vote / upgradeable loader: all use u32-LE bincode tags. Recognized variants are
  // decoded (rules R19/R20/R21 read the data); unrecognized ones stay fail-closed.
  if (program === "stake" || program === "vote" || program === "loader-upgradeable") {
    const map = program === "stake" ? STAKE_IX : program === "vote" ? VOTE_IX : LOADER_IX;
    const disc = readU32LE(data, 0);
    const kind = disc === undefined ? undefined : map[disc];
    return {
      decoded: { program, kind, discriminator: disc },
      undecodedSensitive: kind === undefined,
    };
  }

  return {
    decoded: { program },
    undecodedSensitive: valueCapable,
  };
}
