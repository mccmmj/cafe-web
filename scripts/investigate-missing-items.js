#!/usr/bin/env node

/**
 * READ-ONLY investigation of missing Patter Bar items (LIVE PRODUCTION)
 * Correct names: "Patter Bar Blueberry Lemon" and "Patter Bar Chocolate Banana"
 */

require('dotenv').config({ path: '.env.local' });
const https = require('https');

const SQUARE_BASE_URL = 'https://connect.squareup.com';
const SQUARE_VERSION = '2024-12-18';
const LOCATION_ID = process.env.SQUARE_LOCATION_ID;

console.log('🔍 INVESTIGATING MISSING PATTER BAR ITEMS (READ-ONLY)');
console.log('Target items: "Patter Bar Blueberry Lemon" and "Patter Bar Chocolate Banana"');
console.log(`Location ID: ${LOCATION_ID}`);
console.log('='.repeat(70));

function makeSquareRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'connect.squareup.com',
      path: path,
      method: 'GET',
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

async function investigateMissingItems() {
  try {
    console.log('\n📋 STEP 1: Search for Patter Bar items in Square catalog');
    
    const listResponse = await makeSquareRequest('/v2/catalog/list?types=ITEM');
    const allItems = listResponse.objects || [];
    
    // Look for the specific missing items (correct names)
    const targetItems = [
      'Patter Bar Blueberry Lemon',
      'Patter Bar Chocolate Banana'
    ];
    
    // Search for items containing "patter"
    const patterBarItems = allItems.filter(item => {
      const name = item.item_data?.name || '';
      return name.toLowerCase().includes('patter');
    });
    
    console.log(`Found ${patterBarItems.length} items containing "patter" in Square catalog`);
    
    if (patterBarItems.length === 0) {
      console.log('❌ NO PATTER BAR ITEMS FOUND');
      
      // Search for items containing "bar"
      const barItems = allItems.filter(item => 
        item.item_data?.name?.toLowerCase().includes('bar')
      );
      
      console.log(`\n🔍 Found ${barItems.length} items containing "bar":`);
      barItems.slice(0, 10).forEach(item => {
        console.log(`   - "${item.item_data?.name}"`);
      });
      
      return;
    }
    
    console.log('\n🔍 DETAILED ANALYSIS OF PATTER BAR ITEMS:');
    
    patterBarItems.forEach((item, index) => {
      const itemData = item.item_data;
      const name = itemData?.name;
      const isTargetItem = targetItems.includes(name);
      
      console.log(`\n${index + 1}. "${name}" (ID: ${item.id}) ${isTargetItem ? '🎯 TARGET ITEM' : ''}`);
      
      console.log(`   📊 Status Fields:`);
      console.log(`      item.is_deleted: ${item.is_deleted}`);
      console.log(`      item_data.is_deleted: ${itemData?.is_deleted}`);
      console.log(`      item_data.is_archived: ${itemData?.is_archived}`);
      
      console.log(`   📍 Location Availability:`);
      console.log(`      present_at_all_locations: ${item.present_at_all_locations}`);
      console.log(`      present_at_location_ids: ${JSON.stringify(item.present_at_location_ids)}`);
      console.log(`      absent_at_location_ids: ${JSON.stringify(item.absent_at_location_ids)}`);
      
      console.log(`   📂 Category Information:`);
      console.log(`      categories: ${JSON.stringify(itemData?.categories)}`);
      
      // Apply our current filtering logic
      console.log(`   🧪 FILTERING TEST:`);
      
      let wouldBeFiltered = false;
      let filterReason = '';
      
      // Test 1: Deleted/archived check
      if (item.is_deleted || itemData?.is_deleted || itemData?.is_archived) {
        wouldBeFiltered = true;
        filterReason = `${item.is_deleted ? 'item.is_deleted' : ''}${itemData?.is_deleted ? ' item_data.is_deleted' : ''}${itemData?.is_archived ? ' item_data.is_archived' : ''}`;
      }
      
      // Test 2: Location availability check
      if (!wouldBeFiltered && item.present_at_all_locations === false) {
        const presentAtLocations = item.present_at_location_ids || [];
        const absentAtLocations = item.absent_at_location_ids || [];
        
        if (!presentAtLocations.includes(LOCATION_ID)) {
          wouldBeFiltered = true;
          filterReason = `Not present at location ${LOCATION_ID}`;
        } else if (absentAtLocations.includes(LOCATION_ID)) {
          wouldBeFiltered = true;
          filterReason = `Absent at location ${LOCATION_ID}`;
        }
      }
      
      if (wouldBeFiltered) {
        console.log(`      ❌ WOULD BE FILTERED OUT: ${filterReason}`);
      } else {
        console.log(`      ✅ SHOULD APPEAR ON MENU`);
      }
    });
    
    console.log('\n📋 STEP 2: Check Food/Snacks category');
    
    const categoriesResponse = await makeSquareRequest('/v2/catalog/list?types=CATEGORY');
    const categories = categoriesResponse.objects || [];
    
    const foodSnacksCategory = categories.find(cat => 
      cat.category_data?.name === 'Food / Snacks' ||
      cat.category_data?.name === 'Food/Snacks' ||
      cat.category_data?.name === 'Food / Snacks'
    );
    
    if (foodSnacksCategory) {
      console.log(`✅ Found Food/Snacks category: "${foodSnacksCategory.category_data?.name}" (ID: ${foodSnacksCategory.id})`);
      
      // Check if Patter Bar items are assigned to this category
      patterBarItems.forEach(item => {
        const categories = item.item_data?.categories || [];
        const isInFoodSnacks = categories.some(cat => cat.id === foodSnacksCategory.id);
        
        console.log(`   "${item.item_data?.name}": ${isInFoodSnacks ? '✅ IN Food/Snacks' : '❌ NOT in Food/Snacks'}`);
        if (!isInFoodSnacks && categories.length > 0) {
          console.log(`      Actually assigned to category IDs: ${categories.map(c => c.id).join(', ')}`);
        }
      });
    } else {
      console.log('❌ Food/Snacks category not found');
      console.log('Available categories:');
      categories.forEach(cat => {
        console.log(`   - "${cat.category_data?.name}" (ID: ${cat.id})`);
      });
    }
    
    console.log('\n💡 SUMMARY:');
    const targetItemsFound = patterBarItems.filter(item => 
      targetItems.includes(item.item_data?.name)
    );
    
    if (targetItemsFound.length === 0) {
      console.log('❌ Target items not found in Square catalog with exact names');
    } else {
      console.log(`✅ Found ${targetItemsFound.length} of 2 target items`);
      console.log('Check filtering test results above to see why they might not appear on menu');
    }
    
  } catch (error) {
    console.error('❌ Error investigating missing items:', error.message);
  }
}

investigateMissingItems().catch(console.error);