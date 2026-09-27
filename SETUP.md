# Dorisio Frontend Setup Guide

This guide provides step-by-step instructions for setting up the Dorisio frontend development environment.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 20+ LTS ([Download](https://nodejs.org/))
- **npm** (comes with Node.js) or **yarn** / **pnpm**
- **Git** ([Download](https://git-scm.com/))
- **Backend service** - The Dorisio backend must be running ([see backend setup](../backend/README.md))
- **SDK** - The Dorisio SDK must be built ([see SDK setup](../sdk/README.md))

### Verify Prerequisites

```bash
node --version  # Should be v20.0.0 or higher
npm --version   # Should be 9.0.0 or higher
git --version
```

## Installation Steps

### 1. Clone the Repository

If you haven't already, clone the repository:

```bash
git clone https://github.com/Dorisio/frontend.git
cd frontend
```

### 2. Install Dependencies

Install all required npm packages:

```bash
npm install
```

This will install:
- Next.js 14 and React 18
- UI libraries (Tailwind CSS, shadcn/ui, Framer Motion)
- State management (Zustand, TanStack Query)
- Form handling (React Hook Form, Zod)
- The local Dorisio SDK from `../sdk`

### 3. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:

```bash
# Backend API
NEXT_PUBLIC_API_URL=http://localhost:3000

# Realtime WebSocket (optional)
NEXT_PUBLIC_SDK_WS_URL=ws://localhost:3000

# Stellar Network
NEXT_PUBLIC_STELLAR_NETWORK=testnet
NEXT_PUBLIC_STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
```

#### Environment Variables Explained

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Yes | Backend API base URL | - |
| `NEXT_PUBLIC_SDK_WS_URL` | No | WebSocket URL for real-time notifications | - |
| `NEXT_PUBLIC_STELLAR_NETWORK` | No | Stellar network (`testnet` or `mainnet`) | `testnet` |
| `NEXT_PUBLIC_STELLAR_HORIZON_URL` | No | Stellar Horizon endpoint | Testnet URL |

### 4. Start the Development Server

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000)

## Project Structure Overview

```
src/
├── app/                  # Next.js App Router pages
│   ├── (app)/            # Protected routes
│   │   ├── creators/[username]/    # Creator profiles
│   │   └── creators/             # Discovery page
│   ├── auth/             # Authentication pages
│   └── globals.css       # Global styles
├── components/
│   ├── sections/         # Page-specific components
│   ├── ui/               # Reusable UI components
│   └── shared/           # Shared utilities
├── hooks/                # Custom React hooks
├── lib/                  # SDK client and utilities
├── stores/               # Zustand state stores
├── types/                # TypeScript type definitions
└── utils/                # Helper functions
```

## Running Tests

### Unit Tests

Run the test suite:

```bash
npm test          # Watch mode
npm run test:run  # Single run
npm run test:ui   # Test UI interface
```

### End-to-End Tests

Run Playwright E2E tests:

```bash
npm run test:e2e              # Run all E2E tests
npm run test:e2e:report       # View test report
```

## Development Workflow

### Code Quality Checks

Before committing, run these checks:

```bash
npm run lint         # ESLint
npm run format       # Prettier formatting
npm run type-check   # TypeScript type checking
```

### Build for Production

```bash
npm run build
```

### Run Production Build

```bash
npm run start
```

## Common Development Tasks

### Adding a New Page

1. Create a file in `src/app/[route]/page.tsx`
2. Add `'use client'` at the top if using React hooks
3. Use SDK hooks for data fetching
4. Keep business logic minimal (it belongs in backend/SDK)

Example:

```typescript
'use client';

import { useCreatorBalance } from '@/hooks/use-creator-balance';

export default function CreatorDashboard() {
  const { balance, loading, error } = useCreatorBalance(username);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <div>Total Earnings: ${balance?.totalEarnings}</div>;
}
```

### Adding a New Component

1. Create in `src/components/` (sections, ui, or shared)
2. Keep it presentational (props-driven)
3. Place logic in parent components or SDK hooks

### Adding Environment Variables

1. Add to `.env.example` with the variable name and a default/example value
2. Add a comment explaining what the variable does
3. Document in the table above

## Troubleshooting

### "Module not found" errors

**Problem:** Cannot find local modules or SDK

**Solution:**
```bash
# Ensure SDK is built
cd ../sdk
npm run build
cd ../frontend
npm install
```

### Port already in use

**Problem:** Port 3000 is already in use

**Solution:**
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process (replace PID with actual process ID)
kill -9 <PID>

# Or use a different port
PORT=3001 npm run dev
```

### Environment variables not loading

**Problem:** Changes to `.env.local` not reflected

**Solution:**
- Restart the dev server after changing `.env.local`
- Ensure the file is named exactly `.env.local` (not `.env.local.txt`)
- Check that variables start with `NEXT_PUBLIC_` if they need to be client-side

### Build errors

**Problem:** TypeScript or build errors

**Solution:**
```bash
# Run type check to see specific errors
npm run type-check

# Run linter
npm run lint

# Clear cache and reinstall
rm -rf node_modules .next
npm install
npm run dev
```

### Backend connection issues

**Problem:** Cannot connect to backend API

**Solution:**
- Verify backend is running on the URL specified in `NEXT_PUBLIC_API_URL`
- Check that backend CORS allows requests from localhost:3000
- Test the backend URL directly in a browser or with curl

### SDK WebSocket connection fails

**Problem:** Real-time notifications not working

**Solution:**
- Ensure `NEXT_PUBLIC_SDK_WS_URL` is set correctly
- Verify backend WebSocket server is running
- Check browser console for WebSocket connection errors

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com)
- [Project README](./README.md)
- [CONTRIBUTING.md](./CONTRIBUTING.md)

## Getting Help

If you encounter issues not covered here:

1. Check the [GitHub Issues](https://github.com/Dorisio/frontend/issues)
2. Review the main [README.md](./README.md)
3. Contact support at support@dorisio.dev

## Next Steps

After setup:

1. Explore the codebase starting with `src/app/page.tsx`
2. Review existing components in `src/components/`
3. Check out the hooks in `src/hooks/`
4. Read the architecture principles in the main README
5. Try the tip flow as described in the README

Happy coding! 🚀
