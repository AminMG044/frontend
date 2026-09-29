# Zustand Best Practices

## Store Organization

### Single Store vs Multiple Stores
- **Single Store**: Simpler for small apps
- **Multiple Stores**: Better for large apps (separation of concerns)

### Store Naming Convention
```typescript
// stores/userStore.ts
// stores/appStore.ts
// stores/cartStore.ts
```

## Selector Best Practices

### Avoid Direct State Access
```typescript
// Bad
const count = useStore.getState().count

// Good
const count = useStore((state) => state.count)
```

### Memoize Selectors
```typescript
const selectUser = () => useUserStore((state) => state.profile, shallow)
```

## Async Action Patterns

### Error Handling
```typescript
const fetchData = async () => {
  set({ loading: true, error: null })
  try {
    const data = await api.fetch()
    set({ data, loading: false })
  } catch (err) {
    set({ error: err.message, loading: false })
  }
}
```

### Cancellation
```typescript
const fetchData = async (signal) => {
  set({ loading: true })
  try {
    const controller = new AbortController()
    const data = await api.fetch({ signal: controller.signal })
    set({ data, loading: false })
    return () => controller.abort()
  } catch (err) {
    if (err.name !== 'AbortError') {
      set({ error: err.message })
    }
    set({ loading: false })
  }
}
```

## Performance Optimization

### Avoid Unnecessary Re-renders
```typescript
// Use shallow comparison for simple values
const selectCount = () => useStore((state) => state.count, shallow)

// Use deep comparison for complex objects
const selectUser = () => useStore((state) => state.user)
```

### Batch State Updates
```typescript
const updateProfile = (newData) => {
  set((state) => ({
    profile: { ...state.profile, ...newData },
    lastUpdated: new Date(),
  }))
}
```