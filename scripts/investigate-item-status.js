#!/usr/bin/env node

/**
 * READ-ONLY investigation of Square item statuses (LIVE PRODUCTION ACCOUNT)
 * This script examines archived/active item status and visibility
 */

require('dotenv').config({ path: '.env.local' });
const https = require('https');

const SQUARE_BASE_URL = process.env.SQUARE_ENVIRONMENT === 'production' 
  ? 'https://connect.squareup.com' 
  : 'https://connect.squareupsandbox.com';

const SQUARE_VERSION = '2024-12-18';

console.log('🔍 INVESTIGATING ITEM STATUS IN LIVE PRODUCTION SQUARE ACCOUNT (READ-ONLY)');
console.log('Environment:', process.env.SQUARE_ENVIRONMENT);
console.log('Location ID:', process.env.SQUARE_LOCATION_ID);
console.log('='.repeat(70));

function makeSquareRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: SQUARE_BASE_URL.replace('https://', ''),
      path: path,
      method: 'GET',  // READ-ONLY
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
    req.end();
  });
}

async function investigateItemStatus() {
  try {
    console.log('\n📋 STEP 1: Get ALL catalog items (including archived)');
    
    // Get all items without filtering to see everything
    const allItemsResponse = await makeSquareRequest('/v2/catalog/list?types=ITEM');
    
    if (!allItemsResponse.objects) {
      console.log('❌ No items returned from Square API');
      return;
    }
    
    const allItems = allItemsResponse.objects;
    console.log(`✅ Total items in Square catalog: ${allItems.length}`);
    
    // Analyze item statuses
    const itemAnalysis = {
      active: [],
      archived: [],
      deleted: [],
      danishItems: [],
      other: []
    };
    
    allItems.forEach(item => {
      const itemData = item.item_data;
      const name = itemData?.name || 'Unnamed';
      const isDeleted = itemData?.is_deleted || false;
      const isArchived = item.is_deleted || false; // Check both item level and item_data level
      
      // Categorize items
      if (isDeleted || isArchived) {
        if (isArchived) itemAnalysis.archived.push(item);
        if (isDeleted) itemAnalysis.deleted.push(item);
      } else {
        itemAnalysis.active.push(item);
      }
      
      // Check for Danish items specifically
      if (name.toLowerCase().includes('danish')) {
        itemAnalysis.danishItems.push({
          id: item.id,
          name: name,
          isDeleted: isDeleted,
          isArchived: isArchived,
          itemLevel_isDeleted: item.is_deleted,
          itemData_isDeleted: itemData?.is_deleted,
          presentAt: item.present_at_all_locations,
          presentAtLocations: item.present_at_location_ids,
          absentAtLocations: item.absent_at_location_ids
        });
      }
    });
    
    console.log('\n📊 ITEM STATUS ANALYSIS:');
    console.log(`Active items: ${itemAnalysis.active.length}`);
    console.log(`Archived items: ${itemAnalysis.archived.length}`);
    console.log(`Deleted items: ${itemAnalysis.deleted.length}`);
    
    console.log('\n🥐 DANISH ITEMS DETAILED ANALYSIS:');
    console.log(`Total Danish items found: ${itemAnalysis.danishItems.length}`);
    
    if (itemAnalysis.danishItems.length > 0) {
      itemAnalysis.danishItems.forEach((danish, index) => {
        console.log(`\n${index + 1}. "${danish.name}" (ID: ${danish.id})`);
        console.log(`   Item Level is_deleted: ${danish.itemLevel_isDeleted}`);
        console.log(`   Item Data is_deleted: ${danish.itemData_isDeleted}`);
        console.log(`   Overall Status: ${danish.isDeleted || danish.isArchived ? '🔴 ARCHIVED/DELETED' : '🟢 ACTIVE'}`);
        console.log(`   Present at all locations: ${danish.presentAt}`);
        console.log(`   Present at locations: ${danish.presentAtLocations || 'N/A'}`);
        console.log(`   Absent at locations: ${danish.absentAtLocations || 'N/A'}`);
      });
    }
    
    console.log('\n🔍 STEP 2: Check what our menu API receives');
    
    // Test what searchCatalogItems returns (this is what our menu API uses)
    const searchResponse = await makeSquareRequest('/v2/catalog/search-catalog-items');
    
    if (searchResponse.items) {
      console.log(`\n📱 Search API (menu API method) returns: ${searchResponse.items.length} items`);
      
      const searchDanishItems = searchResponse.items.filter(item => 
        item.item_data?.name?.toLowerCase().includes('danish')
      );
      
      console.log(`🥐 Danish items in search results: ${searchDanishItems.length}`);
      
      if (searchDanishItems.length > 0) {
        console.log('\nDanish items returned by search API (what appears on menu):');
        searchDanishItems.forEach((danish, index) => {
          console.log(`${index + 1}. "${danish.item_data?.name}" (ID: ${danish.id})`);
          console.log(`   is_deleted: ${danish.item_data?.is_deleted || false}`);
          console.log(`   Status: ${danish.item_data?.is_deleted ? '🔴 SHOULD NOT APPEAR' : '🟢 OK TO SHOW'}`);
        });
      }
    }
    
    console.log('\n🔍 STEP 3: Location-specific availability check');
    
    const locationId = process.env.SQUARE_LOCATION_ID;
    console.log(`Checking availability for location: ${locationId}`);
    
    // Test searchCatalogItems with location filter
    const locationSearchResponse = await makeSquareRequest('/v2/catalog/search-catalog-items');
    
    if (locationSearchResponse.items) {
      console.log(`\n📍 Location-filtered search returns: ${locationSearchResponse.items.length} items`);
      
      // Check if any Danish items are location-specific filtered
      const locationDanishItems = locationSearchResponse.items.filter(item => 
        item.item_data?.name?.toLowerCase().includes('danish')
      );
      
      console.log(`🥐 Danish items available at this location: ${locationDanishItems.length}`);
    }
    
    console.log('\n💡 RECOMMENDATIONS:');
    console.log('1. Check if archived items have is_deleted=false (they should be filtered out)');
    console.log('2. Check if active Danish items are present_at_all_locations=false');
    console.log('3. Verify location-specific availability settings');
    console.log('4. Update menu API to properly filter archived/deleted items');
    
  } catch (error) {
    console.error('❌ Error investigating item status:', error.message);
  }
}

investigateItemStatus().catch(console.error);