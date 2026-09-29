# Lighthouse performance gates

Every pull request runs Lighthouse against the homepage and creator discovery page. The configuration uses three runs to reduce noise and fails the job when the minimum performance, accessibility, SEO, or Core Web Vitals budgets in `lighthouserc.cjs` are exceeded.

Reports are uploaded to Lighthouse's temporary public storage for review in the Actions log. They are intentionally temporary and contain no application secrets. To investigate a regression, compare the failing assertion and median run with the previous successful workflow; do not lower a budget without documenting the product reason in the PR.

Run locally with a production build:

```bash
npm run build
npx @lhci/cli@0.14.0 autorun --config=lighthouserc.cjs
```
