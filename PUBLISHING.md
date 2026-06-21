# Publishing TxShield

Everything here is **your end** — it needs your npm + GitHub accounts. The repo is otherwise
publish-ready (build/test/typecheck green, `publishConfig.access: public` on every package, READMEs
in place, `.env` gitignored).

## Naming — all clear (checked 2026-06-20)

| Name | Status |
|---|---|
| npm scope `@txshield/*` (`@txshield/core`) | **free** (404 on the registry) |
| npm unscoped `txshield` | **free** |
| GitHub `github.com/mstevens843/txshield` | **available** (404) |

No fallback needed. (Old fallbacks if anything changes: `solana-txshield`, `txsentinel`, `signshield`.)

## Pre-publish checklist

```sh
pnpm install
pnpm build && pnpm test && pnpm typecheck   # must be all green (58 tests)
git status                                  # confirm .env is NOT listed (it's gitignored)
```

- [ ] `LICENSE` present (MIT) — ✅ at repo root.
- [ ] Each package has `publishConfig.access: public` — ✅.
- [ ] `npm whoami` returns your account (run `npm login` if not).

## First publish (simplest)

`@txshield/core` must publish before its dependents; `pnpm -r publish` resolves the order and
rewrites `workspace:*` to the real versions automatically.

```sh
npm login
pnpm build
pnpm -r publish --access public          # publishes all 6 public packages in dependency order
```

(Add `--no-git-checks` if you haven't committed yet.)

## Ongoing releases (Changesets — already wired)

```sh
pnpm changeset                # describe the change + pick semver bumps
pnpm changeset version        # apply version bumps + changelogs
pnpm build
pnpm release                  # = changeset publish (needs npm login)
```

## GitHub

```sh
git init && git add -A && git commit -m "TxShield: open Solana transaction-safety"
gh repo create mstevens843/txshield --public --source=. --push
```

(`.changeset/config.json` has `baseBranch: main` — use `main`, or update that field if you ship from
`master`.)

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
