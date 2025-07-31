/**
 * Script to set the first admin user
 * Run this after the database migration is applied
 * 
 * Usage: node scripts/set-admin.js <email>
 * Example: node scripts/set-admin.js admin@littlecafe.com
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function setUserAsAdmin(email) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing Supabase environment variables')
    process.exit(1)
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  try {
    console.log(`Setting ${email} as admin user...`)

    // First, find the user by email
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers()
    
    if (usersError) {
      throw new Error(`Failed to list users: ${usersError.message}`)
    }

    const user = users.users.find(u => u.email === email)
    
    if (!user) {
      throw new Error(`User with email ${email} not found. Please make sure the user has signed up first.`)
    }

    console.log(`Found user: ${user.id}`)

    // Check if profile exists
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError && profileError.code !== 'PGRST116') { // PGRST116 = not found
      throw new Error(`Error checking profile: ${profileError.message}`)
    }

    if (!profile) {
      // Create profile if it doesn't exist
      console.log('Creating user profile...')
      const { error: createError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email,
          role: 'admin',
          full_name: user.user_metadata?.full_name || user.email.split('@')[0]
        })

      if (createError) {
        throw new Error(`Failed to create profile: ${createError.message}`)
      }
    } else {
      // Update existing profile to admin
      console.log('Updating existing profile to admin...')
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', user.id)

      if (updateError) {
        throw new Error(`Failed to update profile: ${updateError.message}`)
      }
    }

    console.log(`✅ Successfully set ${email} as admin user!`)
    console.log('The user can now access the admin dashboard at /admin/login')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

// Get email from command line arguments
const email = process.argv[2]

if (!email) {
  console.error('Please provide an email address')
  console.error('Usage: node scripts/set-admin.js <email>')
  process.exit(1)
}

// Validate email format
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
if (!emailRegex.test(email)) {
  console.error('Please provide a valid email address')
  process.exit(1)
}

setUserAsAdmin(email)