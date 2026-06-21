# Security Policy

TxShield is safety-of-funds infrastructure. We hold ourselves to a fail-closed standard.

## Threat model (summary)

TxShield analyzes a transaction **before a user signs it** and tries to make it impossible
for a drainer to get a "safe" verdict on a transaction that drains the user. The full model
is in [`docs/threat-model.md`](./docs/threat-model.md). Core guarantees:

- **Fail-closed, never fail-open.** Any input we cannot fully decode on a value- or
  authority-capable program (System / SPL Token / Token-2022 / Stake / Vote / upgradeable
  loader) that touches a user-writable account yields **DANGER**, never `Benign`. Malformed,
  oversized, or version-spoofed messages can never produce a clean verdict.
- **Simulation is additive only.** A benign simulation result may never upgrade a verdict
  to "safe"; it can only add findings. Divergence between the static read and simulation
  *elevates* severity.
- **Allowlist is a label, not a trust grant.** Being on the program allowlist never exempts
  a program from value-flow analysis, because an allowlisted program can still CPI
  arbitrarily. User-writable accounts exposed to a program we can't fully model are treated
  as an exfiltration surface.
- **The only non-spoofable guarantee is on-chain.** Where static + simulation are
  insufficient (hidden CPIs, mutable lookup tables, TOCTOU), the atomic-guard appends
  Lighthouse assertions so a divergent execution reverts on-chain.

## Known limitations (pre-1.0)

- Inner-CPI drains are only fully covered with simulation + atomic-guard enabled.
- Token-2022 mint-extension rules require an RPC read; offline they degrade to **WARN**
  (never `Benign`).
- Address-lookup-table contents are mutable; a clean static verdict requires the host to
  call the submit-time re-resolution hook (capability handshake).

## Reporting a vulnerability

If you find a transaction that drains a user but receives a `NONE`/`Benign` verdict (or a
way to evade a rule), please report it privately to **security@txshield.dev** (placeholder —
update before launch) rather than opening a public issue. Include the raw transaction bytes
or a reproduction. We aim to acknowledge within 72 hours.

Every confirmed bypass becomes a permanent regression fixture in `fixtures/adversarial/`.
