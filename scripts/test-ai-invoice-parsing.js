#!/usr/bin/env node

// Test script for AI invoice parsing functionality
// This script tests the AI parsing capabilities without needing actual PDF files

// Use require for CommonJS compatibility in scripts
const path = require('path')

async function loadModules() {
  try {
    // These will be loaded dynamically at runtime, not during build
    const aiService = require(path.join(__dirname, '../dist/lib/ai/openai-service.js'))
    const docProcessor = require(path.join(__dirname, '../dist/lib/document/pdf-processor.js'))
    
    return {
      parseInvoiceWithAI: aiService.parseInvoiceWithAI,
      validateInvoiceText: docProcessor.validateInvoiceText
    }
  } catch (error) {
    console.error('Could not load compiled modules. Please run npm run build first.')
    console.error('Error:', error.message)
    return null
  }
}

// Sample invoice text for testing
const SAMPLE_INVOICES = {
  'odeko': `
    ODEKO INVOICE
    Invoice #: ODK-2024-00123
    Date: January 15, 2024
    
    Bill To: Little Cafe
    10400 E Alameda Ave
    Denver, CO 80247
    
    Description                      Qty    Unit Price    Total
    Coffee Beans - Medium Roast      2 lbs    $12.99     $25.98
    Paper Cups 12oz (Case of 50)     3 cases   $8.75     $26.25
    Napkins - Brown (12x packs)      4 packs   $3.50     $14.00
    Sugar Packets (100 count)        5 boxes   $2.25     $11.25
    
    Subtotal:                                           $77.48
    Tax (8.25%):                                        $6.39
    Total Amount:                                      $83.87
    
    Terms: Net 30
    Due Date: February 14, 2024
  `,
  
  'walmart_business': `
    WALMART BUSINESS
    Invoice Date: 2024-01-20
    Invoice Number: WB240120001
    
    Ship To:
    Little Cafe
    Kaiser Permanente Medical Complex
    10400 E Alameda Ave
    Denver, CO 80247
    
    Item Description                    UPC Code        Qty    Price    Extended
    Great Value Coffee Filters          078742224237    6ea    $2.98    $17.88
    Folgers Classic Roast Coffee        025500209104    4ea   $11.48    $45.92
    Dixie Paper Plates 8.5" (125ct)     043500433023    2ea    $5.97    $11.94
    Reynolds Wrap Aluminum Foil         063367631225    3ea    $4.84    $14.52
    
    Merchandise Total:                                              $90.26
    Sales Tax:                                                       $7.44
    Invoice Total:                                                  $97.70
  `,
  
  'gold_seal': `
    GOLD SEAL FOODS
    INVOICE #GS-2024-0089
    Invoice Date: 01/18/2024
    
    Sold To: Little Cafe
    Address: 10400 E Alameda Ave, Denver CO 80247
    
    Item                             Code      Quantity    Unit Price    Amount
    Whole Milk - 1 Gallon           GS-1001      12 gal      $3.89      $46.68
    Heavy Cream - 1 Quart           GS-1023       6 qt       $4.25      $25.50
    Butter - Unsalted 1lb           GS-1045       8 lbs      $6.75      $54.00
    Eggs - Large Grade A (Dozen)    GS-2012      15 doz      $2.85      $42.75
    
    Subtotal:                                                        $168.93
    Delivery Charge:                                                   $8.50
    Tax (8.25%):                                                      $14.64
    
    TOTAL AMOUNT DUE:                                                $192.07
    
    Payment Terms: Net 15 Days
  `
}

async function testInvoiceParsing() {
  console.log('🧪 Starting AI Invoice Parsing Tests...\n')
  
  const modules = await loadModules()
  if (!modules) {
    return false
  }
  
  const { parseInvoiceWithAI, validateInvoiceText } = modules
  let allTests = []
  
  for (const [supplier, invoiceText] of Object.entries(SAMPLE_INVOICES)) {
    console.log(`Testing ${supplier.toUpperCase()} invoice...`)
    
    try {
      // Test 1: Text validation
      const validation = validateInvoiceText(invoiceText)
      console.log(`  📄 Text Validation: ${validation.isValid ? '✅ PASS' : '❌ FAIL'}`)
      console.log(`  📊 Validation Confidence: ${Math.round(validation.confidence * 100)}%`)
      
      if (validation.indicators.length > 0) {
        console.log(`  🔍 Indicators: ${validation.indicators.slice(0, 3).join(', ')}`)
      }
      
      // Test 2: AI Parsing (only if OpenAI key is configured)
      if (process.env.OPENAI_API_KEY) {
        console.log(`  🤖 Starting AI parsing...`)
        
        const aiResult = await parseInvoiceWithAI({
          text: invoiceText,
          supplier_name: supplier.charAt(0).toUpperCase() + supplier.slice(1).replace('_', ' ')
        })
        
        if (aiResult.success) {
          console.log(`  ✅ AI Parsing: SUCCESS`)
          console.log(`  📊 AI Confidence: ${Math.round(aiResult.confidence * 100)}%`)
          console.log(`  📋 Line Items Extracted: ${aiResult.data?.line_items?.length || 0}`)
          console.log(`  💰 Total Amount: $${aiResult.data?.total_amount || 'N/A'}`)
          
          allTests.push({
            supplier,
            validation: validation.isValid,
            parsing: true,
            confidence: aiResult.confidence,
            lineItems: aiResult.data?.line_items?.length || 0
          })
        } else {
          console.log(`  ❌ AI Parsing: FAILED`)
          console.log(`  💥 Errors: ${aiResult.errors?.join(', ') || 'Unknown'}`)
          
          allTests.push({
            supplier,
            validation: validation.isValid,
            parsing: false,
            confidence: 0,
            lineItems: 0
          })
        }
      } else {
        console.log(`  ⚠️  AI Parsing: SKIPPED (No OpenAI API key)`)
        
        allTests.push({
          supplier,
          validation: validation.isValid,
          parsing: false,
          confidence: validation.confidence,
          lineItems: 0,
          skipped: true
        })
      }
      
    } catch (error) {
      console.log(`  ❌ ERROR: ${error.message}`)
      
      allTests.push({
        supplier,
        validation: false,
        parsing: false,
        confidence: 0,
        lineItems: 0,
        error: error.message
      })
    }
    
    console.log('') // Empty line for readability
  }
  
  // Summary
  console.log('📊 TEST SUMMARY')
  console.log('='.repeat(50))
  
  const validationSuccess = allTests.filter(t => t.validation).length
  const parsingSuccess = allTests.filter(t => t.parsing).length
  const avgConfidence = allTests.reduce((sum, t) => sum + t.confidence, 0) / allTests.length
  const totalLineItems = allTests.reduce((sum, t) => sum + t.lineItems, 0)
  
  console.log(`Text Validation Success Rate: ${validationSuccess}/${allTests.length} (${Math.round(validationSuccess/allTests.length*100)}%)`)
  
  if (process.env.OPENAI_API_KEY) {
    console.log(`AI Parsing Success Rate: ${parsingSuccess}/${allTests.length} (${Math.round(parsingSuccess/allTests.length*100)}%)`)
    console.log(`Average Confidence: ${Math.round(avgConfidence * 100)}%`)
    console.log(`Total Line Items Extracted: ${totalLineItems}`)
  } else {
    console.log('AI Parsing: NOT TESTED (OpenAI API key not configured)')
  }
  
  // Overall result
  const overallSuccess = process.env.OPENAI_API_KEY ? 
    (validationSuccess === allTests.length && parsingSuccess >= allTests.length * 0.8) :
    (validationSuccess === allTests.length)
  
  console.log('')
  console.log(overallSuccess ? '🎉 OVERALL: TESTS PASSED' : '⚠️  OVERALL: TESTS NEED ATTENTION')
  
  return overallSuccess
}

// Run the tests
if (require.main === module) {
  testInvoiceParsing()
    .then(success => {
      process.exit(success ? 0 : 1)
    })
    .catch(error => {
      console.error('Test runner failed:', error)
      process.exit(1)
    })
}

module.exports = { testInvoiceParsing, SAMPLE_INVOICES }