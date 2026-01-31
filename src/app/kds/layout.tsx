import type { Metadata, Viewport } from 'next'
// Import warm theme (switch to './kds.css' for dark theme)
import './kds-warm.css'

export const metadata: Metadata = {
  title: 'Little Cafe - Menu Display',
  description: 'Kitchen Display System for Little Cafe',
  robots: 'noindex, nofollow', // Don't index KDS pages
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function KDSLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="kds-root">
      {children}
    </div>
  )
}
