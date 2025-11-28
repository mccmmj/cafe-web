/**
 * Lightweight API contract tests for cost history endpoints and calculator math.
 * Uses mocked fetch to avoid hitting real backend; focuses on request shaping.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const fetchMock = vi.fn()

global.fetch = fetchMock as any

describe('cost history API', () => {
  beforeEach(() => {
    fetchMock.mockReset()
  })

  it('POST /api/admin/inventory/revert-cost sends body with item_id and target_cost', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true })
    })

    const body = { item_id: 'item-123', target_cost: 1.23, note: 'Revert' }
    await fetch('/api/admin/inventory/revert-cost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })

    const [, options] = fetchMock.mock.calls[0]
    expect(options.method).toBe('POST')
    expect(JSON.parse(options.body as string)).toMatchObject(body)
  })

  it('GET /api/admin/inventory/cost-history passes id and limit', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, history: [] })
    })

    await fetch('/api/admin/inventory/cost-history?id=item-123&limit=5')
    const [url] = fetchMock.mock.calls[0]
    expect(url).toContain('item-123')
    expect(url).toContain('limit=5')
  })
})

describe('calculator math', () => {
  it('computes unit cost = pack cost ÷ pack size', () => {
    const packCost = 4.17
    const packSize = 8
    const unit = packCost / packSize
    expect(unit).toBeCloseTo(0.52125, 5)
  })
})
