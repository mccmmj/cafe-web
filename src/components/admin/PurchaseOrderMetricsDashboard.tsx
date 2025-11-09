'use client'

import { useMemo, useState } from 'react'
import { TrendingUp, DollarSign, Clock, AlertTriangle, Calendar, XCircle } from 'lucide-react'
import { usePurchaseOrderMetrics } from '@/hooks/usePurchaseOrderMetrics'
import { SupplierMetric, SupplierMetricSummary } from '@/types/purchase-order-metrics'

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)

const formatPercent = (value: number | null) => {
  if (value === null || Number.isNaN(value)) return '—'
  return `${(value * 100).toFixed(1)}%`
}

const KPI_CARD_STYLES: Record<string, string> = {
  spend: 'bg-gradient-to-br from-indigo-500 via-sky-500 to-purple-500',
  balance: 'bg-gradient-to-br from-orange-500 to-amber-500',
  onTime: 'bg-gradient-to-br from-emerald-500 to-lime-500',
  exception: 'bg-gradient-to-br from-rose-500 to-pink-500'
}

interface RangeOption {
  label: string
  months: number
}

const RANGE_OPTIONS: RangeOption[] = [
  { label: 'Last 3 months', months: 3 },
  { label: 'Last 6 months', months: 6 },
  { label: 'Last 12 months', months: 12 }
]

const PurchaseOrderMetricsDashboard = () => {
  const [range, setRange] = useState<RangeOption>(RANGE_OPTIONS[1])
  const [selectedSupplier, setSelectedSupplier] = useState<{ id: string | null; name: string | null } | null>(null)

  const { startIso, endIso } = useMemo(() => {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setMonth(endDate.getMonth() - range.months + 1)
    return {
      startIso: startDate.toISOString(),
      endIso: endDate.toISOString()
    }
  }, [range])

  const { data, isLoading, error } = usePurchaseOrderMetrics({
    start: startIso,
    end: endIso
  })

  const {
    data: supplierDetailData,
    isLoading: supplierDetailLoading
  } = usePurchaseOrderMetrics({
    start: startIso,
    end: endIso,
    supplierId: selectedSupplier?.id ?? undefined,
    enabled: Boolean(selectedSupplier?.id)
  })

  const metricsBySupplier = useMemo(() => {
    if (!data?.metrics) return []
    const supplierMap = new Map<
      string | null,
      {
        supplierId: string | null
        supplierName: string | null
        totalSpend: number
        onTimeRatio: number | null
        invoiceExceptionRate: number | null
      }
    >()
    data.metrics.forEach((entry) => {
      const existing =
        supplierMap.get(entry.supplierId) || {
          supplierId: entry.supplierId,
          supplierName: entry.supplierName,
          totalSpend: 0,
          onTimeRatio: null as number | null,
          invoiceExceptionRate: null as number | null
        }
      existing.totalSpend += entry.totalSpend
      existing.onTimeRatio = entry.onTimeRatio ?? existing.onTimeRatio
      existing.invoiceExceptionRate = entry.invoiceExceptionRate ?? existing.invoiceExceptionRate
      existing.supplierName = entry.supplierName ?? existing.supplierName
      supplierMap.set(entry.supplierId, existing)
    })
    return Array.from(supplierMap.values()).sort((a, b) => b.totalSpend - a.totalSpend)
  }, [data?.metrics])

  const periodSeries = useMemo(() => {
    if (!data?.metrics) return []
    const grouped: Record<string, SupplierMetric[]> = {}
    data.metrics.forEach((metric) => {
      if (!grouped[metric.periodMonth]) grouped[metric.periodMonth] = []
      grouped[metric.periodMonth].push(metric)
    })

    return Object.entries(grouped)
      .sort(([a], [b]) => (a > b ? 1 : -1))
      .map(([period, entries]) => ({
        period,
        totalSpend: entries.reduce((sum, entry) => sum + entry.totalSpend, 0),
        openBalance: entries.reduce((sum, entry) => sum + entry.openBalance, 0)
      }))
  }, [data?.metrics])

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
        Failed to load purchase order metrics.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-gray-500">Insights</p>
          <h1 className="text-2xl font-semibold text-gray-900">Purchase Order Metrics</h1>
        </div>
        <div className="flex items-center gap-3">
          <Calendar className="h-4 w-4 text-gray-500" />
          <span className="text-sm text-gray-600">{range.label}</span>
          <div className="relative">
            <select
              className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              value={range.label}
              onChange={(event) => {
                const option = RANGE_OPTIONS.find((opt) => opt.label === event.target.value)
                if (option) setRange(option)
              }}
            >
              {RANGE_OPTIONS.map((option) => (
                <option key={option.label}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      )}

      {!isLoading && data && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Total Spend"
              value={formatCurrency(data.summary.totalSpend)}
              change={`${range.months}-month window`}
              icon={<DollarSign className="h-6 w-6 text-white" />}
              theme={KPI_CARD_STYLES.spend}
            />
            <MetricCard
              title="Open Balance"
              value={formatCurrency(data.summary.openBalance)}
              change="Draft → Sent"
              icon={<TrendingUp className="h-6 w-6 text-white" />}
              theme={KPI_CARD_STYLES.balance}
            />
            <MetricCard
              title="On-Time Delivery"
              value={formatPercent(data.summary.avgOnTimeRatio)}
              change="Received vs expected"
              icon={<Clock className="h-6 w-6 text-white" />}
              theme={KPI_CARD_STYLES.onTime}
            />
            <MetricCard
              title="Invoice Exception Rate"
              value={formatPercent(data.summary.avgInvoiceExceptionRate)}
              change="Pending/Rejected matches"
              icon={<AlertTriangle className="h-6 w-6 text-white" />}
              theme={KPI_CARD_STYLES.exception}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <h2 className="mb-2 text-lg font-semibold text-gray-900">Spend vs Open Balance</h2>
              <p className="mb-6 text-sm text-gray-500">Totals by month (UTC)</p>
              {periodSeries.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-200 p-10 text-center text-gray-500">
                  No purchase orders in this range yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {periodSeries.map((period) => (
                    <div key={period.period} className="space-y-1">
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <span>{period.period}</span>
                        <span>{formatCurrency(period.totalSpend)}</span>
                      </div>
                      <div className="h-3 rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-indigo-500 transition-all"
                          style={{
                            width: `${Math.min(100, (period.totalSpend / (Math.max(...periodSeries.map((p) => p.totalSpend)) || 1)) * 100)}%`
                          }}
                        />
                      </div>
                      <div className="text-xs text-gray-400">
                        Open balance: {formatCurrency(period.openBalance)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Top Suppliers by Spend</h2>
                  <p className="text-sm text-gray-500">Across the selected period</p>
                </div>
                {selectedSupplier && (
                  <button
                    type="button"
                    onClick={() => setSelectedSupplier(null)}
                    className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-800"
                  >
                    <XCircle className="h-4 w-4" />
                    Clear filter
                  </button>
                )}
              </div>
              {metricsBySupplier.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-200 p-10 text-center text-gray-500">
                  No supplier activity in this range.
                </div>
              ) : (
                <div className="space-y-4">
                  {metricsBySupplier.slice(0, 5).map((entry) => {
                    const isActive = selectedSupplier?.id === entry.supplierId
                    return (
                      <button
                        key={entry.supplierId ?? 'unknown'}
                        type="button"
                        onClick={() =>
                          setSelectedSupplier((prev) =>
                            prev?.id === entry.supplierId
                              ? null
                              : { id: entry.supplierId, name: entry.supplierName }
                          )
                        }
                        className={`w-full rounded-xl border p-4 text-left transition ${
                          isActive
                            ? 'border-indigo-400 bg-indigo-50/70 shadow-sm'
                            : 'border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/40'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">
                              {entry.supplierName || 'Unknown Supplier'}
                            </p>
                            <p className="text-sm text-gray-500">
                              On-time {formatPercent(entry.onTimeRatio)} • Exceptions{' '}
                              {formatPercent(entry.invoiceExceptionRate)}
                            </p>
                          </div>
                          <div className="text-lg font-semibold text-gray-900">
                            {formatCurrency(entry.totalSpend)}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {selectedSupplier && (
            <SupplierDrilldownCard
              supplierName={selectedSupplier.name}
              summary={supplierDetailData?.summary}
              loading={supplierDetailLoading}
              rangeLabel={range.label}
            />
          )}
        </>
      )}
    </div>
  )
}

interface MetricCardProps {
  title: string
  value: string
  change: string
  icon: React.ReactNode
  theme: string
}

const MetricCard = ({ title, value, change, icon, theme }: MetricCardProps) => (
  <div className={`rounded-2xl p-5 text-white shadow-lg shadow-black/10 ${theme}`}>
    <div className="mb-4 flex items-center justify-between">
      <div className="rounded-full bg-white/20 p-2">{icon}</div>
      <span className="text-xs uppercase tracking-wide text-white/80">{change}</span>
    </div>
    <div>
      <p className="text-sm text-white/80">{title}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  </div>
)

interface SupplierDrilldownCardProps {
  supplierName: string | null
  summary?: SupplierMetricSummary
  loading: boolean
  rangeLabel: string
}

const SupplierDrilldownCard = ({ supplierName, summary, loading, rangeLabel }: SupplierDrilldownCardProps) => (
  <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
    <div className="mb-4">
      <p className="text-sm uppercase tracking-wide text-gray-500">Supplier Scorecard</p>
      <h3 className="text-lg font-semibold text-gray-900">
        {supplierName || 'Unknown Supplier'}
      </h3>
      <p className="text-sm text-gray-500">{rangeLabel}</p>
    </div>
    {loading ? (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-16 animate-pulse rounded-lg bg-gray-100" />
        ))}
      </div>
    ) : summary ? (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-100 p-4">
          <p className="text-sm text-gray-500">Spend</p>
          <p className="text-xl font-semibold text-gray-900">{formatCurrency(summary.totalSpend)}</p>
        </div>
        <div className="rounded-xl border border-gray-100 p-4">
          <p className="text-sm text-gray-500">Open Balance</p>
          <p className="text-xl font-semibold text-gray-900">{formatCurrency(summary.openBalance)}</p>
        </div>
        <div className="rounded-xl border border-gray-100 p-4">
          <p className="text-sm text-gray-500">On-Time Delivery</p>
          <p className="text-xl font-semibold text-gray-900">{formatPercent(summary.avgOnTimeRatio)}</p>
        </div>
        <div className="rounded-xl border border-gray-100 p-4">
          <p className="text-sm text-gray-500">Fulfillment Accuracy</p>
          <p className="text-xl font-semibold text-gray-900">{formatPercent(summary.avgFulfillmentRatio)}</p>
        </div>
        <div className="rounded-xl border border-gray-100 p-4">
          <p className="text-sm text-gray-500">Invoice Exceptions</p>
          <p className="text-xl font-semibold text-gray-900">{formatPercent(summary.avgInvoiceExceptionRate)}</p>
        </div>
        <div className="rounded-xl border border-gray-100 p-4">
          <p className="text-sm text-gray-500">Total POs</p>
          <p className="text-xl font-semibold text-gray-900">{summary.totalPOs}</p>
        </div>
      </div>
    ) : (
      <div className="rounded-lg border border-dashed border-gray-200 p-6 text-center text-gray-500">
        No purchase order activity for this supplier in the selected range.
      </div>
    )}
  </div>
)

export default PurchaseOrderMetricsDashboard
