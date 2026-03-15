# SmashDex

Modern rewrite of SmashDex into **Vite + React + TypeScript + MUI**, with offline-friendly PWA caching.

## Routes

- `/` — SmashDex
- `/smash` — legacy alias that redirects to `/`

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

SmashDex keeps the legacy keys for seamless migration:

- `smashdex_history`
- `smashdex_filters`
- `smashdex_options`
- `smashdex_favorites`
- `smashdex_mode`
