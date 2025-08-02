#!/usr/bin/env node

/**
 * Test the Square API directly using the same logic as fetch-client.ts
 */

require('dotenv').config({ path: '.env.local' });
const https = require('https');

console.log('🔍 Testing Square API directly with current environment variables');
console.log('Environment variables:');
console.log(`- SQUARE_ENVIRONMENT: ${process.env.SQUARE_ENVIRONMENT}`);
console.log(`- SQUARE_ACCESS_TOKEN: ${process.env.SQUARE_ACCESS_TOKEN?.substring(0, 10)}...`);
console.log(`- SQUARE_LOCATION_ID: ${process.env.SQUARE_LOCATION_ID}`);
console.log('='.repeat(60));

// Replicate the exact logic from fetch-client.ts
const SQUARE_BASE_URL = process.env.SQUARE_ENVIRONMENT === 'production' 
  ? 'https://connect.squareup.com' 
  : 'https://connect.squareupsandbox.com';

const SQUARE_VERSION = '2024-12-18';

console.log(`Using base URL: ${SQUARE_BASE_URL}`);

function makeSquareRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: SQUARE_BASE_URL.replace('https://', ''),
      path: path,
      method: 'GET',
      headers: {
        'Square-Version': SQUARE_VERSION,
        'Authorization': `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    };

    console.log(`\nMaking request to: ${SQUARE_BASE_URL}${path}`);
    console.log(`Headers: ${JSON.stringify(options.headers, null, 2)}`);

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log(`Response status: ${res.statusCode}`);
        console.log(`Response headers: ${JSON.stringify(res.headers, null, 2)}`);
        
        try {
          const result = JSON.parse(data);
          resolve(result);
        } catch (error) {
          console.log(`Raw response: ${data}`);
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.error(`Request error: ${error.message}`);
      reject(error);
    });

    req.end();
  });
}

async function testDirectAPI() {
  try {
    console.log('\n📋 Testing /v2/catalog/list?types=ITEM,CATEGORY');
    
    const result = await makeSquareRequest('/v2/catalog/list?types=ITEM,CATEGORY');
    
    if (result.errors) {
      console.log('❌ API returned errors:', JSON.stringify(result.errors, null, 2));
      return;
    }
    
    if (!result.objects) {
      console.log('❌ No objects returned');
      console.log('Full result:', JSON.stringify(result, null, 2));
      return;
    }
    
    console.log(`✅ Total objects returned: ${result.objects.length}`);
    
    // Count by type
    const byType = result.objects.reduce((acc, obj) => {
      acc[obj.type] = (acc[obj.type] || 0) + 1;
      return acc;
    }, {});
    
    console.log('Objects by type:', byType);
    
    // Show first few categories
    const categories = result.objects.filter(obj => obj.type === 'CATEGORY');
    console.log(`\n📁 Categories found: ${categories.length}`);
    
    if (categories.length > 0) {
      console.log('First 5 categories:');
      categories.slice(0, 5).forEach((cat, index) => {
        console.log(`${index + 1}. "${cat.category_data?.name || 'Unnamed'}" (ID: ${cat.id})`);
      });
    } else {
      console.log('❌ NO CATEGORIES FOUND');
      console.log('This means either:');
      console.log('  1. Wrong access token being used');
      console.log('  2. Wrong environment (sandbox vs production)');
      console.log('  3. Categories don\'t exist in this Square account');
    }
    
    // Show first few items  
    const items = result.objects.filter(obj => obj.type === 'ITEM');
    console.log(`\n🍽️ Items found: ${items.length}`);
    
    if (items.length > 0) {
      console.log('First 3 items with their category assignments:');
      items.slice(0, 3).forEach((item, index) => {
        console.log(`${index + 1}. "${item.item_data?.name || 'Unnamed'}"`);
        console.log(`   Categories: ${JSON.stringify(item.item_data?.categories || [])}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error testing direct API:', error.message);
  }
}

testDirectAPI().catch(console.error);