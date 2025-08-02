#!/usr/bin/env node

/**
 * Simple Direct Square Catalog Test (READ-ONLY)
 * Tests directly against Square API to examine catalog structure
 */

require('dotenv').config({ path: '.env.local' });
const https = require('https');

const SQUARE_BASE_URL = process.env.SQUARE_ENVIRONMENT === 'production' 
  ? 'https://connect.squareup.com'
  : 'https://connect.squareupsandbox.com';

const ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN;
const LOCATION_ID = process.env.SQUARE_LOCATION_ID;

function makeSquareRequest(endpoint) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: SQUARE_BASE_URL.replace('https://', ''),
      path: endpoint,
      method: 'GET',
      headers: {
        'Square-Version': '2024-08-21',
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
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
    req.end();
  });
}

async function testLiveCatalog() {
  console.log('🔍 Direct Square Catalog API Test (READ-ONLY)');
  console.log(`Environment: ${process.env.SQUARE_ENVIRONMENT}`);
  console.log(`Location ID: ${LOCATION_ID}`);
  console.log('='.repeat(60));

  try {
    // Test 1: Get locations
    console.log('\n🔌 TEST 1: Locations');
    const locations = await makeSquareRequest('/v2/locations');
    if (locations.locations) {
      console.log(`✅ Found ${locations.locations.length} location(s)`);
      locations.locations.forEach(loc => {
        console.log(`   - ${loc.name} (ID: ${loc.id})`);
      });
    }

    // Test 2: Get all catalog objects
    console.log('\n📋 TEST 2: All Catalog Objects');
    const catalog = await makeSquareRequest('/v2/catalog/list?types=ITEM,CATEGORY,ITEM_VARIATION');
    
    if (catalog.objects) {
      console.log(`Total objects: ${catalog.objects.length}`);
      
      const byType = catalog.objects.reduce((acc, obj) => {
        acc[obj.type] = (acc[obj.type] || 0) + 1;
        return acc;
      }, {});
      
      console.log('By type:', byType);
    } else {
      console.log('❌ No catalog objects found');
    }

    // Test 3: Get categories specifically
    console.log('\n📁 TEST 3: Categories Only');
    const categories = await makeSquareRequest('/v2/catalog/list?types=CATEGORY');
    
    if (categories.objects && categories.objects.length > 0) {
      console.log(`✅ Categories found: ${categories.objects.length}`);
      categories.objects.forEach(cat => {
        console.log(`   📁 "${cat.category_data?.name || 'Unnamed'}" (ID: ${cat.id})`);
      });
    } else {
      console.log('❌ NO CATEGORIES FOUND - This explains the "Uncategorized" issue!');
    }

    // Test 4: Get items and examine category assignments
    console.log('\n🍽️ TEST 4: Items and Category Assignments');
    const items = await makeSquareRequest('/v2/catalog/list?types=ITEM');
    
    if (items.objects && items.objects.length > 0) {
      console.log(`✅ Items found: ${items.objects.length}`);
      
      let itemsWithCategories = 0;
      let itemsWithoutCategories = 0;
      
      // Show first 5 items as examples
      console.log('\n📝 Sample Items (first 5):');
      items.objects.slice(0, 5).forEach((item, index) => {
        const itemData = item.item_data;
        console.log(`\n   ${index + 1}. "${itemData?.name || 'Unnamed'}"`);
        console.log(`      ID: ${item.id}`);
        console.log(`      Categories: ${JSON.stringify(itemData?.categories || [])}`);
        console.log(`      Category ID (deprecated): ${itemData?.category_id || 'None'}`);
        
        if (itemData?.categories?.length > 0 || itemData?.category_id) {
          itemsWithCategories++;
        } else {
          itemsWithoutCategories++;
          console.log(`      ❌ NO CATEGORY - Will appear as "Uncategorized"`);
        }
      });
      
      console.log(`\n📊 Category Assignment Summary:`);
      console.log(`   Items WITH categories: ${itemsWithCategories}`);
      console.log(`   Items WITHOUT categories: ${itemsWithoutCategories}`);
      
      if (itemsWithoutCategories > 0) {
        console.log('\n💡 SOLUTION: Items without categories will appear as "Other Items"');
        console.log('   You need to assign categories to your items in Square Dashboard');
      }
    }

    // Test 5: Search catalog items (what our menu API uses)
    console.log('\n🔍 TEST 5: Search Catalog Items (Menu API Method)');
    const searchData = {
      enabled_location_ids: [LOCATION_ID],
      product_types: ['REGULAR']
    };
    
    const searchEndpoint = '/v2/catalog/search-catalog-items';
    const searchResult = await makeSquareRequest(searchEndpoint);
    
    if (searchResult.items && searchResult.items.length > 0) {
      console.log(`✅ Search found: ${searchResult.items.length} items`);
      
      // Show category distribution from search results
      const categoryDistribution = {};
      searchResult.items.forEach(item => {
        const categories = item.item_data?.categories || [];
        if (categories.length > 0) {
          categories.forEach(cat => {
            const catName = cat.name || 'Unnamed Category';
            categoryDistribution[catName] = (categoryDistribution[catName] || 0) + 1;
          });
        } else {
          categoryDistribution['NO CATEGORY'] = (categoryDistribution['NO CATEGORY'] || 0) + 1;
        }
      });
      
      console.log('\n📊 Search Results Category Distribution:');
      Object.entries(categoryDistribution).forEach(([catName, count]) => {
        console.log(`   "${catName}": ${count} items`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response);
    }
  }
}

testLiveCatalog().catch(console.error);