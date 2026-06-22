// R19 — Stake account Authorize hijack. Handing the WITHDRAW authority to another party lets
// them deactivate and take your staked SOL; the STAKER authority is lower risk.

import { STAKE_PROGRAM } from "../constants/programIds.js";
import type { Finding, Rule } from "../types.js";
import { readU32LE } from "../util/bytes.js";

export const stakeAuthorizeRule: Rule = {
  id: "R19_STAKE_AUTHORIZE_HIJACK",
  category: "ownership-hijack",
  evaluate(ctx) {
    const out: Finding[] = [];
    for (const ix of ctx.tx.instructions) {
      if (ix.programId !== STAKE_PROGRAM) continue;
      const k = ix.decoded.kind;
      const userSigner = ix.accounts.some((a) => a.address === ctx.user && a.signer);
      if (!userSigner) continue;

      if (
        k === "Authorize" ||
        k === "AuthorizeWithSeed" ||
        k === "AuthorizeChecked" ||
        k === "AuthorizeCheckedWithSeed"
      ) {
        // StakeAuthorize u32: after disc(4) [+ pubkey(32) for the non-Checked variants].
        const offset = k === "Authorize" || k === "AuthorizeWithSeed" ? 36 : 4;
        const sa = readU32LE(ix.data, offset);
        if (sa === 1) {
          out.push({
            id: "R19_STAKE_AUTHORIZE_HIJACK",
            kind: "stake-withdraw-authority-hijack",
            severity: "CRITICAL",
            instructionIndex: ix.index,
            message:
              "This hands the WITHDRAW authority of your stake account to someone else — they can unstake and take your SOL.",
          });
        } else {
          out.push({
            id: "R19_STAKE_AUTHORIZE_STAKER",
            kind: "stake-staker-authority-change",
            severity: "WARNING",
            instructionIndex: ix.index,
            message: "This changes the staker authority of your stake account.",
          });
        }
      } else if (k === "Withdraw") {
        const dest = ix.accounts[1];
        if (dest && dest.address !== ctx.user) {
          out.push({
            id: "R19_STAKE_WITHDRAW",
            kind: "stake-withdraw",
            severity: "WARNING",
            instructionIndex: ix.index,
            address: dest.address,
            message: "This withdraws SOL from your stake account to another address.",
          });
        }
      }
    }
    return out;
  },
};
