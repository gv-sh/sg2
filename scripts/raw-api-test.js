#!/usr/bin/env node

/**
 * Raw API Response Test - Show exact responses
 */

import { config } from 'dotenv';

config();

async function getRawResponses() {
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const appId = process.env.INSTAGRAM_APP_ID;
  
  console.log('=== RAW API RESPONSES ===\n');
  
  const tests = [
    {
      name: 'Facebook Graph API - Me',
      url: `https://graph.facebook.com/v18.0/me?access_token=${accessToken}`
    },
    {
      name: 'Facebook Graph API - Me (detailed)',
      url: `https://graph.facebook.com/v18.0/me?fields=id,name,email&access_token=${accessToken}`
    },
    {
      name: 'Token Debug',
      url: `https://graph.facebook.com/debug_token?input_token=${accessToken}&access_token=${accessToken}`
    },
    {
      name: 'User Accounts/Pages',
      url: `https://graph.facebook.com/v18.0/me/accounts?access_token=${accessToken}`
    },
    {
      name: 'Instagram Graph API - Me',
      url: `https://graph.instagram.com/me?fields=id,username&access_token=${accessToken}`
    },
    {
      name: 'Instagram Graph API - Me (detailed)',
      url: `https://graph.instagram.com/me?fields=id,username,account_type,media_count&access_token=${accessToken}`
    }
  ];

  for (const test of tests) {
    console.log(`\n📡 ${test.name}`);
    console.log(`🔗 URL: ${test.url.replace(accessToken, 'ACCESS_TOKEN')}`);
    console.log('📄 Response:');
    console.log('─'.repeat(80));
    
    try {
      const response = await fetch(test.url);
      const responseText = await response.text();
      
      console.log(`Status: ${response.status} ${response.statusText}`);
      console.log('Headers:', Object.fromEntries(response.headers.entries()));
      console.log('Body:', responseText);
      
    } catch (error) {
      console.log('❌ ERROR:', error.message);
    }
    
    console.log('─'.repeat(80));
  }

  // Try to create a simple media container (will fail but show exact error)
  console.log(`\n📡 Instagram Media Creation Test`);
  console.log('─'.repeat(80));
  
  try {
    const mediaUrl = `https://graph.facebook.com/v18.0/${appId}/media`;
    console.log(`🔗 URL: ${mediaUrl}`);
    
    const response = await fetch(mediaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url: 'https://picsum.photos/1080/1080',
        caption: 'Test post',
        access_token: accessToken,
      }),
    });
    
    const responseText = await response.text();
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));
    console.log('Body:', responseText);
    
  } catch (error) {
    console.log('❌ ERROR:', error.message);
  }
  
  console.log('─'.repeat(80));
}

getRawResponses().catch(console.error);