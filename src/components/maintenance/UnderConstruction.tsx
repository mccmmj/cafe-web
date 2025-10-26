import Link from 'next/link'
import type { SiteStatus } from '@/types/settings'

interface UnderConstructionProps {
  status: SiteStatus
}

export default function UnderConstruction({ status }: UnderConstructionProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-amber-50 flex flex-col items-center justify-center px-4 text-center">
      <div className="max-w-2xl space-y-6">
        <div className="inline-flex items-center rounded-full bg-primary-100 px-4 py-1 text-sm font-medium text-primary-700">
          Little Cafe
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
          {status.maintenanceTitle}
        </h1>
        <p className="text-lg text-gray-600 leading-relaxed">
          {status.maintenanceMessage}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
          <Link
            href={status.maintenanceCtaHref || '/contact'}
            className="inline-flex items-center px-6 py-3 rounded-lg bg-primary-600 text-white font-semibold shadow-sm hover:bg-primary-700 transition-colors"
          >
            {status.maintenanceCtaLabel || 'Contact Us'}
          </Link>
          <Link
            href="mailto:info@littlecafe.com"
            className="text-sm text-gray-500 hover:text-primary-600 transition-colors"
          >
            Need help? Email us →
          </Link>
        </div>
      </div>
      <footer className="mt-16 text-xs text-gray-400">
        © {new Date().getFullYear()} Little Cafe. All rights reserved.
      </footer>
    </div>
  )
}
