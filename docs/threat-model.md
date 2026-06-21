# TxShield Threat Model

TxShield assumes a sophisticated drainer who has read this repo. The goal: a drainer must not be
able to obtain a `NONE`/`Benign` verdict on a transaction that drains the user. This document maps
each known evasion technique to the rule/requirement that covers it. Cases marked **(staged)** are
designed-for but land with simulation + atomic-guard.

## The three tiers

1. **Static decode** — offline, instant, fail-closed. The trust anchor for explicit drain
   primitives. Never returns "safe" on anything it can't fully decode (R14/R15/R23).
2. **Simulation** — advisory, additive-only. May add findings and *elevate* on divergence; a
   benign simulation can never clear a static finding.
3. **Atomic-guard** — Lighthouse on-chain assertions pinning every user-writable account's
   post-state. The only non-spoofable channel; the backstop for everything static + sim can't see.

## Evasion technique → coverage

| Evasion technique | Covered by |
|---|---|
| Durable-nonce time-bomb (sign now, broadcast later) | R01 — detect AdvanceNonceAccount at **any** index; CRITICAL when combined with value movement or any user-writable exposure |
| Silent System `Assign` ownership handoff (the documented Blowfish miss) | R02 — static, fires even when simulation shows a zero balance diff |
| Token account / mint / freeze authority takeover | R03/R04/R05 |
| Unlimited or low-balance "future-funded" delegate approval | R06 — any non-allowlisted delegate is dangerous regardless of amount |
| Address-lookup-table obfuscation (hide the destination behind an index) | R14 — resolve ALTs before any rule; unresolved ⇒ fail-closed; **sensitive targets via ALT ⇒ DANGER (staged)** |
| Malformed / version-spoofed message that parses "clean" | R15 — fail-closed on parse/version inconsistency; fuzz CI |
| Decoy/padding instructions burying the real drain | R16 — verdict is the union of per-ix findings (no "looks like a swap" short-circuit) |
| TOCTOU / simulation spoofing (benign sim, malicious execution) | R17 + atomic-guard — sim is additive-only; static danger is never suppressed; **Lighthouse assertions make divergence revert** ✅ |
| Decoder-vs-runtime drift on a core program (unknown variant) | R23 — undecoded sensitive ix ⇒ DANGER/CRITICAL, never benign; CI discriminator-coverage test (staged) |
| **CPI-laundered drain** through an allowlisted/lookalike program | R22 flags the exposure + sets `meta.atomicGuardRecommended`; the **inner-CPI walk** (`analyzeCpi`) decodes simulation `innerInstructions` and flags hidden authority/ownership grabs ✅; the **per-program capability model** flags any inner op a program isn't declared to perform ✅; the **atomic-guard pins post-state on-chain** ✅ so divergent execution reverts. Allowlist is a label, never a CPI-safety grant |
| Co-signed / partial-sign deferred broadcast | R18 |
| Stake / Vote / upgrade-authority hijack | R19/R20/R21 (currently fail-closed via R23) |
| Lookalike program id (vanity / IDL-label spoof) | R22 — match by full 32-byte equality; protocol labels only from the trusted registry, never attacker IDL |
| Mutable ALT swapped between analyze() and broadcast | **(staged)** submit-time re-resolution is a hard precondition (capability handshake); mutable ALT ⇒ WARN; pin via Lighthouse |
| Lighthouse atomic-guard size-exhaustion | **(staged)** when assertions can't fit on a user-writable-exposing tx, hard BLOCK (non-overridable) |
| Token-2022 mint-extension honeypot read offline | R09–R13 — offline ⇒ WARN `token-2022-extensions-uninspected`, never Benign **(staged)** |

Every confirmed bypass is captured as a permanent regression in `fixtures/adversarial/`.
