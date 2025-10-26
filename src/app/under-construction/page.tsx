import type { Metadata } from 'next'
import UnderConstruction from '@/components/maintenance/UnderConstruction'
import { getSiteStatusUsingServiceClient } from '@/lib/services/siteSettings'

export const metadata: Metadata = {
  title: 'Little Cafe – Under Construction',
  description: 'Our customer app is currently under construction. Please check back soon for updates.'
}

export default async function UnderConstructionPage() {
  const status = await getSiteStatusUsingServiceClient()

  return <UnderConstruction status={status} />
}
