# Storybook

Living documentation for the Dorisio design system. Stories live next to the
component they document (`src/components/**/<name>.stories.tsx`).

## Running it

```bash
pnpm install
pnpm storybook        # dev server on http://localhost:6006
pnpm build-storybook  # static build into ./storybook-static
```

## What is covered

| Area | Components |
| --- | --- |
| Base UI (`src/components/ui`) | `Button`, `Card`, `Input`, `Label`, `Badge`, `Modal` |
| Shared (`src/components/shared`) | `LoadingSpinner`, `EmptyState`, `ErrorMessage`, `Skeleton`, `Avatar` |

Every story is tagged `autodocs`, so the Docs tab is generated from the
component's props. Prop tables come straight from the TypeScript types — when a
prop's type changes, its documentation changes with it.

## Conventions

- One `*.stories.tsx` file per component, named after the component.
- Group with `title: 'UI/<Component>'` or `title: 'Shared/<Component>'`.
- Use `args`/`argTypes` for anything interactive; use `render` only for
  multi-variant layouts (e.g. `SideBySide`, `Sizes`).
- No component is duplicated in a story — stories exercise the real import.
- The `@storybook/addon-a11y` addon reports accessibility violations in its
  panel for every story.

## Not (yet) included

These require an external account/secret and are intentionally out of scope for
the initial setup:

- **Hosted deployment** (Chromatic, Vercel, or GitHub Pages) — the static build
  is produced by `pnpm build-storybook` and can be served from any static host.
- **Visual regression testing** — `@storybook/addon-essentials` plus a hosted
  Storybook is the standard prerequisite for Chromatic/`@chromatic-com/storybook`.
  Once a Chromatic project exists, add the addon and a CI job.
