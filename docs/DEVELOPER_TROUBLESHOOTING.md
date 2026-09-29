# Developer Troubleshooting Guide

This guide helps developers debug and resolve common development issues when working on the Dorisio frontend.

## Table of Contents

- [Quick Search](#quick-search)
- [Environment Setup Issues](#environment-setup-issues)
- [Development Server Issues](#development-server-issues)
- [Build and Compilation Issues](#build-and-compilation-issues)
- [Testing Issues](#testing-issues)
- [TypeScript Issues](#typescript-issues)
- [React/Next.js Issues](#reactnextjs-issues)
- [API and Backend Issues](#api-and-backend-issues)
- [Performance Issues](#performance-issues)
- [Git and Workflow Issues](#git-and-workflow-issues)
- [Debugging Tools and Techniques](#debugging-tools-and-techniques)
- [Common Error Messages](#common-error-messages)
- [Getting Help](#getting-help)

---

## Quick Search

| Issue Category | Common Keywords |
|----------------|------------------|
| Setup | node_modules, npm install, dependencies |
| Build | TypeScript, compilation, lint, build failed |
| Testing | vitest, test failed, mocking, coverage |
| Runtime | 500 error, 404, CORS, fetch failed |
| Performance | slow, memory, bundle size, rendering |
| Git | merge conflict, branch, push failed |

---

## Environment Setup Issues

### Node.js Version Incompatibility

**Problem:** `SyntaxError` or module resolution errors when running commands.

**Solution:**
```bash
# Check Node.js version
node --version

# Should be >= 20.0.0 (see package.json engines)
# If using wrong version, install correct version with nvm:
nvm install 20
nvm use 20
```

**Common Error Messages:**
- `SyntaxError: Unexpected token`
- `MODULE_NOT_FOUND`
- `Cannot find module`

### npm install Fails

**Problem:** `npm install` hangs or fails with dependency conflicts.

**Solutions:**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Try with legacy peer deps (if needed)
npm install --legacy-peer-deps

# Or use specific registry
npm install --registry=https://registry.npmjs.org/
```

**Common Error Messages:**
- `ERESOLVE unable to resolve dependency tree`
- `peer dependency missing`
- `ETIMEDOUT`

### SDK Dependencies Missing

**Problem:** Cannot find `dorisio-sdk` or related modules.

**Solution:**
```bash
# Build the SDK first
cd ../sdk
npm run build
cd ../frontend

# Install with local dependency
npm install

# If using file: protocol, ensure SDK is built
npm install file:../sdk
```

**Common Error Messages:**
- `Cannot find module 'dorisio-sdk'`
- `Module not found: Can't resolve 'dorisio-sdk'`

### Environment Variables Not Loading

**Problem:** `process.env.NEXT_PUBLIC_*` variables are undefined.

**Solutions:**
```bash
# Ensure file is named correctly (.env.local, not .env.local.txt)
# Restart dev server after changing env files
npm run dev

# Verify variable format (must start with NEXT_PUBLIC_)
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SDK_WS_URL=ws://localhost:3002

# Check for trailing spaces or quotes
# WRONG: NEXT_PUBLIC_API_URL="http://localhost:3001"
# RIGHT: NEXT_PUBLIC_API_URL=http://localhost:3001
```

**Common Error Messages:**
- `undefined is not an object`
- `Cannot read property of undefined`
- `NEXT_PUBLIC_API_URL is not defined`

---

## Development Server Issues

### Port Already in Use

**Problem:** `Error: listen EADDRINUSE: address already in use :::3000`

**Solutions:**
```bash
# Find process using port 3000
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux:
lsof -i :3000
kill -9 <PID>

# Or use different port
PORT=3001 npm run dev
```

### Hot Module Replacement (HMR) Not Working

**Problem:** Changes not reflecting without manual refresh.

**Solutions:**
```bash
# Clear Next.js cache
rm -rf .next

# Restart dev server
npm run dev

# Check if fast refresh is enabled (should be by default)
# Verify no console errors about HMR
```

**Common Causes:**
- Browser extensions blocking WebSocket
- Network proxy interfering
- Corrupted .next cache

### Dev Server Starts but Page Blank

**Problem:** Server runs but browser shows blank page or error.

**Solutions:**
```bash
# Check browser console for errors
# Common issues:

# 1. Build error not shown in terminal
npm run build

# 2. Runtime error in getStaticProps/getServerSideProps
# Check Next.js server logs

# 3. Missing environment variables
# Check .env.local file

# 4. Client-side hydration mismatch
# Check for server/client rendering differences
```

---

## Build and Compilation Issues

### TypeScript Compilation Errors

**Problem:** `npm run type-check` fails with TypeScript errors.

**Solutions:**
```bash
# Run type check to see specific errors
npm run type-check

# Common fixes:

# 1. Missing types
npm install --save-dev @types/package-name

# 2. Type assertion (use sparingly)
const data = response as DataType;

# 3. Update tsconfig if needed
# Check strict mode settings

# 4. Check for circular dependencies
# Use tsc --traceResolution to debug
```

**Common Error Messages:**
- `Property 'x' does not exist on type 'y'`
- `Type 'A' is not assignable to type 'B'`
- `Cannot find name 'X'`
- `Module has no exported member`

### ESLint Errors

**Problem:** `npm run lint` fails with linting errors.

**Solutions:**
```bash
# Auto-fix most issues
npm run lint -- --fix

# Common fixes:

# 1. Missing return type
function foo(): void { ... }

# 2. Unused variables
// Remove or prefix with underscore
const _unused = value;

# 3. Import ordering
// Run: npm run format

# 4. React hooks dependencies
// Add missing deps to useEffect array
```

**Common Error Messages:**
- `Missing return type on function`
- `is assigned a value but never used`
- `Unexpected console statement`
- `React Hook useEffect has missing dependencies`

### Next.js Build Fails

**Problem:** `npm run build` fails during production build.

**Solutions:**
```bash
# Clear all caches
rm -rf .next node_modules/.cache

# Check for:
# 1. Dynamic imports without proper loading
# 2. Client-only components in server code
# 3. Missing environment variables in production
# 4. Large bundle sizes

# Build with analysis
ANALYZE=true npm run build

# Check output for specific errors
```

**Common Error Messages:**
- `Error: Critical dependency: the request of a dependency is an expression`
- `Module not found: Can't resolve 'X'`
- `Build optimization failed`

---

## Testing Issues

### Vitest Test Failures

**Problem:** Tests fail with unexpected errors.

**Solutions:**
```bash
# Run tests in watch mode for debugging
npm run test -- --watch

# Run specific test file
npm run test -- path/to/test.spec.ts

# Run with coverage
npm run test -- --coverage

# Common fixes:

# 1. Mock issues
// Ensure mocks are properly configured
vi.mock('module-name');

// 2. Async/await issues
await waitFor(() => expect(...).toBeInTheDocument());

// 3. Timer issues
vi.useFakeTimers();
vi.advanceTimersByTime(1000);
```

**Common Error Messages:**
- `Expected to be found in the document`
- `Received has serializations`
- `Timeout - Async callback was not invoked`
- `mockReturnValue is not a function`

### Test Environment Issues

**Problem:** Tests work locally but fail in CI.

**Solutions:**
```bash
# Check for:
# 1. Environment-specific behavior
// Use process.env checks or mocks

# 2. Timing issues
// Increase timeout
test('slow test', async () => {
  // test code
}, { timeout: 10000 });

# 3. File path issues
// Use cross-platform path joining
import path from 'path';
const filePath = path.join(__dirname, 'fixtures', 'test.json');

# 4. Browser-specific APIs
// Mock window, document, etc.
global.window = { ...window, location: { ... } };
```

### Mocking External Dependencies

**Problem:** Cannot properly mock SDK or external services.

**Solutions:**
```typescript
// Mock entire module
vi.mock('dorisio-sdk', () => ({
  createTip: vi.fn(),
  // other exports
}));

// Mock specific function
import { createTip } from 'dorisio-sdk';
vi.mocked(createTip).mockResolvedValue({ success: true });

// Mock with implementation
vi.mock('dorisio-sdk', () => ({
  createTip: vi.fn(() => Promise.resolve({ success: true }))
}));

// Mock React Query
vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: mockData, isLoading: false })),
}));
```

---

## TypeScript Issues

### Type Inference Problems

**Problem:** TypeScript cannot infer correct types.

**Solutions:**
```typescript
// 1. Use explicit types
const data: DataType = response;

// 2. Type guards
function isString(value: unknown): value is string {
  return typeof value === 'string';
}

// 3. Type predicates
if (typeof value === 'string') {
  // TypeScript knows value is string here
}

// 4. Generic types
function identity<T>(value: T): T {
  return value;
}
```

### Generic Type Errors

**Problem:** Generic type constraints not working as expected.

**Solutions:**
```typescript
// Use proper constraints
interface Identifiable {
  id: string;
}

function findById<T extends Identifiable>(
  items: T[],
  id: string
): T | undefined {
  return items.find(item => item.id === id);
}

// Use utility types
type PartialUser = Partial<User>;
type RequiredUser = Required<User>;
type ReadonlyUser = Readonly<User>;
```

### Module Resolution Issues

**Problem:** Cannot find module or type definitions.

**Solutions:**
```bash
# Check tsconfig.json paths
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"]
    }
  }
}

# Install type definitions
npm install --save-dev @types/package-name

# Check moduleResolution setting
# Should be "node" or "bundler" for modern projects
```

---

## React/Next.js Issues

### Hydration Mismatch Errors

**Problem:** `Warning: Text content did not match. Server: "X" Client: "Y"`

**Solutions:**
```tsx
// 1. Use useEffect for client-only data
useEffect(() => {
  setState(clientOnlyData);
}, []);

// 2. Use dynamic import with ssr: false
const ClientOnlyComponent = dynamic(
  () => import('./ClientOnlyComponent'),
  { ssr: false }
);

// 3. Check for date formatting differences
// Use same date formatting on server and client

// 4. Use suppressHydrationWarning carefully
<div suppressHydrationWarning>{date}</div>
```

### State Management Issues

**Problem:** State not updating or causing infinite loops.

**Solutions:**
```tsx
// 1. Check dependency arrays
useEffect(() => {
  // effect
}, [dependency1, dependency2]); // Include all dependencies

// 2. Use functional updates
setCount(prev => prev + 1);

// 3. Avoid stale closures
useEffect(() => {
  const handler = () => {
    // Uses latest state
  };
  window.addEventListener('resize', handler);
  return () => window.removeEventListener('resize', handler);
}, []);

// 4. Use useCallback for functions
const handleClick = useCallback(() => {
  // handler logic
}, [dependency]);
```

### Performance Issues with Re-renders

**Problem:** Component re-renders unnecessarily.

**Solutions:**
```tsx
// 1. Use React.memo
const MemoizedComponent = React.memo(function Component({ prop }) {
  return <div>{prop}</div>;
});

// 2. Use useMemo for expensive calculations
const expensiveValue = useMemo(() => {
  return heavyCalculation(data);
}, [data]);

// 3. Use useCallback for callbacks
const handleClick = useCallback(() => {
  doSomething(value);
}, [value]);

// 4. Use key prop correctly
{items.map(item => (
  <Item key={item.id} data={item} />
))}
```

---

## API and Backend Issues

### CORS Errors

**Problem:** `Access to fetch at 'X' from origin 'Y' has been blocked by CORS policy`

**Solutions:**
```bash
# 1. Check backend CORS configuration
# Backend should allow origin: http://localhost:3000

# 2. Use Next.js API routes as proxy
// Create proxy in pages/api/proxy.ts
export default async function handler(req, res) {
  const response = await fetch('https://backend-api.com/endpoint');
  const data = await response.json();
  res.json(data);
}

# 3. Configure next.config.js rewrites
module.exports = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://backend-api.com/:path*',
      },
    ];
  },
};
```

### Network Request Failures

**Problem:** API calls fail with network errors.

**Solutions:**
```typescript
// 1. Add error handling
try {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const data = await response.json();
} catch (error) {
  console.error('Fetch error:', error);
}

// 2. Add timeout
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 5000);

try {
  const response = await fetch(url, { signal: controller.signal });
  clearTimeout(timeoutId);
} catch (error) {
  if (error.name === 'AbortError') {
    console.error('Request timeout');
  }
}

// 3. Add retry logic
async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

### WebSocket Connection Issues

**Problem:** WebSocket connections fail or disconnect frequently.

**Solutions:**
```typescript
// 1. Check WebSocket URL
const wsUrl = process.env.NEXT_PUBLIC_SDK_WS_URL;
if (!wsUrl) {
  console.error('WebSocket URL not configured');
}

// 2. Add connection error handling
const ws = new WebSocket(wsUrl);
ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

// 3. Implement reconnection logic
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;

function connect() {
  const ws = new WebSocket(wsUrl);
  ws.onclose = () => {
    if (reconnectAttempts < maxReconnectAttempts) {
      reconnectAttempts++;
      setTimeout(connect, 1000 * reconnectAttempts);
    }
  };
  ws.onopen = () => {
    reconnectAttempts = 0;
  };
}
```

---

## Performance Issues

### Slow Build Times

**Problem:** Build process takes too long.

**Solutions:**
```bash
# 1. Enable caching in Next.js
# next.config.js
module.exports = {
  experimental: {
    cacheHandler: require.resolve('./cache-handler.js'),
  },
};

# 2. Use incremental builds
npm run build -- --incremental

# 3. Analyze bundle size
npm run build -- --analyze

# 4. Optimize dependencies
# Remove unused packages
# Use tree-shaking friendly imports
```

### Large Bundle Size

**Problem:** JavaScript bundle is too large, affecting load time.

**Solutions:**
```bash
# 1. Analyze bundle
npm run build -- --analyze

# 2. Use dynamic imports
const HeavyComponent = dynamic(() => import('./HeavyComponent'));

# 3. Code splitting
// Next.js does this automatically for pages
// For components, use dynamic imports

# 4. Remove unused dependencies
npm uninstall unused-package

# 5. Use lighter alternatives
// Example: Use date-fns instead of moment.js
```

### Runtime Performance Issues

**Problem:** Application is slow or unresponsive.

**Solutions:**
```tsx
// 1. Use React DevTools Profiler
// Identify slow components

// 2. Implement virtual scrolling for long lists
import { FixedSizeList } from 'react-window';

// 3. Use pagination instead of loading all data
// Implement infinite scroll with IntersectionObserver

// 4. Optimize images
// Use next/image for automatic optimization
import Image from 'next/image';

// 5. Use CSS containment
.content {
  contain: content;
}
```

### Memory Leaks

**Problem:** Application memory usage grows over time.

**Solutions:**
```tsx
// 1. Clean up event listeners
useEffect(() => {
  const handler = () => {};
  window.addEventListener('resize', handler);
  return () => window.removeEventListener('resize', handler);
}, []);

// 2. Clean up timers
useEffect(() => {
  const interval = setInterval(() => {}, 1000);
  return () => clearInterval(interval);
}, []);

// 3. Clean up subscriptions
useEffect(() => {
  const subscription = dataStream.subscribe();
  return () => subscription.unsubscribe();
}, []);

// 4. Avoid closures in long-lived components
// Use refs for values that don't need to trigger re-renders
const valueRef = useRef(initialValue);
```

---

## Git and Workflow Issues

### Merge Conflicts

**Problem:** Git merge conflicts when pulling or merging branches.

**Solutions:**
```bash
# 1. Identify conflicted files
git status

# 2. Resolve conflicts manually
# Open conflicted files and look for:
# <<<<<<< HEAD
# your changes
# =======
# their changes
# >>>>>>> branch-name

# 3. After resolving, mark as resolved
git add <resolved-file>

# 4. Complete merge
git commit

# 5. If too complex, abort and try different approach
git merge --abort
```

### Branch Naming Issues

**Problem:** Branch names with special characters cause issues.

**Solutions:**
```bash
# Use conventional branch naming
feature/feature-name
bugfix/bug-description
hotfix/critical-fix

# Avoid special characters
# BAD: #77-feature-name
# GOOD: feature/77-feature-name

# Rename branch
git branch -m old-name new-name
```

### Commit History Issues

**Problem:** Need to clean up commit history.

**Solutions:**
```bash
# 1. Interactive rebase (last N commits)
git rebase -i HEAD~N

# 2. Squash commits
# In rebase editor, change 'pick' to 'squash' for commits to squash

# 3. Amend last commit
git commit --amend

# 4. Undo commits (careful with shared branches)
git reset HEAD~N

# 5. Fix commit message of last commit
git commit --amend -m "New message"
```

---

## Debugging Tools and Techniques

### Browser DevTools

**Chrome DevTools Shortcuts:**
- `F12` or `Ctrl+Shift+I` - Open DevTools
- `Ctrl+Shift+J` - Jump to Console
- `Ctrl+Shift+C` - Inspect Element
- `Ctrl+Shift+P` - Command Palette

**Useful Tabs:**
- **Console:** View errors, log messages, execute JS
- **Network:** Monitor network requests, responses, timing
- **Performance:** Profile runtime performance
- **Memory:** Analyze memory usage and leaks
- **Application:** View storage, cookies, service workers

### React DevTools

**Installation:**
```bash
# Chrome/Edge: Install from Web Store
# Firefox: Install from Add-ons
```

**Features:**
- **Component Tree:** Inspect React component hierarchy
- **Props & State:** View component props and state
- **Profiler:** Commit profiling for performance analysis
- **Hooks:** Inspect hook values and dependencies

### VS Code Debugging

**Launch Configuration (.vscode/launch.json):**
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Next.js: debug server-side",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "console": "integratedTerminal"
    },
    {
      "type": "chrome",
      "request": "launch",
      "name": "Next.js: debug client-side",
      "url": "http://localhost:3000",
      "webRoot": "${workspaceFolder}"
    }
  ]
}
```

**Debugging Tips:**
- Set breakpoints by clicking line numbers
- Use `debugger;` statement in code
- Inspect variables in Debug sidebar
- Use Step Over/Into/Out buttons
- Watch expressions for complex values

### Next.js Debugging

**Enable Debug Mode:**
```bash
# Set environment variable
DEBUG=* npm run dev

# Or for specific modules
DEBUG=next:* npm run dev
```

**View Next.js Logs:**
```bash
# Check .next/server logs
ls -la .next/server

# View build output
npm run build
```

---

## Common Error Messages

### Runtime Errors

| Error | Common Cause | Solution |
|-------|-------------|----------|
| `TypeError: Cannot read property 'X' of undefined` | Accessing property on null/undefined | Add null checks, optional chaining |
| `ReferenceError: X is not defined` | Variable not declared | Check variable scope and imports |
| `SyntaxError: Unexpected token` | Invalid JavaScript syntax | Check syntax, use linter |
| `NetworkError` | Network request failed | Check network, API availability |
| `TypeError: X is not a function` | Calling non-function as function | Check type, verify function exists |

### Build Errors

| Error | Common Cause | Solution |
|-------|-------------|----------|
| `Module not found` | Missing dependency or wrong path | Install dependency, fix import path |
| `Type 'X' is not assignable to type 'Y'` | Type mismatch | Check types, add type assertion |
| `Property 'X' does not exist` | Missing property in type definition | Update type definition |
| `Cannot find module` | Module not installed | Run npm install |

### Test Errors

| Error | Common Cause | Solution |
|-------|-------------|----------|
| `Expected to be found in the document` | Element not rendered | Check rendering, async timing |
| `Received has serializations` | Snapshot mismatch | Update snapshot or fix component |
| `Timeout - Async callback was not invoked` | Async operation too slow | Increase timeout, fix async logic |
| `mockReturnValue is not a function` | Mock not properly set up | Check mock configuration |

---

## Getting Help

### Self-Service Resources

1. **Search Existing Issues**
   - Check [GitHub Issues](https://github.com/Dorisio/frontend/issues)
   - Search by error message or symptom
   - Check closed issues for solutions

2. **Documentation**
   - [Main README](../README.md)
   - [SETUP Guide](../SETUP.md)
   - [User Troubleshooting](../TROUBLESHOOTING.md)
   - [API Integration Guide](./API_INTEGRATION_GUIDE.md)

3. **Code Examples**
   - Check similar components in codebase
   - Look at test files for usage examples
   - Review Storybook stories

### When to Ask for Help

Ask for help when:
- You've spent 30+ minutes debugging without progress
- The issue affects core functionality
- You need architectural guidance
- You're unsure about best practices

### How to Ask Effectively

**Include in your question:**
1. **Clear description** of the problem
2. **Steps to reproduce** the issue
3. **Expected vs actual behavior**
4. **Error messages** (verbatim)
5. **Environment details** (OS, Node version, browser)
6. **Code snippets** (minimal, reproducible)
7. **What you've tried** so far

**Example:**
```
Problem: Component not re-rendering when state changes

Steps:
1. Open dashboard page
2. Click "Load More" button
3. New items don't appear

Expected: New items should load and display
Actual: No items appear, no error in console

Environment:
- OS: Windows 11
- Node: v20.0.0
- Browser: Chrome 120

Code:
const [items, setItems] = useState([]);
const loadMore = () => {
  const newItems = fetchMoreItems();
  setItems([...items, ...newItems]);
};

What I've tried:
- Verified fetchMoreItems returns data
- Checked React DevTools - state not updating
- Added console.log - function called but state unchanged
```

### Communication Channels

- **GitHub Issues:** For bugs and feature requests
- **Discord:** For real-time help and discussions
- **Email:** For security issues or sensitive matters

---

## Best Practices for Avoiding Issues

### Development Workflow

1. **Branch Protection**
   - Always work on feature branches
   - Keep main branch clean
   - Use descriptive commit messages

2. **Testing**
   - Write tests for new features
   - Run tests before committing
   - Maintain test coverage

3. **Code Quality**
   - Run linter before committing
   - Fix TypeScript errors immediately
   - Follow code style guidelines

4. **Documentation**
   - Update docs for API changes
   - Comment complex logic
   - Keep README up to date

### Prevention Tips

- **Keep dependencies updated** (but test thoroughly)
- **Use TypeScript strictly** (enable strict mode)
- **Monitor bundle size** regularly
- **Profile performance** before deploying
- **Test in multiple browsers**
- **Use environment variables** for configuration

---

## Search Index

### By Error Type
- [TypeScript Errors](#typescript-issues)
- [Build Errors](#build-and-compilation-issues)
- [Runtime Errors](#common-error-messages)
- [Test Errors](#testing-issues)

### By Component
- [React Components](#reactnextjs-issues)
- [API Integration](#api-and-backend-issues)
- [State Management](#reactnextjs-issues)
- [Routing](#reactnextjs-issues)

### By Tool
- [VS Code](#vs-code-debugging)
- [Chrome DevTools](#browser-devtools)
- [React DevTools](#react-devtools)
- [Next.js](#nextjs-debugging)

---

Last updated: September 2026

For contributions to this guide, please follow the [CONTRIBUTING.md](../CONTRIBUTING.md) guidelines.
