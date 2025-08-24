import { requireAdmin } from '@/lib/admin/auth'
import { InvoiceManagement } from '@/components/admin/InvoiceManagement'

export const metadata = {
  title: 'Invoice Import - Little Cafe Admin',
  description: 'AI-powered invoice import and order matching system',
}

export default async function AdminInvoicesPage() {
  // Ensure user has admin access
  await requireAdmin()

  return (
    <div>
      <InvoiceManagement />
    </div>
  )
}