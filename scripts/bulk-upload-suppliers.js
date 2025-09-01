#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const yaml = require('js-yaml')
const { createClient } = require('@supabase/supabase-js')

// Load environment variables from both .env and .env.local
require('dotenv').config({ path: '.env.local' })
require('dotenv').config({ path: '.env' })

async function main() {
  const args = process.argv.slice(2)
  
  if (args.length === 0) {
    console.log(`
Usage: node scripts/bulk-upload-suppliers.js <yaml-file> [options]

Options:
  --replace     Replace all existing suppliers (default: false)
  --email       Admin email address (required for authentication)
  --help        Show this help message

Example:
  node scripts/bulk-upload-suppliers.js suppliers.yaml --email admin@example.com
  node scripts/bulk-upload-suppliers.js suppliers.yaml --replace --email admin@example.com
`)
    process.exit(1)
  }

  if (args.includes('--help')) {
    console.log(`
Bulk Supplier Upload Tool

This tool reads a YAML file containing supplier data and uploads it to your cafe management system.

YAML File Format:
suppliers:
  - name: "Coffee Roasters Inc"
    contact_person: "John Smith"
    email: "john@coffeeroasters.com"
    phone: "(555) 123-4567"
    address: "123 Coffee St, Denver CO 80202"
    payment_terms: "Net 30"
    notes: "Premium coffee supplier"
    is_active: true
  - name: "Local Dairy Farm"
    contact_person: "Mary Johnson"
    email: "mary@localdairy.com"
    phone: "(555) 987-6543"
    payment_terms: "COD"
    is_active: true

Required fields:
  - name: Supplier name (must be unique)

Optional fields:
  - contact_person: Primary contact name
  - email: Contact email address
  - phone: Contact phone number
  - address: Business address
  - payment_terms: Payment terms (e.g., "Net 30", "COD", "Net 15")
  - notes: Additional notes about the supplier
  - is_active: Whether supplier is active (default: true)
`)
    process.exit(0)
  }

  const yamlFile = args[0]
  const replaceExisting = args.includes('--replace')
  const emailIndex = args.indexOf('--email')
  const adminEmail = emailIndex !== -1 && args[emailIndex + 1] 
    ? args[emailIndex + 1] 
    : null

  // Check required parameters
  if (!adminEmail) {
    console.error('❌ Error: Admin email is required for authentication')
    console.error('Usage: npm run upload-suppliers suppliers.yaml -- --email admin@example.com')
    process.exit(1)
  }

  if (!fs.existsSync(yamlFile)) {
    console.error(`❌ Error: File '${yamlFile}' not found`)
    process.exit(1)
  }

  // Check environment variables
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
    console.error('❌ Error: Missing Supabase environment variables')
    console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are set in your .env file')
    process.exit(1)
  }

  console.log(`📁 Reading suppliers from: ${yamlFile}`)
  console.log(`👤 Admin email: ${adminEmail}`)
  console.log(`🔄 Replace existing: ${replaceExisting}`)
  console.log('')

  try {
    // Read and parse YAML file
    const fileContent = fs.readFileSync(yamlFile, 'utf8')
    const data = yaml.load(fileContent)
    
    let suppliers
    if (Array.isArray(data)) {
      suppliers = data
    } else if (data.suppliers && Array.isArray(data.suppliers)) {
      suppliers = data.suppliers
    } else {
      throw new Error('YAML file must contain a "suppliers" array or be an array of suppliers')
    }

    console.log(`📋 Found ${suppliers.length} suppliers in YAML file`)

    // Validate suppliers
    suppliers.forEach((supplier, index) => {
      if (!supplier.name || typeof supplier.name !== 'string') {
        throw new Error(`Supplier at index ${index} must have a name`)
      }
    })

    // Create Supabase client with service role
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SECRET_KEY
    )

    // Verify admin access by checking the user's role
    console.log('🔐 Verifying admin access...')
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('email', adminEmail)
      .single()

    if (profileError || !profile) {
      throw new Error(`Admin user not found: ${adminEmail}`)
    }

    if (profile.role !== 'admin') {
      throw new Error(`User ${adminEmail} does not have admin privileges (role: ${profile.role})`)
    }

    console.log(`✅ Admin access verified for ${adminEmail}`)

    // Process suppliers directly via Supabase
    const validatedSuppliers = suppliers.map(supplier => ({
      name: supplier.name.trim(),
      contact_person: supplier.contact_person?.trim() || null,
      email: supplier.email?.trim() || null,
      phone: supplier.phone?.trim() || null,
      address: supplier.address?.trim() || null,
      payment_terms: supplier.payment_terms?.trim() || null,
      notes: supplier.notes?.trim() || null,
      is_active: supplier.is_active !== undefined ? Boolean(supplier.is_active) : true
    }))

    // Check for duplicate names within the upload
    const supplierNames = validatedSuppliers.map(s => s.name)
    const duplicateNames = supplierNames.filter((name, index) => supplierNames.indexOf(name) !== index)
    if (duplicateNames.length > 0) {
      throw new Error(`Duplicate supplier names found: ${[...new Set(duplicateNames)].join(', ')}`)
    }

    let result = { created: 0, updated: 0, errors: [] }

    // If replace existing, clear all current suppliers first
    if (replaceExisting) {
      console.log('🗑️  Removing existing suppliers...')
      const { error: deleteError } = await supabase
        .from('suppliers')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all
        
      if (deleteError) {
        throw new Error(`Failed to clear existing suppliers: ${deleteError.message}`)
      }
      console.log('✅ Existing suppliers cleared')
    }

    // Process each supplier
    console.log('📤 Processing suppliers...')
    for (const supplier of validatedSuppliers) {
      try {
        if (replaceExisting) {
          // Insert new supplier
          const { error: insertError } = await supabase
            .from('suppliers')
            .insert([supplier])
            
          if (insertError) {
            result.errors.push(`Failed to create ${supplier.name}: ${insertError.message}`)
          } else {
            result.created++
            console.log(`  ✅ Created: ${supplier.name}`)
          }
        } else {
          // Try to update existing, or insert if not exists
          const { data: existing } = await supabase
            .from('suppliers')
            .select('id')
            .eq('name', supplier.name)
            .single()

          if (existing) {
            const { error: updateError } = await supabase
              .from('suppliers')
              .update(supplier)
              .eq('id', existing.id)
              
            if (updateError) {
              result.errors.push(`Failed to update ${supplier.name}: ${updateError.message}`)
            } else {
              result.updated++
              console.log(`  🔄 Updated: ${supplier.name}`)
            }
          } else {
            const { error: insertError } = await supabase
              .from('suppliers')
              .insert([supplier])
              
            if (insertError) {
              result.errors.push(`Failed to create ${supplier.name}: ${insertError.message}`)
            } else {
              result.created++
              console.log(`  ✅ Created: ${supplier.name}`)
            }
          }
        }
      } catch (error) {
        result.errors.push(`Unexpected error processing ${supplier.name}: ${error}`)
      }
    }

    // Display results
    console.log('')
    console.log('✅ Upload completed successfully!')
    console.log(`📈 Results:`)
    console.log(`   • Created: ${result.created} suppliers`)
    console.log(`   • Updated: ${result.updated} suppliers`)
    
    if (result.errors.length > 0) {
      console.log(`   • Errors: ${result.errors.length}`)
      console.log('')
      console.log('❌ Errors encountered:')
      result.errors.forEach(error => {
        console.log(`   • ${error}`)
      })
    }

    console.log('')
    console.log('🎉 Bulk upload completed!')
    console.log('')
    console.log('💡 You can view your suppliers at: /admin/inventory (Suppliers tab)')

  } catch (error) {
    console.error('')
    console.error('❌ Error:', error.message)
    
    if (error.message.includes('Admin user not found')) {
      console.log('\n💡 Make sure:')
      console.log('   • The email address is correct')
      console.log('   • The user exists in your system')
      console.log('   • You are using the production database')
    } else if (error.message.includes('does not have admin privileges')) {
      console.log('\n💡 To grant admin access:')
      console.log('   1. Go to your Supabase dashboard')
      console.log('   2. Open Table Editor → profiles')
      console.log('   3. Find your user and set role = "admin"')
    } else if (error.message.includes('Missing Supabase environment variables')) {
      console.log('\n💡 Make sure your .env file contains:')
      console.log('   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url')
      console.log('   SUPABASE_SECRET_KEY=your-supabase-secret-key')
    }
    
    process.exit(1)
  }
}

main().catch(console.error)