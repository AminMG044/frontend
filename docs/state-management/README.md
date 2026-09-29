# Zustand State Management Patterns

This guide covers advanced Zustand patterns for scalable state management in Dorisio applications.

## Table of Contents
- [Store Organization](#store-organization)
- [Selectors](#selectors)
- [Async Actions](#async-actions)
- [Debugging](#debugging)
- [Migration Guide](#migration-guide)

## Store Organization

### Modular Stores
```typescript
// stores/userStore.ts
import { create } from 'zustand'

interface UserState {
  profile: { name: string; email: string } | null
  loading: boolean
  error: string | null
}

export const useUserStore = create<UserState>((set) => ({
  profile: null,
  loading: false,
  error: null,
}))
```

### Combined Stores
```typescript
// stores/index.ts
import { create } from 'zustand'
import { useUserStore } from './userStore'
import { useAppStore } from './appStore'

export const useStore = () => ({
  ...useUserStore.getState(),
  ...useAppStore.getState(),
})
```