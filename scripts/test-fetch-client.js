#!/usr/bin/env node

/**
 * Test the fetch-client directly to see what it returns
 */

require('dotenv').config({ path: '.env.local' });

// Import the listCatalogObjects function
const { listCatalogObjects } = require('../src/lib/square/fetch-client.ts');

async function testFetchClient() {
  console.log('🔍 Testing fetch-client.ts listCatalogObjects function');
  console.log('Environment variables:');
  console.log(`- SQUARE_ENVIRONMENT: ${process.env.SQUARE_ENVIRONMENT}`);
  console.log(`- SQUARE_ACCESS_TOKEN: ${process.env.SQUARE_ACCESS_TOKEN?.substring(0, 10)}...`);
  console.log(`- SQUARE_LOCATION_ID: ${process.env.SQUARE_LOCATION_ID}`);
  console.log('='.repeat(60));

  try {
    console.log('\n📋 Testing listCatalogObjects([\'ITEM\', \'CATEGORY\'])');
    
    const result = await listCatalogObjects(['ITEM', 'CATEGORY']);
    
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
      console.log('❌ NO CATEGORIES FOUND - This is the problem!');
    }
    
    // Show first few items
    const items = result.objects.filter(obj => obj.type === 'ITEM');
    console.log(`\n🍽️ Items found: ${items.length}`);
    
    if (items.length > 0) {
      console.log('First 3 items with categories:');
      items.slice(0, 3).forEach((item, index) => {
        console.log(`${index + 1}. "${item.item_data?.name || 'Unnamed'}"`);
        console.log(`   Categories: ${JSON.stringify(item.item_data?.categories || [])}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error testing fetch client:', error.message);
    
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

testFetchClient().catch(console.error);