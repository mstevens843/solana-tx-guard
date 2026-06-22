# Publishing TxShield

Everything here is **your end** — it needs your npm + GitHub accounts. The repo is otherwise
publish-ready (build/test/typecheck green, `publishConfig.access: public` on every package, READMEs
in place, `.env` gitignored).

## Naming — all clear (checked 2026-06-21)

| Name | Status |
|---|---|
| npm packages `@txshield/*` (`@txshield/core`) | **free** (404 on the registry) |
| npm unscoped `txshield` | **free** |
| GitHub `github.com/mstevens843/solana-tx-guard` | **created + pushed** |

No fallback needed. (Old npm fallbacks if anything changes: `solana-txshield`, `txsentinel`, `signshield`.)
Before publishing, make sure your npm account owns the `txshield` user/org scope. npm scopes map
to npm users or organizations, so `@txshield/core` can only be published by an account with access
to that scope.

## Pre-publish checklist

```sh
pnpm install
pnpm build && pnpm test && pnpm typecheck   # must be all green (58 tests)
git status                                  # confirm .env is NOT listed (it's gitignored)
```

- [ ] `LICENSE` present (MIT) — ✅ at repo root.
- [ ] Each package has `publishConfig.access: public` — ✅.
- [ ] npm `txshield` scope exists and your account can publish to it.
- [ ] `npm whoami` returns your account (run `npm login` if not).

## First publish (simplest)

`@txshield/core` must publish before its dependents; `pnpm -r publish` resolves the order and
rewrites `workspace:*` to the real versions automatically.

```sh
npm login
npm whoami
pnpm build
pnpm -r publish --access public          # publishes all 6 public packages in dependency order
```

(Add `--no-git-checks` if you haven't committed yet.)

For the first release, publish manually from a logged-in local shell. A long-lived `NPM_TOKEN` is not
required for that path. If you later want GitHub Actions to publish, configure npm Trusted Publishing
or add an npm automation token deliberately; do not assume the release workflow can publish until one
of those auth paths is configured.

## Ongoing releases (Changesets — already wired)

```sh
pnpm changeset                # describe the change + pick semver bumps
pnpm changeset version        # apply version bumps + changelogs
pnpm build
pnpm release                  # = changeset publish (needs npm login)
```

## GitHub

```sh
git remote -v
# origin  https://github.com/mstevens843/solana-tx-guard.git
```

The repo is already created and pushed at `mstevens843/solana-tx-guard`.
(`.changeset/config.json` has `baseBranch: main` — keep shipping from `main`.)

## Deploy the demo playground (static site)

```sh
pnpm --filter @txshield/playground build     # → examples/playground/dist
```

Drop `examples/playground/dist` on GitHub Pages / Vercel / Netlify. `vite.config.ts` already sets
`base: "./"` so it works from any subpath.

## Sanity-check what will be published (no upload)

```sh
pnpm --filter @txshield/core publish --dry-run --no-git-checks
```

Repeat per package to inspect the tarball contents before going live.
