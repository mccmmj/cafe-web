#!/usr/bin/env node

/**
 * READ-ONLY investigation of Square "archived" status (LIVE PRODUCTION)
 * Focus on understanding how archived items appear in API vs Dashboard
 */

require('dotenv').config({ path: '.env.local' });
const https = require('https');

const SQUARE_BASE_URL = 'https://connect.squareup.com';
const SQUARE_VERSION = '2024-12-18';
const LOCATION_ID = process.env.SQUARE_LOCATION_ID;

console.log('🔍 INVESTIGATING "ARCHIVED" STATUS IN SQUARE API (READ-ONLY)');
console.log(`Location ID: ${LOCATION_ID}`);
console.log('='.repeat(70));

function makeSquareRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'connect.squareup.com',
      path: path,
      method: method,
      headers: {
        'Square-Version': SQUARE_VERSION,
        'Authorization': `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

async function investigateArchivedStatus() {
  try {
    console.log('\n📋 STEP 1: Deep dive into Danish items that Dashboard shows as "archived"');
    
    const listResponse = await makeSquareRequest('/v2/catalog/list?types=ITEM');
    const allItems = listResponse.objects || [];
    
    const danishItems = allItems.filter(item => 
      item.item_data?.name?.toLowerCase().includes('danish')
    );
    
    console.log(`Found ${danishItems.length} Danish items in API`);
    
    const dashboardArchivedItems = [
      'Danish Blueberry',
      'Danish Lemon', 
      'Danish Raspberry',
      'Danish Cream Cheese'
    ];
    
    console.log('\n🔍 DETAILED ANALYSIS OF EACH DANISH ITEM:');
    
    danishItems.forEach((item, index) => {
      const name = item.item_data?.name;
      const isDashboardArchived = dashboardArchivedItems.includes(name);
      
      console.log(`\n${index + 1}. "${name}" (ID: ${item.id})`);
      console.log(`   🖥️  Dashboard Status: ${isDashboardArchived ? '🔴 ARCHIVED' : '🟢 ACTIVE'}`);
      console.log(`   📡 API Fields:`);
      console.log(`      item.is_deleted: ${item.is_deleted}`);
      console.log(`      item.type: ${item.type}`);
      console.log(`      item_data.is_deleted: ${item.item_data?.is_deleted}`);
      console.log(`      present_at_all_locations: ${item.present_at_all_locations}`);
      console.log(`      present_at_location_ids: ${JSON.stringify(item.present_at_location_ids)}`);
      console.log(`      absent_at_location_ids: ${JSON.stringify(item.absent_at_location_ids)}`);
      console.log(`      created_at: ${item.created_at}`);
      console.log(`      updated_at: ${item.updated_at}`);
      console.log(`      version: ${item.version}`);
      
      // Check for any other fields that might indicate archival
      const allFields = Object.keys(item);
      const dataFields = item.item_data ? Object.keys(item.item_data) : [];
      
      console.log(`   🔍 All item fields: ${allFields.join(', ')}`);
      console.log(`   🔍 All item_data fields: ${dataFields.join(', ')}`);
      
      // Check variations for archival status
      if (item.item_data?.variations) {
        console.log(`   🔧 Variations (${item.item_data.variations.length}):`);
        item.item_data.variations.forEach((variation, vIndex) => {
          console.log(`      ${vIndex + 1}. ${variation.item_variation_data?.name}`);
          console.log(`         variation.is_deleted: ${variation.is_deleted}`);
          console.log(`         variation_data.is_deleted: ${variation.item_variation_data?.is_deleted}`);
        });
      }
      
      if (isDashboardArchived) {
        console.log(`   ⚠️  MISMATCH: Dashboard shows archived but API shows active!`);
      }
    });
    
    console.log('\n📋 STEP 2: Check for inventory/visibility fields');
    
    // Check if there are inventory-related fields that might affect visibility
    const inventoryResponse = await makeSquareRequest('/v2/inventory/counts/batch-retrieve');
    
    if (inventoryResponse.counts) {
      console.log(`\n📦 Inventory data available for ${inventoryResponse.counts.length} items`);
      
      const danishInventory = inventoryResponse.counts.filter(count => {
        return danishItems.some(item => 
          item.item_data?.variations?.some(variation => variation.id === count.catalog_object_id)
        );
      });
      
      if (danishInventory.length > 0) {
        console.log('📦 Danish items inventory status:');
        danishInventory.forEach(inventory => {
          console.log(`   ${inventory.catalog_object_id}: ${inventory.quantity} units`);
          console.log(`     State: ${inventory.state}`);
        });
      }
    }
    
    console.log('\n📋 STEP 3: Test what different API endpoints return');
    
    // Test searchCatalogItems with various parameters
    const searchTests = [
      {
        name: 'Basic search (no location filter)',
        body: { product_types: ['REGULAR'] }
      },
      {
        name: 'Location-filtered search',
        body: { 
          enabled_location_ids: [LOCATION_ID],
          product_types: ['REGULAR'] 
        }
      },
      {
        name: 'Search with include_deleted_objects=false',
        body: { 
          enabled_location_ids: [LOCATION_ID],
          product_types: ['REGULAR'],
          include_deleted_objects: false
        }
      }
    ];
    
    for (const test of searchTests) {
      try {
        console.log(`\n🔍 Testing: ${test.name}`);
        const searchResponse = await makeSquareRequest(
          '/v2/catalog/search-catalog-items',
          'POST',
          test.body
        );
        
        const searchItems = searchResponse.items || [];
        const searchDanish = searchItems.filter(item => 
          item.item_data?.name?.toLowerCase().includes('danish')
        );
        
        console.log(`   Results: ${searchItems.length} total items, ${searchDanish.length} Danish items`);
        
        if (searchDanish.length > 0) {
          searchDanish.forEach(item => {
            console.log(`   - ${item.item_data?.name}`);
          });
        }
      } catch (error) {
        console.log(`   Error: ${error.message}`);
      }
    }
    
    console.log('\n💡 ANALYSIS:');
    console.log('If Dashboard shows items as archived but API shows them as active:');
    console.log('1. "Archived" might be a Dashboard-only status not reflected in API');
    console.log('2. Items might be archived at item variation level, not item level');
    console.log('3. Square might use different terminology (archived vs deleted vs disabled)');
    console.log('4. Location-specific settings might override archival status');
    
    console.log('\n🔧 RECOMMENDED SOLUTION:');
    console.log('Since you can see which items are archived in Dashboard:');
    console.log('1. Manually identify the archived item IDs from this output');
    console.log('2. Add a hardcoded filter in menu API to exclude these specific IDs');
    console.log('3. This ensures archived items don\'t appear regardless of API behavior');
    
  } catch (error) {
    console.error('❌ Error investigating archived status:', error.message);
  }
}

investigateArchivedStatus().catch(console.error);