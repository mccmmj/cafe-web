import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

/**
 * Server-side admin authentication check
 * Redirects to /admin/login if not authenticated or not admin
 */
export async function requireAdmin() {
  const supabase = await createClient()
  
  // Check if user is authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    redirect('/admin/login')
  }
  
  // Check if user has admin role
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  
  if (profileError || profile?.role !== 'admin') {
    redirect('/admin/login')
  }
  
  return { user, profile }
}

/**
 * Client-side admin check hook
 */
export async function checkAdminRole(userId: string): Promise<boolean> {
  try {
    const response = await fetch('/api/admin/check-role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    })
    
    const data = await response.json()
    return data.isAdmin || false
  } catch (error) {
    console.error('Error checking admin role:', error)
    return false
  }
}

/**
 * Admin authentication for API routes
 */
export async function requireAdminAPI(request: Request) {
  const supabase = await createClient()
  
  // Get auth token from request headers
  const authorization = request.headers.get('authorization')
  if (!authorization) {
    return { error: 'No authorization header', status: 401 }
  }
  
  // Set the auth token
  const token = authorization.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  
  if (authError || !user) {
    return { error: 'Invalid authentication', status: 401 }
  }
  
  // Check admin role
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  
  if (profileError || profile?.role !== 'admin') {
    return { error: 'Admin access required', status: 403 }
  }
  
  return { user, profile }
}