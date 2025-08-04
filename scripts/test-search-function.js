#!/usr/bin/env node

/**
 * Test the new searchAllCatalogItems function
 */

require('dotenv').config({ path: '.env.local' });
const https = require('https');

const SQUARE_BASE_URL = 'https://connect.squareup.com';
const SQUARE_VERSION = '2024-12-18';

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

async function testSearchFunction() {
  try {
    console.log('🔍 Testing searchAllCatalogItems function');
    
    const response = await makeSquareRequest('/v2/catalog/search', 'POST', {
      object_types: ['ITEM'],
      query: {
        filter: {
          text_filter: {
            all: []
          }
        }
      }
    });
    
    if (response.errors) {
      console.log('❌ API returned errors:', JSON.stringify(response.errors, null, 2));
      return;
    }
    
    if (!response.objects) {
      console.log('❌ No objects returned');
      console.log('Full response:', JSON.stringify(response, null, 2));
      return;
    }
    
    console.log(`✅ Success! Found ${response.objects.length} items`);
    
    // Check for Patter Bar items
    const patterItems = response.objects.filter(item => 
      item.item_data?.name?.toLowerCase().includes('patter')
    );
    
    console.log(`🎯 Patter Bar items found: ${patterItems.length}`);
    patterItems.forEach(item => {
      console.log(`   - ${item.item_data?.name} (ID: ${item.id})`);
    });
    
  } catch (error) {
    console.error('❌ Error testing search function:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

testSearchFunction().catch(console.error);