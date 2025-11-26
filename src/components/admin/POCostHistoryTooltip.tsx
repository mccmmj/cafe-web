import React, { useEffect, useState } from 'react'

type Entry = {
  changed_at: string
  previous_unit_cost: number | null
  new_unit_cost: number
  pack_size: number | null
  source: string
}

export function POCostHistoryTooltip({ itemId }: { itemId: string }) {
  const [entries, setEntries] = useState<Entry[]>([])

  useEffect(() => {
    let active = true
    const load = async () => {
      const res = await fetch(`/api/admin/inventory/cost-history?id=${itemId}&limit=5`)
      const json = await res.json()
      if (json.success && active) setEntries(json.history || [])
    }
    if (itemId) load()
    return () => {
      active = false
    }
  }, [itemId])

  if (!itemId || entries.length === 0) return null

  return (
    <div className="text-xs text-gray-600 space-y-1">
      {entries.map((e, idx) => (
        <div key={idx} className="flex items-center justify-between">
          <span>{new Date(e.changed_at).toLocaleDateString()} • {e.source}</span>
          <span>{e.previous_unit_cost ?? '—'} → {e.new_unit_cost} (pack {e.pack_size || 1})</span>
        </div>
      ))}
    </div>
  )
}
