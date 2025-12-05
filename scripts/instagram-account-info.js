#!/usr/bin/env node

/**
 * Instagram Account Info - Comprehensive account analysis
 */

import { config } from 'dotenv';

config();

async function analyzeAccount() {
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  
  console.log('🔍 Instagram Account Analysis');
  console.log('=============================');
  
  try {
    // Test 1: Facebook Graph API - User info
    console.log('👤 User Information:');
    const userResponse = await fetch(
      `https://graph.facebook.com/v18.0/me?fields=id,name,email&access_token=${accessToken}`
    );
    
    if (userResponse.ok) {
      const user = await userResponse.json();
      console.log(`   ✅ Name: ${user.name}`);
      console.log(`   ✅ User ID: ${user.id}`);
      console.log(`   ✅ Email: ${user.email || 'Not available'}`);
    } else {
      const error = await userResponse.json();
      console.log(`   ❌ User info error:`, error);
    }
    console.log('');
    
    // Test 2: Check token permissions
    console.log('🔑 Token Permissions:');
    const debugResponse = await fetch(
      `https://graph.facebook.com/debug_token?input_token=${accessToken}&access_token=${accessToken}`
    );
    
    if (debugResponse.ok) {
      const debug = await debugResponse.json();
      console.log(`   ✅ App: ${debug.data.application}`);
      console.log(`   ✅ Expires: ${new Date(debug.data.expires_at * 1000).toLocaleString()}`);
      console.log(`   ✅ Permissions:`);
      debug.data.scopes.forEach(scope => {
        console.log(`      - ${scope}`);
      });
    }
    console.log('');
    
    // Test 3: Facebook Pages
    console.log('📄 Facebook Pages:');
    const pagesResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${accessToken}`
    );
    
    if (pagesResponse.ok) {
      const pages = await pagesResponse.json();
      if (pages.data.length === 0) {
        console.log('   ❌ NO FACEBOOK PAGES FOUND');
        console.log('   💡 You need to create a Facebook Page first!');
        console.log('   🔗 Create one at: https://www.facebook.com/pages/create');
      } else {
        pages.data.forEach(page => {
          console.log(`   📄 ${page.name} (${page.id})`);
          if (page.instagram_business_account) {
            console.log(`      ✅ Instagram connected: ${page.instagram_business_account.id}`);
          } else {
            console.log(`      ❌ No Instagram connected`);
          }
        });
      }
    }
    console.log('');
    
    // Test 4: Try Instagram Basic Display API
    console.log('📷 Instagram Basic Display API:');
    try {
      const igBasicResponse = await fetch(
        `https://graph.instagram.com/me?fields=id,username&access_token=${accessToken}`
      );
      
      if (igBasicResponse.ok) {
        const igBasic = await igBasicResponse.json();
        console.log(`   ✅ Instagram User: @${igBasic.username}`);
        console.log(`   ✅ Instagram ID: ${igBasic.id}`);
        console.log('   ⚠️  This is a PERSONAL Instagram account');
        console.log('   💡 Personal accounts cannot publish content via API');
      } else {
        const error = await igBasicResponse.json();
        console.log(`   ❌ Instagram Basic error:`, error.error.message);
      }
    } catch (error) {
      console.log(`   ❌ Instagram Basic failed: ${error.message}`);
    }
    console.log('');
    
    // Summary and next steps
    console.log('📋 SUMMARY & NEXT STEPS:');
    console.log('=========================');
    console.log('Your token is valid for Facebook Graph API but you need:');
    console.log('');
    console.log('1️⃣  CREATE A FACEBOOK PAGE');
    console.log('   🔗 https://www.facebook.com/pages/create');
    console.log('');
    console.log('2️⃣  CONVERT INSTAGRAM TO BUSINESS/CREATOR');
    console.log('   📱 Instagram App > Settings > Account > Switch to Professional Account');
    console.log('');
    console.log('3️⃣  CONNECT INSTAGRAM TO FACEBOOK PAGE');
    console.log('   📱 Instagram App > Settings > Business > Facebook Page');
    console.log('');
    console.log('4️⃣  GET NEW ACCESS TOKEN WITH PAGE ACCESS');
    console.log('   🔗 Use Graph API Explorer with pages_show_list permission');
    console.log('');
    console.log('Once you have these setup, the Instagram Content Publishing API will work!');
    
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
  }
}

analyzeAccount().catch(console.error);