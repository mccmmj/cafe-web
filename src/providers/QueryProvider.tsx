'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

const isClientError = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null) {
    return false
  }

  const status = (error as { status?: unknown }).status

  if (typeof status !== 'number') {
    return false
  }

  return status >= 400 && status < 500
}

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // How long data stays fresh before refetching
            staleTime: 1000 * 60 * 5, // 5 minutes
            // How long data stays in cache
            gcTime: 1000 * 60 * 30, // 30 minutes (previously cacheTime)
            // Retry failed requests
            retry: (failureCount, error: unknown) => {
              // Don't retry on 4xx errors (client errors)
              if (isClientError(error)) {
                return false
              }
              // Retry up to 3 times for other errors
              return failureCount < 3
            },
            // Retry delay with exponential backoff
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
            // Refetch on window focus in production
            refetchOnWindowFocus: process.env.NODE_ENV === 'production',
            // Don't refetch on reconnect by default
            refetchOnReconnect: false,
          },
          mutations: {
            // Retry failed mutations once
            retry: 1,
            // Retry delay for mutations
            retryDelay: 1000,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* ReactQueryDevtools removed for cleaner UI */}
    </QueryClientProvider>
  )
}
