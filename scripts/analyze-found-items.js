#!/usr/bin/env node

/**
 * Analyze the found Patter Bar items to understand why they don't appear in list API
 */

require('dotenv').config({ path: '.env.local' });
const https = require('https');

const SQUARE_BASE_URL = 'https://connect.squareup.com';
const SQUARE_VERSION = '2024-12-18';

console.log('🔍 ANALYZING FOUND PATTER BAR ITEMS');
console.log('='.repeat(50));

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
          resolve(JSON.parse(data));
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

async function analyzeItems() {
  try {
    console.log('\n📋 STEP 1: Search for both Patter Bar items via catalog search');
    
    const items = [
      'Patter Bar Blueberry Lemon',
      'Patter Bar Chocolate Banana'
    ];
    
    const foundItems = [];
    
    for (const itemName of items) {
      try {
        const searchResponse = await makeSquareRequest('/v2/catalog/search', 'POST', {
          object_types: ['ITEM'],
          query: {
            exact_query: {
              attribute_name: 'name',
              attribute_value: itemName
            }
          }
        });
        
        if (searchResponse.objects && searchResponse.objects.length > 0) {
          console.log(`✅ Found "${itemName}": ${searchResponse.objects[0].id}`);
          foundItems.push(searchResponse.objects[0]);
        } else {
          console.log(`❌ Not found: "${itemName}"`);
        }
      } catch (error) {
        console.log(`❌ Error searching for "${itemName}": ${error.message}`);
      }
    }
    
    console.log(`\n📊 Found ${foundItems.length} of 2 items via catalog search`);
    
    if (foundItems.length === 0) {
      console.log('❌ No items found via catalog search either');
      return;
    }
    
    console.log('\n📋 STEP 2: Analyze each found item in detail');
    
    foundItems.forEach((item, index) => {
      const itemData = item.item_data;
      
      console.log(`\n${index + 1}. "${itemData?.name}" (ID: ${item.id})`);
      console.log(`   📊 ALL STATUS FIELDS:`);
      console.log(`      item.is_deleted: ${item.is_deleted}`);
      console.log(`      item.type: ${item.type}`);
      console.log(`      item_data.is_deleted: ${itemData?.is_deleted}`);
      console.log(`      item_data.is_archived: ${itemData?.is_archived}`);
      console.log(`      item_data.ecom_available: ${itemData?.ecom_available}`);
      console.log(`      item_data.ecom_visibility: ${itemData?.ecom_visibility}`);
      
      console.log(`   📍 LOCATION FIELDS:`);
      console.log(`      present_at_all_locations: ${item.present_at_all_locations}`);
      console.log(`      present_at_location_ids: ${JSON.stringify(item.present_at_location_ids)}`);
      console.log(`      absent_at_location_ids: ${JSON.stringify(item.absent_at_location_ids)}`);
      
      console.log(`   📂 CATEGORY FIELDS:`);
      console.log(`      categories: ${JSON.stringify(itemData?.categories)}`);
      
      console.log(`   🏷️ OTHER FIELDS:`);
      console.log(`      product_type: ${itemData?.product_type}`);
      console.log(`      skip_modifier_screen: ${itemData?.skip_modifier_screen}`);
      console.log(`      channels: ${JSON.stringify(itemData?.channels)}`);
      
      console.log(`   🔧 VARIATIONS:`);
      if (itemData?.variations && itemData.variations.length > 0) {
        itemData.variations.forEach((variation, vIndex) => {
          console.log(`      ${vIndex + 1}. ${variation.item_variation_data?.name}`);
          console.log(`         ID: ${variation.id}`);
          console.log(`         is_deleted: ${variation.is_deleted}`);
          console.log(`         price: $${(variation.item_variation_data?.price_money?.amount || 0) / 100}`);
        });
      }
      
      // Test our filtering logic
      console.log(`   🧪 MENU API FILTERING TEST:`);
      
      let wouldBeFiltered = false;
      let reasons = [];
      
      if (item.is_deleted) reasons.push('item.is_deleted = true');
      if (itemData?.is_deleted) reasons.push('item_data.is_deleted = true');
      if (itemData?.is_archived) reasons.push('item_data.is_archived = true');
      
      if (item.present_at_all_locations === false) {
        const presentAtLocations = item.present_at_location_ids || [];
        const absentAtLocations = item.absent_at_location_ids || [];
        const locationId = process.env.SQUARE_LOCATION_ID;
        
        if (!presentAtLocations.includes(locationId)) {
          reasons.push(`Not present at location ${locationId}`);
        }
        if (absentAtLocations.includes(locationId)) {
          reasons.push(`Absent at location ${locationId}`);
        }
      }
      
      if (reasons.length > 0) {
        console.log(`      ❌ WOULD BE FILTERED OUT:`);
        reasons.forEach(reason => console.log(`         - ${reason}`));
      } else {
        console.log(`      ✅ SHOULD PASS ALL FILTERS`);
      }
    });
    
    console.log('\n📋 STEP 3: Test why items don\'t appear in list API');
    
    console.log('Testing different list API parameters...');
    
    const testParams = [
      'types=ITEM',
      'types=ITEM&include_deleted_objects=true',
      'types=ITEM&include_related_objects=true'
    ];
    
    for (const params of testParams) {
      try {
        console.log(`\nTesting: /v2/catalog/list?${params}`);
        const response = await makeSquareRequest(`/v2/catalog/list?${params}`);
        
        const items = response.objects || [];
        const patterItems = items.filter(item => 
          item.item_data?.name?.toLowerCase().includes('patter')
        );
        
        console.log(`   Total items: ${items.length}, Patter items: ${patterItems.length}`);
        
        if (patterItems.length > 0) {
          patterItems.forEach(item => {
            console.log(`   ✅ Found: "${item.item_data?.name}"`);
          });
        }
        
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error analyzing items:', error.message);
  }
}

analyzeItems().catch(console.error);