/**
 * Script to list all users and their roles
 * Useful for debugging authentication issues
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function listUsers() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing Supabase environment variables')
    process.exit(1)
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  try {
    console.log('Fetching all users...\n')

    // Get auth users
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers()
    
    if (usersError) {
      throw new Error(`Failed to list users: ${usersError.message}`)
    }

    // Get profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')

    if (profilesError) {
      console.warn('Could not fetch profiles:', profilesError.message)
    }

    console.log(`Found ${users.users.length} users:\n`)

    users.users.forEach(user => {
      const profile = profiles?.find(p => p.id === user.id)
      console.log(`📧 Email: ${user.email}`)
      console.log(`🆔 ID: ${user.id}`)
      console.log(`👤 Role: ${profile?.role || 'No profile'}`)
      console.log(`📅 Created: ${new Date(user.created_at).toLocaleDateString()}`)
      console.log(`✅ Confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`)
      console.log('---')
    })
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

listUsers()