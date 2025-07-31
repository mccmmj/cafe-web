import { redirect } from 'next/navigation'

export default function AdminPage() {
  // Redirect /admin to /admin/dashboard (which will redirect to login if not authenticated)
  redirect('/admin/dashboard')
}