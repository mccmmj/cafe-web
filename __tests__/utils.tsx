// Test utilities
import React from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Create a custom render function that includes providers
const AllTheProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

// Re-export everything
export * from '@testing-library/react'

// Override render method
export { customRender as render }

// Mock data generators
export const createMockMenuItem = (overrides = {}) => ({
  id: 'item-1',
  name: 'Test Item',
  description: 'Test description',
  price: 9.99,
  categoryId: 'cat-1',
  isAvailable: true,
  ...overrides
})

export const createMockMenuCategory = (overrides = {}) => ({
  id: 'cat-1',
  name: 'Test Category',
  description: 'Test category description',
  items: [createMockMenuItem()],
  sortOrder: 1,
  ...overrides
})

export const createMockUser = (overrides = {}) => ({
  id: 'user-1',
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  role: 'user' as const,
  createdAt: '2024-01-01T00:00:00Z',
  ...overrides
})

export const createMockCartItem = (overrides = {}) => ({
  id: 'cart-item-1',
  itemId: 'item-1',
  name: 'Test Item',
  price: 9.99,
  quantity: 1,
  categoryId: 'cat-1',
  categoryName: 'Test Category',
  addedAt: '2024-01-01T00:00:00Z',
  ...overrides
})

export const createMockOrder = (overrides = {}) => ({
  id: 'order-1',
  orderNumber: 'ORD001',
  status: 'pending' as const,
  items: [createMockCartItem()],
  customer: {
    id: 'user-1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'test@example.com',
    isGuest: false
  },
  payment: {
    id: 'payment-1',
    method: 'square' as const,
    status: 'completed' as const,
    amount: 9.99,
    currency: 'USD' as const
  },
  pricing: {
    subtotal: 9.99,
    tax: 0.80,
    taxRate: 0.08,
    discount: 0,
    total: 10.79
  },
  timestamps: {
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  ...overrides
})

// Test helpers
export const waitForLoadingToFinish = () => 
  new Promise(resolve => setTimeout(resolve, 0))

export const mockFetch = (response: any, ok = true) => {
  return jest.fn().mockImplementation(() =>
    Promise.resolve({
      ok,
      json: () => Promise.resolve(response),
    })
  )
}

export const mockLocalStorage = () => {
  const store: Record<string, string> = {}
  
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key]
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach(key => delete store[key])
    }),
  }
}