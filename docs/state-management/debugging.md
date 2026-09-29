# Zustand Debugging Techniques

## Devtools Integration
```typescript
// stores/devtools.ts
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

export const useDebugStore = create()
  (devtools(
    persist(
      (set) => ({
        log: (message: string) => set({ message }),
        clear: () => set({ message: '' }),
      }),
      { name: 'debug-store' }
    )
  )
)
```

## Middleware for Logging
```typescript
// middleware/logger.ts
import { Middleware } from 'zustand'

export const logger: Middleware = (set, get, api) => (type, payload) => {
  console.log('State change:', type, payload)
  set(type, payload)
}

// Usage
const useStore = create(set => ({ 
  count: 0,
  increment: () => set(state => ({ count: state.count + 1 })),
}))
  .with(logger)
```

## Error Boundaries
```typescript
// stores/errorBoundary.ts
import { create } from 'zustand'

interface ErrorState {
  lastError: Error | null
  resetError: () => void
}

export const useErrorStore = create<ErrorState>((set) => ({
  lastError: null,
  resetError: () => set({ lastError: null }),
}))
```