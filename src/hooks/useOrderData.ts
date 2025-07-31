'use client'

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { createOrderSchema, updateOrderSchema, orderSearchSchema } from '@/lib/validations'
import type { Order, CreateOrder, UpdateOrder, OrderSearch, OrderStatus, PaymentStatus } from '@/lib/validations/order'

// Query Keys
export const orderQueryKeys = {
  all: ['orders'] as const,
  lists: () => [...orderQueryKeys.all, 'list'] as const,
  list: (filters?: Partial<OrderSearch>) => [...orderQueryKeys.lists(), filters] as const,
  details: () => [...orderQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...orderQueryKeys.details(), id] as const,
  user: (userId: string) => [...orderQueryKeys.all, 'user', userId] as const,
  status: (status: OrderStatus) => [...orderQueryKeys.all, 'status', status] as const,
  analytics: (params: any) => [...orderQueryKeys.all, 'analytics', params] as const,
}

// API Functions
const fetchOrders = async (params: Partial<OrderSearch> = {}): Promise<{ orders: Order[]; total: number; hasMore: boolean }> => {
  const validatedParams = orderSearchSchema.safeParse(params)
  const searchParams = validatedParams.success ? validatedParams.data : { page: 1, limit: 20, sortBy: 'createdAt', sortOrder: 'desc' }

  const urlParams = new URLSearchParams()
  urlParams.append('page', searchParams.page.toString())
  urlParams.append('limit', searchParams.limit.toString())
  urlParams.append('sortBy', searchParams.sortBy)
  urlParams.append('sortOrder', searchParams.sortOrder)
  
  if ('query' in searchParams && searchParams.query) {
    urlParams.append('q', searchParams.query)
  }
  if ('filters' in searchParams && searchParams.filters?.status?.length) {
    urlParams.append('status', searchParams.filters.status.join(','))
  }
  if ('filters' in searchParams && searchParams.filters?.orderType?.length) {
    urlParams.append('orderType', searchParams.filters.orderType.join(','))
  }
  if ('filters' in searchParams && searchParams.filters?.dateRange) {
    urlParams.append('startDate', searchParams.filters.dateRange.start)
    urlParams.append('endDate', searchParams.filters.dateRange.end)
  }

  const response = await fetch(`/api/orders?${urlParams.toString()}`)
  if (!response.ok) {
    throw new Error('Failed to fetch orders')
  }
  return response.json()
}

const fetchOrder = async (id: string): Promise<Order> => {
  const response = await fetch(`/api/orders/${id}`)
  if (!response.ok) {
    throw new Error('Failed to fetch order')
  }
  return response.json()
}

const fetchUserOrders = async (userId: string): Promise<Order[]> => {
  const response = await fetch(`/api/orders/user/${userId}`)
  if (!response.ok) {
    throw new Error('Failed to fetch user orders')
  }
  return response.json()
}

const createOrder = async (orderData: CreateOrder): Promise<Order> => {
  const validatedData = createOrderSchema.safeParse(orderData)
  if (!validatedData.success) {
    throw new Error('Invalid order data')
  }

  const response = await fetch('/api/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(validatedData.data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to create order')
  }
  return response.json()
}

const updateOrder = async (id: string, updates: UpdateOrder): Promise<Order> => {
  const validatedUpdates = updateOrderSchema.safeParse(updates)
  if (!validatedUpdates.success) {
    throw new Error('Invalid order updates')
  }

  const response = await fetch(`/api/orders/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(validatedUpdates.data),
  })

  if (!response.ok) {
    throw new Error('Failed to update order')
  }
  return response.json()
}

const cancelOrder = async (id: string): Promise<Order> => {
  const response = await fetch(`/api/orders/${id}/cancel`, {
    method: 'POST',
  })

  if (!response.ok) {
    throw new Error('Failed to cancel order')
  }
  return response.json()
}

const processPayment = async (orderId: string, paymentData: any): Promise<{ success: boolean; paymentId?: string }> => {
  const response = await fetch(`/api/orders/${orderId}/payment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(paymentData),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Payment failed')
  }
  return response.json()
}

// Custom Hooks
export const useOrders = (params?: Partial<OrderSearch>) => {
  return useQuery({
    queryKey: orderQueryKeys.list(params),
    queryFn: () => fetchOrders(params),
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

export const useInfiniteOrders = (params?: Partial<OrderSearch>) => {
  return useInfiniteQuery({
    queryKey: orderQueryKeys.list(params),
    queryFn: ({ pageParam = 1 }) => fetchOrders({ ...params, page: pageParam }),
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.hasMore ? allPages.length + 1 : undefined
    },
    initialPageParam: 1,
    staleTime: 1000 * 60 * 2,
  })
}

export const useOrder = (id: string) => {
  return useQuery({
    queryKey: orderQueryKeys.detail(id),
    queryFn: () => fetchOrder(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 1, // 1 minute
  })
}

export const useUserOrders = (userId: string) => {
  return useQuery({
    queryKey: orderQueryKeys.user(userId),
    queryFn: () => fetchUserOrders(userId),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export const useCreateOrder = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createOrder,
    onSuccess: (newOrder) => {
      // Invalidate and refetch orders list
      queryClient.invalidateQueries({ queryKey: orderQueryKeys.lists() })
      
      // Add the new order to cache
      queryClient.setQueryData(orderQueryKeys.detail(newOrder.id), newOrder)
      
      // Update user orders if applicable
      if (newOrder.userId) {
        queryClient.invalidateQueries({ queryKey: orderQueryKeys.user(newOrder.userId) })
      }
    },
    onError: (error) => {
      console.error('Failed to create order:', error)
    },
  })
}

export const useUpdateOrder = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateOrder }) =>
      updateOrder(id, updates),
    onMutate: async ({ id, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: orderQueryKeys.detail(id) })

      // Snapshot the previous value
      const previousOrder = queryClient.getQueryData<Order>(orderQueryKeys.detail(id))

      // Optimistically update the order
      if (previousOrder) {
        const optimisticOrder = { ...previousOrder, ...updates, updatedAt: new Date().toISOString() }
        queryClient.setQueryData(orderQueryKeys.detail(id), optimisticOrder)
      }

      return { previousOrder }
    },
    onError: (error, { id }, context) => {
      // Rollback on error
      if (context?.previousOrder) {
        queryClient.setQueryData(orderQueryKeys.detail(id), context.previousOrder)
      }
    },
    onSuccess: (updatedOrder) => {
      // Update the order in cache
      queryClient.setQueryData(orderQueryKeys.detail(updatedOrder.id), updatedOrder)
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: orderQueryKeys.lists() })
      if (updatedOrder.userId) {
        queryClient.invalidateQueries({ queryKey: orderQueryKeys.user(updatedOrder.userId) })
      }
    },
  })
}

export const useCancelOrder = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: cancelOrder,
    onSuccess: (cancelledOrder) => {
      // Update the order in cache
      queryClient.setQueryData(orderQueryKeys.detail(cancelledOrder.id), cancelledOrder)
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: orderQueryKeys.lists() })
      if (cancelledOrder.userId) {
        queryClient.invalidateQueries({ queryKey: orderQueryKeys.user(cancelledOrder.userId) })
      }
    },
  })
}

export const useProcessPayment = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ orderId, paymentData }: { orderId: string; paymentData: any }) =>
      processPayment(orderId, paymentData),
    onSuccess: (result, { orderId }) => {
      // Refetch the order to get updated payment status
      queryClient.invalidateQueries({ queryKey: orderQueryKeys.detail(orderId) })
      queryClient.invalidateQueries({ queryKey: orderQueryKeys.lists() })
    },
  })
}

// Order status utilities
export const useOrdersByStatus = (status: OrderStatus) => {
  return useQuery({
    queryKey: orderQueryKeys.status(status),
    queryFn: () => fetchOrders({ filters: { status: [status] } }),
    staleTime: 1000 * 60 * 1, // 1 minute
  })
}

// Real-time order updates (polling)
export const useOrderPolling = (orderId: string, enabled = true) => {
  return useQuery({
    queryKey: orderQueryKeys.detail(orderId),
    queryFn: () => fetchOrder(orderId),
    enabled: enabled && !!orderId,
    refetchInterval: 30000, // Poll every 30 seconds
    staleTime: 0, // Always refetch
  })
}

// Order analytics
export const useOrderAnalytics = (params: any) => {
  return useQuery({
    queryKey: orderQueryKeys.analytics(params),
    queryFn: async () => {
      const response = await fetch('/api/orders/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      })
      if (!response.ok) {
        throw new Error('Failed to fetch order analytics')
      }
      return response.json()
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
    enabled: !!params,
  })
}

// Prefetch utilities
export const usePrefetchOrder = () => {
  const queryClient = useQueryClient()

  return (id: string) => {
    queryClient.prefetchQuery({
      queryKey: orderQueryKeys.detail(id),
      queryFn: () => fetchOrder(id),
      staleTime: 1000 * 60 * 1,
    })
  }
}