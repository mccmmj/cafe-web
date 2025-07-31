import { requireAdmin } from '@/lib/admin/auth'
import { AdminNavigation } from '@/components/admin/AdminNavigation'

export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // This will redirect to /admin/login if not authenticated or not admin
  await requireAdmin()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Navigation */}
      <AdminNavigation />
      
      {/* Main Content */}
      <main className="pl-64 pt-16">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  )
}