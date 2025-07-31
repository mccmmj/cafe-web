export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // No authentication check here - let individual pages handle it
  return children
}