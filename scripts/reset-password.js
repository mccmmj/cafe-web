/**
 * Script to manually reset a user's password using Supabase Admin API
 * Run this when normal password reset emails don't work
 * 
 * Usage: node scripts/reset-password.js <email> <new-password>
 * Example: node scripts/reset-password.js admin@littlecafe.com newpassword123
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function resetUserPassword(email, newPassword) {
  const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing Supabase environment variables.')
    console.error('Expected PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY (service role).')
    process.exit(1)
  }

  const supabase = createClient(
    supabaseUrl,
    serviceRoleKey
  )

  try {
    console.log(`Resetting password for ${email}...`)

    // First, find the user by email
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers()
    
    if (usersError) {
      throw new Error(`Failed to list users: ${usersError.message}`)
    }

    const user = users.users.find(u => u.email === email)
    
    if (!user) {
      throw new Error(`User with email ${email} not found.`)
    }

    console.log(`Found user: ${user.id}`)

    // Update the user's password using the admin API
    const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
      password: newPassword
    })

    if (error) {
      throw new Error(`Failed to update password: ${error.message}`)
    }

    console.log(`✅ Successfully reset password for ${email}`)
    console.log('You can now log in with the new password at /admin/login')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

// Get email and new password from command line arguments
const email = process.argv[2]
const newPassword = process.argv[3]

if (!email || !newPassword) {
  console.error('Please provide both email and new password')
  console.error('Usage: node scripts/reset-password.js <email> <new-password>')
  console.error('Example: node scripts/reset-password.js admin@littlecafe.com newpassword123')
  process.exit(1)
}

// Validate email format
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
if (!emailRegex.test(email)) {
  console.error('Please provide a valid email address')
  process.exit(1)
}

// Validate password length
if (newPassword.length < 6) {
  console.error('Password must be at least 6 characters long')
  process.exit(1)
}

resetUserPassword(email, newPassword)
