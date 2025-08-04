#!/usr/bin/env node

/**
 * READ-ONLY check for is_archived field in Danish items
 */

require('dotenv').config({ path: '.env.local' });
const https = require('https');

function makeSquareRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'connect.squareup.com',
      path: path,
      method: 'GET',
      headers: {
        'Square-Version': '2024-12-18',
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
    req.end();
  });
}

async function checkArchivedField() {
  try {
    const listResponse = await makeSquareRequest('/v2/catalog/list?types=ITEM');
    const danishItems = listResponse.objects.filter(item => 
      item.item_data?.name?.toLowerCase().includes('danish')
    );
    
    console.log('🔍 CHECKING is_archived FIELD:');
    
    danishItems.forEach(item => {
      console.log(`\n"${item.item_data?.name}"`);
      console.log(`  is_archived: ${item.item_data?.is_archived}`);
      console.log(`  ecom_available: ${item.item_data?.ecom_available}`);
      console.log(`  ecom_visibility: ${item.item_data?.ecom_visibility}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkArchivedField();