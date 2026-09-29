# Zustand Selector Patterns

## Basic Selectors
```typescript
// selectors/user.ts
import { useUserStore } from '../stores/userStore'

export const selectUserName = () => useUserStore((state) => state.profile?.name)
export const selectUserEmail = () => useUserStore((state) => state.profile?.email)
```

## Derived Selectors
```typescript
// selectors/user.ts

export const selectUserFullInfo = () => {
  const { profile, loading } = useUserStore.getState()
  return {
    ...profile,
    isLoading: loading,
  }
}
```

## Memoized Selectors
```typescript
// selectors/app.ts
import { shallow } from 'zustand/shallow'

export const selectAppTheme = () => useAppStore((state) => state.theme, shallow)
export const selectAppSettings = () => useAppStore((state) => state.settings, shallow)
```