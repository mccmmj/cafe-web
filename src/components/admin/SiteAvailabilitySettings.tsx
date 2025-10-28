'use client'

import { useState, useTransition } from 'react'
import toast from 'react-hot-toast'
import type { SiteSettings, SiteStatus } from '@/types/settings'
import { Button } from '../ui'

interface SiteAvailabilitySettingsProps {
  initialStatus: SiteStatus
  initialSettings: SiteSettings | null
}

export default function SiteAvailabilitySettings({
  initialStatus,
  initialSettings
}: SiteAvailabilitySettingsProps) {
  const [status, setStatus] = useState<SiteStatus>(initialStatus)
  const [isPending, startTransition] = useTransition()
  const [isLive, setIsLive] = useState(initialStatus.isCustomerAppLive)
  const [title, setTitle] = useState(initialStatus.maintenanceTitle)
  const [message, setMessage] = useState(initialStatus.maintenanceMessage)
  const [ctaLabel, setCtaLabel] = useState(initialStatus.maintenanceCtaLabel)
  const [ctaHref, setCtaHref] = useState(initialStatus.maintenanceCtaHref)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(initialSettings?.updated_at ?? null)

  const updateFromResponse = (nextStatus: SiteStatus, updatedAt?: string) => {
    setStatus(nextStatus)
    setIsLive(nextStatus.isCustomerAppLive)
    setTitle(nextStatus.maintenanceTitle)
    setMessage(nextStatus.maintenanceMessage)
    setCtaLabel(nextStatus.maintenanceCtaLabel)
    setCtaHref(nextStatus.maintenanceCtaHref)
    if (updatedAt) {
      setLastSavedAt(updatedAt)
    }
  }

  const persistChanges = (payload: Record<string, unknown>, successMessage: string) => {
    startTransition(() => {
      void (async () => {
    try {
      const response = await fetch('/api/admin/settings/site', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

          if (!response.ok) {
            const errorBody = await response.json().catch(() => null)
            const errorMessage = errorBody?.error ?? 'Request failed'
            throw new Error(errorMessage)
          }

          const data = await response.json()
          updateFromResponse(data.status, data.settings?.updated_at)
          toast.success(successMessage)
        } catch (error) {
          console.error('Failed to update site settings:', error)
          toast.error(error instanceof Error ? error.message : 'Unable to save changes')
          await refetchCurrentStatus()
        }
      })()
    })
  }

  const refetchCurrentStatus = async () => {
    try {
      const response = await fetch('/api/admin/settings/site', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      if (response.ok) {
        const data = await response.json()
        updateFromResponse(data.status, data.settings?.updated_at)
      }
    } catch (error) {
      console.error('Failed to refresh site settings:', error)
    }
  }

  const handleToggle = () => {
    const nextLiveState = !isLive
    setIsLive(nextLiveState)
    persistChanges(
      { is_customer_app_live: nextLiveState },
      nextLiveState
        ? 'Customer app is now live'
        : 'Customer app is now under construction'
    )
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    persistChanges(
      {
        maintenance_title: title,
        maintenance_message: message,
        maintenance_cta_label: ctaLabel,
        maintenance_cta_href: ctaHref
      },
      'Maintenance content saved'
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between flex-col md:flex-row md:items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Customer App Availability</h3>
          <p className="text-sm text-gray-600 mt-1">
            Toggle public access to the customer-facing experience and customize the under construction message.
          </p>
        </div>
        <button
          type="button"
          onClick={handleToggle}
          disabled={isPending}
          className={`mt-4 md:mt-0 inline-flex items-center px-4 py-2 rounded-full border transition-colors ${
            isLive
              ? 'border-green-600 bg-green-50 text-green-700 hover:bg-green-100'
              : 'border-amber-600 bg-amber-50 text-amber-700 hover:bg-amber-100'
          } ${isPending ? 'opacity-75 cursor-not-allowed' : ''}`}
        >
          <span
            className={`h-2 w-2 rounded-full mr-2 ${
              isLive ? 'bg-green-500' : 'bg-amber-500'
            }`}
          />
          {isLive ? 'Customer App Live' : 'Customer App Hidden'}
        </button>
      </div>

      <dl className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
        <div className="bg-gray-50 rounded-lg p-3">
          <dt className="font-medium text-gray-900">Current Mode</dt>
          <dd className="mt-1">
            {status.isCustomerAppLive ? 'Public storefront available' : 'Showing under construction screen'}
          </dd>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <dt className="font-medium text-gray-900">Updated</dt>
          <dd className="mt-1">{lastSavedAt ? new Date(lastSavedAt).toLocaleString() : 'Not recorded'}</dd>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <dt className="font-medium text-gray-900">Under Construction CTA</dt>
          <dd className="mt-1">
            <span className="font-medium">{status.maintenanceCtaLabel}</span>
            <span className="text-gray-500 block">{status.maintenanceCtaHref}</span>
          </dd>
        </div>
      </dl>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="maintenanceTitle" className="block text-sm font-medium text-gray-700">
            Maintenance Title
          </label>
          <input
            id="maintenanceTitle"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500"
            placeholder="We're brewing something new!"
            disabled={isPending}
          />
        </div>

        <div>
          <label htmlFor="maintenanceMessage" className="block text-sm font-medium text-gray-700">
            Maintenance Message
          </label>
          <textarea
            id="maintenanceMessage"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={4}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500"
            placeholder="Our digital cafe is currently under construction. Check back soon for a fresh experience."
            disabled={isPending}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="maintenanceCtaLabel" className="block text-sm font-medium text-gray-700">
              CTA Label
            </label>
            <input
              id="maintenanceCtaLabel"
              type="text"
              value={ctaLabel}
              onChange={(event) => setCtaLabel(event.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500"
              placeholder="Visit our Contact Page"
              disabled={isPending}
            />
          </div>
          <div>
            <label htmlFor="maintenanceCtaHref" className="block text-sm font-medium text-gray-700">
              CTA URL
            </label>
            <input
              id="maintenanceCtaHref"
              type="text"
              value={ctaHref}
              onChange={(event) => setCtaHref(event.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500"
              placeholder="/contact"
              disabled={isPending}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Saving…' : 'Save Maintenance Content'}
          </Button>
        </div>
      </form>
    </div>
  )
}
