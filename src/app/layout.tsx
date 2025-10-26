import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import QueryProvider from '@/providers/QueryProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Little Cafe - Fresh Coffee & Pastries',
  description:
    'Welcome to Little Cafe, where we serve the finest coffee, delicious pastries, and create memorable moments. Visit us for a warm atmosphere and exceptional service.',
  keywords: 'cafe, coffee, pastries, breakfast, lunch, coffee shop, Little Cafe'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  )
}
