#!/usr/bin/env node

// Simple build verification script
const fs = require('fs')
const path = require('path')

console.log('🔍 Verifying production build...\n')

const checks = [
  {
    name: 'Next.js build directory',
    path: '.next',
    type: 'directory'
  },
  {
    name: 'Server build',
    path: '.next/server',
    type: 'directory'
  },
  {
    name: 'Invoice API routes',
    path: '.next/server/app/api/admin/invoices',
    type: 'directory'
  },
  {
    name: 'Invoice parsing endpoint',
    path: '.next/server/app/api/admin/invoices/[id]/parse/route.js',
    type: 'file'
  },
  {
    name: 'AI test endpoint',
    path: '.next/server/app/api/admin/invoices/test-ai/route.js',
    type: 'file'
  },
  {
    name: 'Admin invoice page',
    path: '.next/server/app/admin/(protected)/invoices/page.js',
    type: 'file'
  }
]

let allPassed = true

checks.forEach(check => {
  const fullPath = path.join(__dirname, '..', check.path)
  let exists = false
  
  try {
    const stats = fs.statSync(fullPath)
    if (check.type === 'directory') {
      exists = stats.isDirectory()
    } else {
      exists = stats.isFile()
    }
  } catch (error) {
    exists = false
  }
  
  const status = exists ? '✅ PASS' : '❌ FAIL'
  console.log(`${status} - ${check.name}`)
  
  if (!exists) {
    allPassed = false
    console.log(`       Missing: ${check.path}`)
  }
})

console.log('\n📊 Build Verification Summary:')
console.log('='.repeat(40))

if (allPassed) {
  console.log('🎉 ALL CHECKS PASSED')
  console.log('✅ Production build is ready for deployment')
  console.log('')
  console.log('Next steps:')
  console.log('1. Set OPENAI_API_KEY environment variable for AI parsing')
  console.log('2. Configure production Supabase credentials')
  console.log('3. Test invoice upload and parsing in production')
} else {
  console.log('⚠️  SOME CHECKS FAILED')
  console.log('❌ Build verification issues detected')
  console.log('Please check the missing files/directories above')
}

process.exit(allPassed ? 0 : 1)