/**
 * Script to create a temporary admin user for emergency access
 * This creates a new user with admin privileges
 * 
 * Usage: node scripts/create-temp-admin.js <email> <password>
 * Example: node scripts/create-temp-admin.js temp-admin@example.com temppass123
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function createTempAdmin(email, password) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing Supabase environment variables')
    process.exit(1)
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  try {
    console.log(`Creating temporary admin user: ${email}...`)

    // Create the user using admin API
    const { data: user, error: createError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true // Skip email confirmation
    })

    if (createError) {
      throw new Error(`Failed to create user: ${createError.message}`)
    }

    console.log(`User created with ID: ${user.user.id}`)

    // Create admin profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: user.user.id,
        email: email,
        role: 'admin',
        full_name: 'Temporary Admin'
      })

    if (profileError) {
      throw new Error(`Failed to create profile: ${profileError.message}`)
    }

    console.log(`✅ Successfully created temporary admin user!`)
    console.log(`Email: ${email}`)
    console.log(`Password: ${password}`)
    console.log('You can now log in at /admin/login')
    console.log('')
    console.log('⚠️  IMPORTANT: Delete this temporary user after regaining access to your main account')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

// Get email and password from command line arguments
const email = process.argv[2]
const password = process.argv[3]

if (!email || !password) {
  console.error('Please provide both email and password')
  console.error('Usage: node scripts/create-temp-admin.js <email> <password>')
  console.error('Example: node scripts/create-temp-admin.js temp-admin@example.com temppass123')
  process.exit(1)
}

// Validate email format
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
if (!emailRegex.test(email)) {
  console.error('Please provide a valid email address')
  process.exit(1)
}

// Validate password length
if (password.length < 6) {
  console.error('Password must be at least 6 characters long')
  process.exit(1)
}

createTempAdmin(email, password)