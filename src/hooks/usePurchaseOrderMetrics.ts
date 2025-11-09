'use client'

import { useQuery } from '@tanstack/react-query'
import { SupplierMetric, SupplierMetricSummary } from '@/types/purchase-order-metrics'

interface MetricsResponse {
  metrics: SupplierMetric[]
  summary: SupplierMetricSummary
}

interface UsePurchaseOrderMetricsOptions {
  start?: string
  end?: string
  supplierId?: string
  limit?: number
  enabled?: boolean
}

export function usePurchaseOrderMetrics(options: UsePurchaseOrderMetricsOptions = {}) {
  const { start, end, supplierId, limit, enabled = true } = options

  return useQuery<MetricsResponse>({
    queryKey: ['po-metrics', start, end, supplierId, limit],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (start) params.append('start', start)
      if (end) params.append('end', end)
      if (supplierId) params.append('supplierId', supplierId)
      if (limit) params.append('limit', String(limit))

      const response = await fetch(`/api/admin/purchase-orders/metrics?${params.toString()}`)
      if (!response.ok) {
        throw new Error('Failed to load purchase order metrics')
      }
      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to load purchase order metrics')
      }
      return result.data as MetricsResponse
    },
    enabled,
    staleTime: 5 * 60 * 1000
  })
}
