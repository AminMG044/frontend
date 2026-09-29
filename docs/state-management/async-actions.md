# Async Actions in Zustand

## Basic Async Action
```typescript
// stores/userStore.ts
import { create } from 'zustand'

interface UserState {
  // ...
  fetchUser: (userId: string) => Promise<void>
}

export const useUserStore = create<UserState>((set) => ({
  // ...
  fetchUser: async (userId) => {
    set({ loading: true, error: null })
    try {
      const response = await fetch(`/api/users/${userId}`)
      const data = await response.json()
      set({ profile: data, loading: false })
    } catch (err) {
      set({ error: 'Failed to fetch user', loading: false })
    }
  },
}))
```

## Optimistic Updates
```typescript
// stores/cartStore.ts

export const useCartStore = create<CartState>((set) => ({
  // ...
  addItemOptimistic: async (item) => {
    set((state) => ({ items: [...state.items, item] }))
    try {
      await api.addToCart(item)
    } catch (err) {
      set((state) => ({ items: state.items.filter(i => i.id !== item.id) }))
    }
  },
}))