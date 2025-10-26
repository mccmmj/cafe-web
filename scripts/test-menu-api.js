#!/usr/bin/env node

/**
 * Test script to examine what our menu API returns (READ-ONLY)
 * This mimics exactly what the frontend receives
 */

const fetch = require('node-fetch');

async function testMenuApi() {
  console.log('🍽️ Testing Menu API Response (READ-ONLY)');
  console.log('='.repeat(50));

  try {
    console.log('📡 Fetching from /api/menu...');
    const response = await fetch('http://localhost:3000/api/menu');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const menuData = await response.json();
    
    console.log('\n📊 Menu API Response Summary:');
    console.log(`Categories: ${menuData.categories?.length || 0}`);
    console.log(`Total Items: ${menuData.totalItems || 0}`);
    console.log(`Last Updated: ${menuData.lastUpdated || 'Unknown'}`);
    
    if (menuData.categories) {
      console.log('\n📁 Categories Breakdown:');
      menuData.categories.forEach((category, index) => {
        console.log(`\n${index + 1}. Category: "${category.name}"`);
        console.log(`   ID: ${category.id}`);
        console.log(`   Items: ${category.items?.length || 0}`);
        
        if (category.items && category.items.length > 0) {
          console.log('   📝 Items in this category:');
          category.items.forEach((item, itemIndex) => {
            console.log(`      ${itemIndex + 1}. ${item.name}`);
            console.log(`         ID: ${item.id}`);
            console.log(`         Price: $${item.price?.toFixed(2) || 'N/A'}`);
            console.log(`         Variations: ${item.variations?.length || 0}`);
            
            if (item.variations && item.variations.length > 0) {
              console.log('         🔧 Variations:');
              item.variations.forEach((variation, varIndex) => {
                console.log(`            ${varIndex + 1}. ${variation.name} - $${variation.price?.toFixed(2) || 'N/A'}`);
              });
            }
          });
        }
      });
    }
    
    // Check for the "Uncategorized" issue
    console.log('\n🔍 Checking for "Uncategorized" Items:');
    const uncategorizedCategory = menuData.categories?.find(cat => 
      cat.name === 'Other Items' || cat.id === 'Uncategorized'
    );
    
    if (uncategorizedCategory) {
      console.log('❌ Found "Other Items" category with Uncategorized ID');
      console.log(`   Items in uncategorized: ${uncategorizedCategory.items?.length || 0}`);
      
      if (uncategorizedCategory.items) {
        console.log('   📝 Uncategorized items:');
        uncategorizedCategory.items.forEach(item => {
          console.log(`      - ${item.name} (ID: ${item.id})`);
        });
      }
    } else {
      console.log('✅ No "Other Items" category found');
    }
    
  } catch (error) {
    console.error('❌ Error testing menu API:', error.message);
  }
}

// Also test the Square config endpoint
async function testSquareConfig() {
  console.log('\n⚙️ Testing Square Config API (READ-ONLY)');
  console.log('='.repeat(50));

  try {
    const response = await fetch('http://localhost:3000/api/square/config');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const config = await response.json();
    console.log('📋 Square Configuration:');
    console.log(`   Application ID: ${config.applicationId || 'Not set'}`);
    console.log(`   Location ID: ${config.locationId || 'Not set'}`);
    console.log(`   Environment: ${config.environment || 'Not set'}`);
    
  } catch (error) {
    console.error('❌ Error testing Square config:', error.message);
  }
}

// Run both tests
async function runAllTests() {
  await testMenuApi();
  await testSquareConfig();
}

runAllTests().catch(console.error);