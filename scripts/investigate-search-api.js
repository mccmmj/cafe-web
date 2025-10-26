#!/usr/bin/env node

/**
 * READ-ONLY investigation of Square search API behavior (LIVE PRODUCTION)
 * Focus on searchCatalogItems vs listCatalog differences
 */

require('dotenv').config({ path: '.env.local' });
const https = require('https');

const SQUARE_BASE_URL = 'https://connect.squareup.com';
const SQUARE_VERSION = '2024-12-18';
const LOCATION_ID = process.env.SQUARE_LOCATION_ID;

console.log('🔍 INVESTIGATING SEARCH API vs LIST API (READ-ONLY)');
console.log(`Location ID: ${LOCATION_ID}`);
console.log('='.repeat(60));

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

async function investigateSearchBehavior() {
  try {
    console.log('\n📋 TEST 1: List Catalog API (what we use for items)');
    
    const listResponse = await makeSquareRequest('/v2/catalog/list?types=ITEM');
    const listItems = listResponse.objects || [];
    
    console.log(`✅ List API returned: ${listItems.length} items`);
    
    const listDanishItems = listItems.filter(item => 
      item.item_data?.name?.toLowerCase().includes('danish')
    );
    
    console.log(`🥐 Danish items from List API: ${listDanishItems.length}`);
    listDanishItems.forEach((item, index) => {
      console.log(`${index + 1}. "${item.item_data?.name}" (ID: ${item.id})`);
    });
    
    console.log('\n🔍 TEST 2: Search Catalog Items API (what menu API should use?)');
    
    // Test basic searchCatalogItems
    const basicSearchBody = {
      enabled_location_ids: [LOCATION_ID],
      product_types: ['REGULAR']
    };
    
    const basicSearchResponse = await makeSquareRequest(
      '/v2/catalog/search-catalog-items', 
      'POST', 
      basicSearchBody
    );
    
    const searchItems = basicSearchResponse.items || [];
    console.log(`✅ Basic Search API returned: ${searchItems.length} items`);
    
    const searchDanishItems = searchItems.filter(item => 
      item.item_data?.name?.toLowerCase().includes('danish')
    );
    
    console.log(`🥐 Danish items from Search API: ${searchDanishItems.length}`);
    searchDanishItems.forEach((item, index) => {
      console.log(`${index + 1}. "${item.item_data?.name}" (ID: ${item.id})`);
    });
    
    console.log('\n🔍 TEST 3: Compare what our menu API actually uses');
    
    // Check our current menu API implementation
    console.log('Our current menu API uses:');
    console.log('- listCatalogObjects([\'ITEM\']) for items');
    console.log('- listCatalogObjects([\'CATEGORY\']) for categories');
    console.log('- No location filtering in the list call');
    console.log('- No enabled_location_ids filter');
    
    console.log('\n📊 COMPARISON RESULTS:');
    
    if (listDanishItems.length !== searchDanishItems.length) {
      console.log('❌ MISMATCH FOUND!');
      console.log(`List API finds ${listDanishItems.length} Danish items`);
      console.log(`Search API finds ${searchDanishItems.length} Danish items`);
      
      // Find missing items
      const listIds = listDanishItems.map(item => item.id);
      const searchIds = searchDanishItems.map(item => item.id);
      
      const missingInSearch = listDanishItems.filter(item => !searchIds.includes(item.id));
      const missingInList = searchDanishItems.filter(item => !listIds.includes(item.id));
      
      if (missingInSearch.length > 0) {
        console.log('\n🔴 Items in List API but NOT in Search API:');
        missingInSearch.forEach(item => {
          console.log(`- "${item.item_data?.name}" (ID: ${item.id})`);
          console.log(`  Present at all locations: ${item.present_at_all_locations}`);
          console.log(`  Present at locations: ${item.present_at_location_ids}`);
          console.log(`  Absent at locations: ${item.absent_at_location_ids}`);
        });
      }
      
      if (missingInList.length > 0) {
        console.log('\n🔴 Items in Search API but NOT in List API:');
        missingInList.forEach(item => {
          console.log(`- "${item.item_data?.name}" (ID: ${item.id})`);
        });
      }
    } else {
      console.log('✅ Both APIs return the same Danish items');
    }
    
    console.log('\n🔍 TEST 4: Check archived items specifically');
    
    // Look for items that might be marked differently
    console.log('Checking for items with any deletion/archival markers...');
    
    const allItemsWithStatus = listItems.map(item => ({
      id: item.id,
      name: item.item_data?.name,
      is_deleted: item.is_deleted,
      item_data_is_deleted: item.item_data?.is_deleted,
      present_at_all_locations: item.present_at_all_locations,
      present_at_location_ids: item.present_at_location_ids,
      absent_at_location_ids: item.absent_at_location_ids
    }));
    
    const potentiallyArchived = allItemsWithStatus.filter(item => 
      item.is_deleted || 
      item.item_data_is_deleted || 
      (item.present_at_all_locations === false && 
       item.present_at_location_ids && 
       !item.present_at_location_ids.includes(LOCATION_ID))
    );
    
    console.log(`Found ${potentiallyArchived.length} items with potential archival/location issues`);
    
    if (potentiallyArchived.length > 0) {
      console.log('\nPotentially problematic items:');
      potentiallyArchived.slice(0, 5).forEach(item => {
        console.log(`- "${item.name}"`);
        console.log(`  is_deleted: ${item.is_deleted}`);
        console.log(`  item_data_is_deleted: ${item.item_data_is_deleted}`);
        console.log(`  present_at_all_locations: ${item.present_at_all_locations}`);
        console.log(`  available at our location: ${item.present_at_location_ids?.includes(LOCATION_ID)}`);
      });
    }
    
    console.log('\n💡 NEXT STEPS:');
    console.log('1. Our menu API should use searchCatalogItems with enabled_location_ids');
    console.log('2. This will properly filter by location availability');
    console.log('3. This should resolve the Danish items visibility issue');
    
  } catch (error) {
    console.error('❌ Error investigating search behavior:', error.message);
  }
}

investigateSearchBehavior().catch(console.error);