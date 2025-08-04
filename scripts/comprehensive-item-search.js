#!/usr/bin/env node

/**
 * Comprehensive search for Patter Bar items (READ-ONLY)
 * Items confirmed to exist in Dashboard but not found by API
 */

require('dotenv').config({ path: '.env.local' });
const https = require('https');

const SQUARE_BASE_URL = 'https://connect.squareup.com';
const SQUARE_VERSION = '2024-12-18';

console.log('🔍 COMPREHENSIVE SEARCH FOR PATTER BAR ITEMS (READ-ONLY)');
console.log('Items confirmed in Dashboard:');
console.log('- Patter Bar Blueberry Lemon (Food / Snacks, $5.45)');
console.log('- Patter Bar Chocolate Banana (Food / Snacks, $5.45)');
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

async function comprehensiveSearch() {
  try {
    console.log('\n📋 STEP 1: Get ALL items and search patterns');
    
    const listResponse = await makeSquareRequest('/v2/catalog/list?types=ITEM');
    const allItems = listResponse.objects || [];
    
    console.log(`Total items in catalog: ${allItems.length}`);
    
    // Search patterns to find the items
    const searchPatterns = [
      { name: 'Exact "Patter Bar Blueberry Lemon"', test: (name) => name === 'Patter Bar Blueberry Lemon' },
      { name: 'Exact "Patter Bar Chocolate Banana"', test: (name) => name === 'Patter Bar Chocolate Banana' },
      { name: 'Contains "Patter"', test: (name) => name.toLowerCase().includes('patter') },
      { name: 'Contains "Blueberry"', test: (name) => name.toLowerCase().includes('blueberry') },
      { name: 'Contains "Chocolate Banana"', test: (name) => name.toLowerCase().includes('chocolate') && name.toLowerCase().includes('banana') },
      { name: 'Price $5.45', test: (name, item) => {
        const variation = item.item_data?.variations?.[0];
        const price = (variation?.item_variation_data?.price_money?.amount || 0) / 100;
        return price === 5.45;
      }}
    ];
    
    searchPatterns.forEach(pattern => {
      console.log(`\n🔍 ${pattern.name}:`);
      
      const matches = allItems.filter(item => {
        const name = item.item_data?.name || '';
        return pattern.test(name, item);
      });
      
      if (matches.length === 0) {
        console.log('   ❌ No matches found');
      } else {
        console.log(`   ✅ Found ${matches.length} matches:`);
        matches.forEach(item => {
          const name = item.item_data?.name;
          const price = (item.item_data?.variations?.[0]?.item_variation_data?.price_money?.amount || 0) / 100;
          console.log(`      - "${name}" (ID: ${item.id}) - $${price}`);
          console.log(`        is_archived: ${item.item_data?.is_archived}`);
          console.log(`        is_deleted: ${item.is_deleted || item.item_data?.is_deleted}`);
        });
      }
    });
    
    console.log('\n📋 STEP 2: Check items with similar prices ($5.45)');
    
    const priceMatches = allItems.filter(item => {
      const variation = item.item_data?.variations?.[0];
      const price = (variation?.item_variation_data?.price_money?.amount || 0) / 100;
      return price === 5.45;
    });
    
    console.log(`Items priced at $5.45: ${priceMatches.length}`);
    priceMatches.forEach(item => {
      console.log(`   - "${item.item_data?.name}" (ID: ${item.id})`);
    });
    
    console.log('\n📋 STEP 3: Check Food/Snacks category items');
    
    // Get categories first
    const categoriesResponse = await makeSquareRequest('/v2/catalog/list?types=CATEGORY');
    const categories = categoriesResponse.objects || [];
    
    const foodSnacksCategory = categories.find(cat => 
      cat.category_data?.name === 'Food / Snacks'
    );
    
    if (foodSnacksCategory) {
      console.log(`✅ Found Food/Snacks category (ID: ${foodSnacksCategory.id})`);
      
      const foodSnacksItems = allItems.filter(item => {
        const itemCategories = item.item_data?.categories || [];
        return itemCategories.some(cat => cat.id === foodSnacksCategory.id);
      });
      
      console.log(`Items in Food/Snacks category: ${foodSnacksItems.length}`);
      
      // Look for Patter Bar items in this category
      const patterInFoodSnacks = foodSnacksItems.filter(item => 
        item.item_data?.name?.toLowerCase().includes('patter')
      );
      
      if (patterInFoodSnacks.length > 0) {
        console.log('✅ Found Patter items in Food/Snacks:');
        patterInFoodSnacks.forEach(item => {
          console.log(`   - "${item.item_data?.name}"`);
        });
      } else {
        console.log('❌ No Patter items found in Food/Snacks category');
        console.log('\nAll Food/Snacks items:');
        foodSnacksItems.slice(0, 10).forEach(item => {
          console.log(`   - "${item.item_data?.name}"`);
        });
      }
    }
    
    console.log('\n📋 STEP 4: Check if items are in a different API version or location');
    
    // Test different Square API calls
    try {
      console.log('Testing catalog search with different parameters...');
      
      const searchBody = {
        object_types: ['ITEM'],
        query: {
          exact_query: {
            attribute_name: 'name',
            attribute_value: 'Patter Bar Blueberry Lemon'
          }
        }
      };
      
      const searchResponse = await fetch(`${SQUARE_BASE_URL}/v2/catalog/search`, {
        method: 'POST',
        headers: {
          'Square-Version': SQUARE_VERSION,
          'Authorization': `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(searchBody)
      });
      
      const searchResult = await searchResponse.json();
      
      if (searchResult.objects && searchResult.objects.length > 0) {
        console.log('✅ Found via catalog search:');
        searchResult.objects.forEach(item => {
          console.log(`   - "${item.item_data?.name}" (ID: ${item.id})`);
        });
      } else {
        console.log('❌ Catalog search also returned no results');
      }
      
    } catch (error) {
      console.log(`❌ Catalog search error: ${error.message}`);
    }
    
    console.log('\n💡 ANALYSIS:');
    console.log('If items exist in Dashboard but not found via API:');
    console.log('1. Items might be in a draft/pending state');
    console.log('2. API permissions might not include these items');
    console.log('3. Items might be location-restricted in a way not visible to API');
    console.log('4. There could be a sync delay between Dashboard and API');
    
    console.log('\n🔧 RECOMMENDATIONS:');
    console.log('1. Check if items are "Published" in Square Dashboard');
    console.log('2. Verify items are not in draft mode');
    console.log('3. Check location assignment in Dashboard');
    console.log('4. Try refreshing/republishing items in Dashboard');
    
  } catch (error) {
    console.error('❌ Error in comprehensive search:', error.message);
  }
}

comprehensiveSearch().catch(console.error);