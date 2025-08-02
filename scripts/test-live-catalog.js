#!/usr/bin/env node

/**
 * Test script for Live Square Catalog API (READ-ONLY)
 * This script examines the LIVE environment catalog structure
 * Uses current .env.local settings (should be pointing to live/production)
 */

require('dotenv').config({ path: '.env.local' });
const { SquareClient, SquareEnvironment } = require('square');

// Create Square client directly in the script
const environment = process.env.SQUARE_ENVIRONMENT === 'production' 
  ? SquareEnvironment.Production 
  : SquareEnvironment.Sandbox;

const squareClient = new SquareClient({
  token: process.env.SQUARE_ACCESS_TOKEN,
  environment,
});

// Get the API instances
const catalogApi = squareClient.catalogApi;
const locationsApi = squareClient.locationsApi;

async function testLiveEnvironment() {
  console.log('🔍 Testing LIVE Square Environment Catalog (READ-ONLY)');
  console.log('Environment:', process.env.SQUARE_ENVIRONMENT || 'sandbox');
  console.log('Location ID:', process.env.SQUARE_LOCATION_ID);
  console.log('Application ID:', process.env.SQUARE_APPLICATION_ID?.substring(0, 10) + '...');
  console.log('='.repeat(60));

  try {
    // First, verify we can connect to the API
    console.log('\n🔌 TEST 1: API Connection Test');
    const locationsResponse = await locationsApi.listLocations();
    
    if (locationsResponse.result.locations) {
      console.log(`✅ Connected! Found ${locationsResponse.result.locations.length} location(s)`);
      locationsResponse.result.locations.forEach(location => {
        console.log(`   - ${location.name} (ID: ${location.id})`);
        console.log(`     Status: ${location.status}`);
        console.log(`     Type: ${location.type}`);
      });
    }

    // Test 2: List all catalog objects in LIVE
    console.log('\n📋 TEST 2: Live Catalog Objects');
    const catalogResponse = await catalogApi.listCatalog({
      types: ['ITEM', 'CATEGORY', 'ITEM_VARIATION']
    });
    
    if (catalogResponse.result.objects) {
      console.log(`Total objects in LIVE: ${catalogResponse.result.objects.length}`);
      
      // Group by type
      const byType = catalogResponse.result.objects.reduce((acc, obj) => {
        acc[obj.type] = (acc[obj.type] || 0) + 1;
        return acc;
      }, {});
      
      console.log('Objects by type in LIVE:', byType);
    } else {
      console.log('❌ No catalog objects found in LIVE environment');
    }

    // Test 3: Examine categories in LIVE
    console.log('\n📁 TEST 3: Live Categories Analysis');
    const categoriesResponse = await catalogApi.listCatalog({
      types: ['CATEGORY']
    });
    
    if (categoriesResponse.result.objects && categoriesResponse.result.objects.length > 0) {
      console.log(`✅ Categories found in LIVE: ${categoriesResponse.result.objects.length}`);
      categoriesResponse.result.objects.forEach(category => {
        console.log(`   📁 "${category.categoryData?.name || 'Unnamed'}" (ID: ${category.id})`);
        console.log(`      Created: ${category.createdAt || 'Unknown'}`);
        console.log(`      Updated: ${category.updatedAt || 'Unknown'}`);
      });
    } else {
      console.log('❌ NO CATEGORIES FOUND IN LIVE ENVIRONMENT');
      console.log('   This might explain why items appear as "Uncategorized"');
    }

    // Test 4: Examine items and their category assignments in LIVE
    console.log('\n🍽️ TEST 4: Live Items and Category Relationships');
    const itemsResponse = await catalogApi.listCatalog({
      types: ['ITEM']
    });
    
    if (itemsResponse.result.objects && itemsResponse.result.objects.length > 0) {
      console.log(`✅ Items found in LIVE: ${itemsResponse.result.objects.length}`);
      
      let itemsWithCategories = 0;
      let itemsWithoutCategories = 0;
      const categoryUsage = {};
      
      itemsResponse.result.objects.forEach((item, index) => {
        const itemData = item.itemData;
        const name = itemData?.name || `Unnamed Item ${index + 1}`;
        
        console.log(`\n   ${index + 1}. 📝 "${name}" (ID: ${item.id})`);
        
        // Check new categories field (Square API 2024)
        const categories = itemData?.categories || [];
        console.log(`      Categories field: ${JSON.stringify(categories)}`);
        
        // Check deprecated categoryId field
        const deprecatedCategoryId = itemData?.categoryId;
        if (deprecatedCategoryId) {
          console.log(`      Deprecated Category ID: ${deprecatedCategoryId}`);
        }
        
        if (categories.length > 0) {
          itemsWithCategories++;
          categories.forEach(cat => {
            const catName = cat.name || 'Unnamed Category';
            categoryUsage[catName] = (categoryUsage[catName] || 0) + 1;
          });
        } else if (deprecatedCategoryId) {
          itemsWithCategories++;
          categoryUsage['Via Deprecated ID'] = (categoryUsage['Via Deprecated ID'] || 0) + 1;
        } else {
          itemsWithoutCategories++;
          console.log(`      ❌ NO CATEGORY ASSIGNED`);
        }
        
        // Show variations
        console.log(`      Variations: ${itemData?.variations?.length || 0}`);
      });
      
      console.log('\n📊 LIVE Category Assignment Summary:');
      console.log(`   Items WITH categories: ${itemsWithCategories}`);
      console.log(`   Items WITHOUT categories: ${itemsWithoutCategories}`);
      
      if (Object.keys(categoryUsage).length > 0) {
        console.log('\n   Category usage:');
        Object.entries(categoryUsage).forEach(([catName, count]) => {
          console.log(`      "${catName}": ${count} items`);
        });
      }
      
    } else {
      console.log('❌ No items found in LIVE environment');
    }

    // Test 5: Test the exact search method our menu API uses
    console.log('\n🔍 TEST 5: Menu API Search Method (searchCatalogItems)');
    const searchResponse = await catalogApi.searchCatalogItems({
      enabledLocationIds: [process.env.SQUARE_LOCATION_ID],
      productTypes: ['REGULAR']
    });
    
    if (searchResponse.result.items && searchResponse.result.items.length > 0) {
      console.log(`✅ Search found: ${searchResponse.result.items.length} items`);
      
      searchResponse.result.items.forEach((item, index) => {
        const itemData = item.itemData;
        console.log(`\n   ${index + 1}. 🔍 "${itemData?.name || 'Unnamed'}"`);
        console.log(`      ID: ${item.id}`);
        console.log(`      Categories: ${JSON.stringify(itemData?.categories || [])}`);
        console.log(`      Category ID (deprecated): ${itemData?.categoryId || 'None'}`);
        
        // This is key: if categories is empty, our menu API creates "Uncategorized"
        if (!itemData?.categories || itemData.categories.length === 0) {
          console.log(`      ❌ This item will be placed in "Uncategorized" by our menu API`);
        }
      });
    } else {
      console.log('❌ Search returned no items');
    }

  } catch (error) {
    console.error('❌ Error testing LIVE catalog:', error.message);
    
    if (error.result) {
      console.error('\n🔍 Square API Error Details:');
      console.error(JSON.stringify(error.result, null, 2));
    }
    
    if (error.statusCode) {
      console.error(`HTTP Status: ${error.statusCode}`);
    }
  }
}

// Run the test
console.log('Starting LIVE environment analysis...');
testLiveEnvironment().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});