#!/usr/bin/env node

/**
 * Debug Instagram Token - More detailed analysis
 */

import { config } from 'dotenv';

// Load environment variables
config();

async function debugToken() {
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const appId = process.env.INSTAGRAM_APP_ID;
  
  console.log('🔧 Instagram Token Debug Analysis');
  console.log('================================');
  console.log(`Full Access Token: ${accessToken || 'NOT SET'}`);
  console.log(`App ID: ${appId || 'NOT SET'}`);
  console.log(`Token Length: ${accessToken ? accessToken.length : 0} characters`);
  console.log(`Token starts with: ${accessToken ? accessToken.substring(0, 10) : 'N/A'}`);
  console.log('');

  if (!accessToken) {
    console.log('❌ No access token found in environment variables');
    console.log('Please set INSTAGRAM_ACCESS_TOKEN');
    return;
  }

  // Test different API endpoints
  const endpoints = [
    {
      name: 'Instagram Graph API - Me',
      url: `https://graph.instagram.com/me?fields=id,username&access_token=${accessToken}`
    },
    {
      name: 'Facebook Graph API - Me',
      url: `https://graph.facebook.com/me?access_token=${accessToken}`
    },
    {
      name: 'Token Debug',
      url: `https://graph.facebook.com/debug_token?input_token=${accessToken}&access_token=${accessToken}`
    }
  ];

  for (const endpoint of endpoints) {
    console.log(`🔍 Testing: ${endpoint.name}`);
    try {
      const response = await fetch(endpoint.url);
      const result = await response.json();
      
      console.log(`   Status: ${response.status}`);
      if (response.ok) {
        console.log('   ✅ Success:', JSON.stringify(result, null, 2));
      } else {
        console.log('   ❌ Error:', JSON.stringify(result, null, 2));
      }
    } catch (error) {
      console.log(`   ❌ Network Error: ${error.message}`);
    }
    console.log('');
  }

  // Try to get a new short-lived token (this would need app secret)
  console.log('💡 To get a new token, visit:');
  console.log(`   https://developers.facebook.com/tools/explorer/?method=GET&path=me&version=v18.0&app_id=${appId}`);
  console.log('');
  console.log('📝 Or use the Graph API Explorer:');
  console.log('   1. Go to https://developers.facebook.com/tools/explorer/');
  console.log('   2. Select your app');
  console.log('   3. Get User Access Token');
  console.log('   4. Add instagram_basic permission');
  console.log('   5. Generate Access Token');
}

debugToken().catch(console.error);