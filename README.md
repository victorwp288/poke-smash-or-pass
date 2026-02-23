# SmashDex (Poke Smash or Pass)

Modern rewrite of the original DOM-driven PWA into **Bun + Vite + React + TypeScript + Tailwind + shadcn/ui**, with offline-friendly PWA caching.

## Routes / games
- `/smash` — Smash / Pass (legacy feature parity)
- `/guess` — GuessDex (legacy feature parity)
- `/type-clash` — Type Clash
- `/silhouette-blitz` — Silhouette Blitz
- `/dex-rush` — Dex Rush

## Development
```bash
bun install
bun run dev
```

## Build / preview
```bash
bun run build
bun run preview
```

## Quality
```bash
bun run typecheck
bun run lint
bun run test
```

Playwright smoke tests live in `e2e/` and are configured via `playwright.config.ts`.

## LocalStorage compatibility
Smash/Guess keep the legacy keys for seamless migration:
- `smashdex_history`
- `smashdex_filters`
- `smashdex_options`
- `smashdex_favorites`
- `smashdex_mode`
- `smashdex_guess_stats`

New arcade games use new keys:
- `smashdex_game_type_clash`
- `smashdex_game_silhouette_blitz`
- `smashdex_game_dex_rush`

## Legacy reference build
The original static implementation is preserved under `public/legacy/` for reference during parity checks.

