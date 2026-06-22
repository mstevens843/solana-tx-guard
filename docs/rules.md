# TxShield Rules

Severity → verdict: **CRITICAL** ⇒ `action: BLOCK` / `Malicious`; **WARNING** ⇒ `WARN` /
`Warning`; **INFO** ⇒ `NONE` / `Benign`. Detection: `static` = no network, `both` = static +
RPC mint/state read, `sim` = needs simulation.

| ID | Name | Detection | Max severity | Status |
|----|------|-----------|--------------|--------|
| R01 | Durable nonce — transaction never expires | static | CRITICAL | ✅ implemented |
| R02 | System account ownership reassignment (Assign/AssignWithSeed) | static | CRITICAL | ✅ implemented |
| R03 | Token SetAuthority → AccountOwner (account takeover) | static | CRITICAL | ✅ implemented |
| R04 | Token SetAuthority → CloseAccount authority grab | static | WARNING | ✅ implemented |
| R05 | Token SetAuthority → Mint/Freeze authority transfer | static | WARNING | ✅ implemented |
| R06 | Large / unlimited delegate Approve | static | CRITICAL | ✅ implemented |
| R07 | CloseAccount sweeping lamports to non-owner | static | WARNING | ✅ implemented |
| R08 | SOL split-drain (multiple transfers to distinct recipients) | static | WARNING | ✅ implemented (near-full single transfer via sim/R17) |
| R08b | Nonce account Authorize/Withdraw hijack | static | WARNING | ✅ implemented |
| R09–R13 | Token-2022 risky mint extensions (permanent-delegate, hook, frozen, fee) | both | CRITICAL | ✅ offline-WARN (core R09) + full RPC read (`simulation.inspectToken2022Mints`) |
| R13 | Spoofed token account / lookalike mint | both | CRITICAL | ✅ lookalike-mint (core) + `verifyTokenAccounts` (simulation: real-owner + canonical-ATA check) |
| R14 | Address-lookup-table resolution gate (de-obfuscation) | static | WARNING | ✅ intrinsic (fail-closed) |
| R14b | Sensitive target (recipient/delegate) resolved via a mutable ALT | static | WARNING | ✅ implemented |
| R15 | Message version / parse gate | static | WARNING | ✅ intrinsic (fail-closed) |
| R16 | Decoy instructions hiding the real drain | static | INFO | ✅ implemented (light) |
| R17 | TOCTOU / sim-spoofing + inner-CPI laundered drains | both | CRITICAL | ✅ `elevate` + inner-CPI walk (`analyzeCpi`) + atomic-guard |
| R18 | Deferred-broadcast / co-signed value movement | static | WARNING | ✅ implemented |
| R19 | Stake account Authorize hijack | static | CRITICAL | ✅ implemented |
| R20 | Vote account Authorize/Withdraw hijack | static | WARNING | ✅ implemented |
| R21 | Program upgrade-authority change / live Upgrade | static | CRITICAL | ✅ implemented |
| R22 | Unknown / opaque program with writable user account | both | WARNING | ✅ implemented |
| R23 | Undecoded sensitive instruction (fail-closed) | static | CRITICAL | ✅ implemented |
| R24 | Known-drainer denylist (program / address / mint) | static | CRITICAL | ✅ implemented (host-supplied; registry data from verified incident reports) |
| R25 | Lookalike / address-poisoning recipient | static | WARNING | ✅ implemented (first-6 + last-6 match to the user's own or a known address) |
| R27 | Digest binding (broadcast bytes == analyzed bytes) | static | — | ✅ `sameMessage()` helper |

**Fail-closed posture:** anything on a value/authority-capable program (System, SPL Token,
Token-2022, Stake, Vote, upgradeable loader) that TxShield cannot fully decode and that touches a
user-writable account is treated as **CRITICAL** (R23), never benign. Stake/Vote/Loader are now
decoded for their recognized variants (R19/R20/R21); genuinely-unknown variants still fail closed.

**Per-program capability model:** programs declare which value-flows they legitimately perform
(`@txshield/registry`'s `DEFAULT_PROGRAM_CAPABILITIES`). The inner-CPI walk flags
`cpi-capability-violation` (CRITICAL) when an allowlisted/compromised program performs an inner op
outside its declared role (e.g. a swap router doing a SetAuthority) — precise, even on accounts
TxShield doesn't track.

**Atomic-guard:** for transactions that expose a user-writable account to a program TxShield can't
fully model (`meta.atomicGuardRecommended`), `@txshield/simulation` derives Lighthouse assertions
pinning each account's post-state so a divergent execution reverts on-chain — the non-spoofable
backstop for everything static + simulation can't see.
