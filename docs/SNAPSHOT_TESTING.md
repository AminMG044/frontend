# Snapshot testing

Snapshot tests live next to the component test suite and use Vitest's `toMatchSnapshot` matcher. They capture the rendered DOM of stable, user-visible components so accidental markup, accessibility-label, and class changes are visible in review.

Run the suite with:

```bash
npm run test:run -- src/components/ui-components.snapshot.test.tsx
```

When a visual or accessibility change is intentional, review the diff first and update snapshots with `npm run test:run -- -u`. Never update snapshots merely to make CI green; the rendered change should be explained in the PR.
