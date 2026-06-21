# Fixtures

Captured transactions used as regression tests. Three buckets:

- `benign/` — real legitimate transactions (swaps, transfers, legit offline durable-nonce signing)
  that must NOT be over-flagged.
- `malicious/` — real captured drainer transactions that must be flagged.
- `adversarial/` — hand-built bypass attempts from the red-team. **Every one of these must be
  caught**; each maps to a rule/requirement.

The adversarial corpus is currently authored as code (the source of truth) via the test compiler
(`packages/core/test/helpers.ts`):
- `packages/core/test/adversarial.test.ts` — the static bypasses.
- `packages/simulation/test/cpi.test.ts` — the CPI-laundered inner-instruction drain.

As real on-chain captures are added, drop them here as
`{ "base64": "...", "expect": { "action": "BLOCK", "kind": "durable-nonce" }, "source": "..." }`.

## Adversarial coverage matrix (red-team case → rule → proof)

| Adversarial case | Target rule | Status |
|---|---|---|
| Durable nonce NOT at index 0 | R01 (any-index) | ✅ adversarial.test |
| System `Assign` of the signer's own account | R02 | ✅ analyze.test |
| Token `SetAuthority(AccountOwner)` on user | R03 | ✅ analyze.test |
| Low/zero-amount approve on a soon-funded ATA | R06 (standing-grant) | ✅ adversarial.test |
| Decoy-padded drain among ComputeBudget/Memo | R16 + union | ✅ adversarial.test |
| ALT-hidden drain destination | R14b | ✅ adversarial.test |
| Undecodable core-program variant (decoder drift) | R23 | ✅ adversarial.test |
| Co-signed / partial-sign deferred broadcast | R18 | ✅ adversarial.test |
| Stake withdraw-authority hijack | R19 | ✅ adversarial.test / rules.test |
| **CPI-laundered drain via allowlisted program** | R17 inner-CPI walk (`analyzeCpi`) | ✅ cpi.test |
| Mutable-ALT swap between analyze() and broadcast | `verifyAltUnchanged` | ✅ alt.test |
| Lighthouse size-exhaustion → silent fallback | `guardFeasibility` hard-BLOCK | ✅ lighthouse.test |
| Token-2022 permanent-delegate honeypot | R09 offline-WARN + `inspectToken2022Mints` | ✅ rules.test / mints.test |
| Attacker-controlled RPC returns benign simulation | R17 additive-only + atomic-guard | 🔸 partial (mandatory-guard enforcement staged) |
