# Zustand Migration Guide

## From Redux to Zustand

### 1. Redux Actions → Zustand Actions
```typescript
// Redux
const increment = () => ({ type: 'INCREMENT' })

// Zustand
const useCounterStore = create((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
}))
```

### 2. Redux Selectors → Zustand Selectors
```typescript
// Redux
const selectCount = (state) => state.counter.count

// Zustand
const selectCount = () => useCounterStore((state) => state.count)
```

### 3. Redux Middleware → Zustand Middleware
```typescript
// Redux
const logger = store => next => action => {
  console.log('dispatching', action)
  return next(action)
}

// Zustand
const logger = (set, get, api) => (type, payload) => {
  console.log('State change:', type, payload)
  set(type, payload)
}
```

## Complex State Migration Checklist
- [ ] Replace `useSelector` with Zustand selectors
- [ ] Convert action creators to store methods
- [ ] Migrate reducers to Zustand set functions
- [ ] Replace `connect` with custom hooks
- [ ] Update async logic to use Zustand middleware
- [ ] Test all state transitions
- [ ] Verify performance metrics
- [ ] Update TypeScript types if needed