# Dorisio Frontend Deployment Guide

## Overview

Dorisio Frontend is deployed on **Vercel** and connected to the Dorisio Backend API running on Stellar testnet.

## Prerequisites

- Vercel account (https://vercel.com)
- GitHub repository access
- Backend API running and accessible at configured URL

## Environment Variables

The following environment variables must be configured in Vercel:

### Required for All Environments

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL | `https://api.dorisio.dev` |
| `NEXT_PUBLIC_STELLAR_NETWORK` | Stellar network (testnet/public) | `testnet` |
| `NEXT_PUBLIC_STELLAR_HORIZON_URL` | Stellar Horizon API endpoint | `https://horizon-testnet.stellar.org` |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_ENABLE_ANALYTICS` | Enable analytics tracking | `false` |
| `NEXT_PUBLIC_ENABLE_ERROR_REPORTING` | Enable error reporting | `false` |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry DSN for browser error monitoring (unset disables reporting) | — |
| `SENTRY_DSN` | Sentry DSN for server/edge error monitoring | — |
| `NEXT_PUBLIC_SENTRY_ENVIRONMENT` | Environment label attached to Sentry events | `NODE_ENV` |
| `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE` | Share of transactions traced | `0.1` |
| `SENTRY_ORG` / `SENTRY_PROJECT` | Sentry org/project for source map upload | — |
| `SENTRY_AUTH_TOKEN` | Build token for source map upload (CI only) | — |

## Deployment Steps

### 1. Connect to Vercel

```bash
# Using Vercel CLI
npm i -g vercel
vercel link

# Or connect via web interface at https://vercel.com/new
# Select GitHub repository: Dorisio/frontend
```

### 2. Configure Environment Variables

In Vercel Project Settings → Environment Variables:

```
NEXT_PUBLIC_API_URL = https://api.dorisio.dev
NEXT_PUBLIC_STELLAR_NETWORK = testnet
NEXT_PUBLIC_STELLAR_HORIZON_URL = https://horizon-testnet.stellar.org
```

### 3. Deploy

```bash
# Deploy to production
vercel --prod

# Or push to main branch (auto-deploys if connected)
git push origin main
```

### 4. Verify Deployment

1. Visit your Vercel deployment URL
2. Check that pages load correctly
3. Test creator profile page: `/creators/[username]`
4. Test creator dashboard: `/creators/[username]/dashboard` (requires login)
5. Verify API connectivity in browser console

## Monitoring

### Health Checks

Monitor deployment health via:
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Performance**: Vercel Analytics tab
- **Errors**: Vercel Logs tab
- **Frontend Logs**: Browser DevTools Console

### Frontend Error Monitoring

Sentry is wired up through `sentry.client.config.ts`, `sentry.server.config.ts`,
and `sentry.edge.config.ts`, and `next.config.js` is wrapped with
`withSentryConfig`. Monitoring is a no-op when no DSN is set, so local and
preview environments do not need any Sentry configuration.

To enable it in production:

1. Create a Sentry project and copy its **DSN**.
2. Set `NEXT_PUBLIC_SENTRY_DSN` (browser) and `SENTRY_DSN` (server/edge).
3. To upload source maps during the build, also set `SENTRY_ORG`,
   `SENTRY_PROJECT`, and `SENTRY_AUTH_TOKEN`. Without `SENTRY_AUTH_TOKEN` the
   upload step is skipped so builds still succeed.

Uncaught exceptions, React errors caught by the app's `ErrorBoundary`, the
signed-in user context, and navigation breadcrumbs are all reported
automatically. Configure alert rules in the Sentry project for critical
error volume.

### Common Issues

#### API Connection Fails
- Verify `NEXT_PUBLIC_API_URL` is correct
- Check backend is running and accessible
- Review CORS configuration on backend

#### Stellar Integration Issues
- Verify `NEXT_PUBLIC_STELLAR_NETWORK` matches backend config
- Check `NEXT_PUBLIC_STELLAR_HORIZON_URL` is accessible
- Ensure Freighter wallet extension is installed (for wallet operations)

#### Build Failures
- Check Node.js version: `node --version` (must be >= 20)
- Review build logs in Vercel dashboard
- Run locally: `npm run build`

## Rollback

To rollback to a previous deployment:

```bash
# View deployment history
vercel list

# Rollback to specific deployment
vercel rollback [deployment-id]
```

## Local Development

```bash
# Install dependencies
npm install

# Set up local environment
cp .env.example .env.local

# Update with local backend URL
# NEXT_PUBLIC_API_URL=http://localhost:3000

# Start development server
npm run dev

# Visit http://localhost:3000
```

## Testing Before Production

1. **Create Account** → Sign up and verify email
2. **Link Wallet** → Connect Stellar testnet wallet via Freighter
3. **Send Tip** → Create a tip to another creator
4. **View Dashboard** → Check earnings overview and transaction history
5. **Disconnect Wallet** → Test wallet management

## Performance Optimization

Current optimizations in place:
- Next.js Image optimization
- Code splitting via dynamic imports
- CSS-in-JS with Tailwind
- API response caching with React Query

Monitor performance at:
- Vercel Web Analytics
- Lighthouse scores in DevTools

## Security

- All API keys and secrets stored in Vercel environment variables
- No secrets committed to Git (.env files in .gitignore)
- HTTPS enforced on all routes
- CSP headers configured in next.config.js

## Support

For deployment issues:
1. Check Vercel logs: https://vercel.com/dashboard/[project]/logs
2. Review browser console for client-side errors
3. Check backend API health
4. Contact: support@dorisio.dev
