#!/usr/bin/env node

/**
 * Simple Instagram API Test - Just credential validation
 */

import { config } from 'dotenv';

// Load environment variables
config();

async function testInstagramCredentials() {
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const appId = process.env.INSTAGRAM_APP_ID;
  
  console.log('🔍 Testing Instagram Graph API credentials...');
  console.log(`Access Token: ${accessToken ? `${accessToken.slice(0, 20)}...` : 'NOT SET'}`);
  console.log(`App ID: ${appId || 'NOT SET'}`);
  console.log('');

  if (!accessToken) {
    console.error('❌ INSTAGRAM_ACCESS_TOKEN not set');
    console.log('Please set this environment variable with your Instagram Graph API access token');
    return false;
  }

  if (!appId) {
    console.error('❌ INSTAGRAM_APP_ID not set');
    console.log('Please set this environment variable with your Instagram App ID');
    return false;
  }

  try {
    console.log('🔄 Validating credentials with Instagram Graph API...');
    
    const response = await fetch(
      `https://graph.instagram.com/me?fields=id,username,account_type&access_token=${accessToken}`
    );

    const result = await response.json();
    
    if (response.ok && result.id) {
      console.log('✅ Credentials are VALID!');
      console.log(`   Instagram User: @${result.username}`);
      console.log(`   Account ID: ${result.id}`);
      console.log(`   Account Type: ${result.account_type}`);
      
      if (result.account_type === 'BUSINESS' || result.account_type === 'CREATOR') {
        console.log('   ✅ Account type supports content publishing');
      } else {
        console.log('   ⚠️  Personal accounts may have limited API access');
      }
      
      return true;
    } else {
      console.error('❌ Invalid credentials');
      console.error('Response:', result);
      
      if (result.error) {
        console.log('\nError details:');
        console.log(`   Code: ${result.error.code}`);
        console.log(`   Message: ${result.error.message}`);
        console.log(`   Type: ${result.error.type}`);
        
        if (result.error.code === 190) {
          console.log('\n💡 This usually means:');
          console.log('   - Token is expired');
          console.log('   - Token is invalid');
          console.log('   - Wrong token format');
        }
      }
      
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error testing credentials:', error.message);
    return false;
  }
}

// Run the test
testInstagramCredentials()
  .then(success => {
    if (success) {
      console.log('\n🎉 Ready to create Instagram posts!');
      console.log('You can now run: node scripts/test-instagram.js');
    } else {
      console.log('\n❌ Fix the credentials and try again');
    }
  })
  .catch(console.error);