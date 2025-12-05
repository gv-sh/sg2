#!/usr/bin/env node

/**
 * Instagram Pages Test - Get Instagram account via Pages
 */

import { config } from 'dotenv';

config();

async function testInstagramViaPages() {
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const appId = process.env.INSTAGRAM_APP_ID;
  
  console.log('📄 Testing Instagram via Facebook Pages API...');
  console.log('================================================');
  
  try {
    // Step 1: Get user's Facebook pages
    console.log('🔍 Step 1: Getting Facebook Pages...');
    const pagesResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?access_token=${accessToken}`
    );
    
    if (!pagesResponse.ok) {
      const error = await pagesResponse.json();
      console.error('❌ Failed to get pages:', error);
      return;
    }
    
    const pagesResult = await pagesResponse.json();
    console.log(`✅ Found ${pagesResult.data.length} Facebook pages`);
    
    for (const page of pagesResult.data) {
      console.log(`   📄 Page: ${page.name} (ID: ${page.id})`);
    }
    console.log('');
    
    // Step 2: For each page, check if it has an Instagram account
    console.log('🔍 Step 2: Checking for connected Instagram accounts...');
    
    for (const page of pagesResult.data) {
      console.log(`📄 Checking page: ${page.name}`);
      
      try {
        const instagramResponse = await fetch(
          `https://graph.facebook.com/v18.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`
        );
        
        if (instagramResponse.ok) {
          const instagramResult = await instagramResponse.json();
          
          if (instagramResult.instagram_business_account) {
            const igAccountId = instagramResult.instagram_business_account.id;
            console.log(`   ✅ Instagram Business Account found: ${igAccountId}`);
            
            // Step 3: Test Instagram Graph API with this account
            console.log(`   🔄 Testing Instagram Graph API with account ${igAccountId}...`);
            
            const igInfoResponse = await fetch(
              `https://graph.facebook.com/v18.0/${igAccountId}?fields=id,username,account_type&access_token=${page.access_token}`
            );
            
            if (igInfoResponse.ok) {
              const igInfo = await igInfoResponse.json();
              console.log(`   ✅ Instagram API Success!`);
              console.log(`      Username: @${igInfo.username}`);
              console.log(`      Account Type: ${igInfo.account_type}`);
              console.log(`      ID: ${igInfo.id}`);
              
              // Try creating a test post
              await createTestPost(igAccountId, page.access_token);
              
            } else {
              const igError = await igInfoResponse.json();
              console.log(`   ❌ Instagram API failed:`, igError);
            }
          } else {
            console.log(`   ❌ No Instagram Business Account connected`);
          }
        } else {
          console.log(`   ❌ Cannot access page Instagram data`);
        }
      } catch (error) {
        console.log(`   ❌ Error checking page: ${error.message}`);
      }
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function createTestPost(igAccountId, pageAccessToken) {
  console.log('📝 Step 3: Creating test Instagram post...');
  
  const testImageUrl = 'https://picsum.photos/1080/1080?random=' + Math.floor(Math.random() * 1000);
  const testCaption = `🤖 Test post from Instagram Graph API\n\nGenerated on ${new Date().toLocaleString()}\n\n#test #api #automation`;

  try {
    // Create media container
    console.log('   📷 Creating media container...');
    const mediaResponse = await fetch(
      `https://graph.facebook.com/v18.0/${igAccountId}/media`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_url: testImageUrl,
          caption: testCaption,
          access_token: pageAccessToken,
        }),
      }
    );

    if (!mediaResponse.ok) {
      const error = await mediaResponse.json();
      console.log(`   ❌ Media creation failed:`, error);
      return;
    }

    const mediaResult = await mediaResponse.json();
    console.log(`   ✅ Media container created: ${mediaResult.id}`);

    // Publish the post
    console.log('   📤 Publishing post...');
    const publishResponse = await fetch(
      `https://graph.facebook.com/v18.0/${igAccountId}/media_publish`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          creation_id: mediaResult.id,
          access_token: pageAccessToken,
        }),
      }
    );

    if (!publishResponse.ok) {
      const error = await publishResponse.json();
      console.log(`   ❌ Publishing failed:`, error);
      return;
    }

    const publishResult = await publishResponse.json();
    console.log('   🎉 POST SUCCESSFULLY CREATED!');
    console.log(`   📱 Post ID: ${publishResult.id}`);
    console.log(`   🔗 URL: https://instagram.com/p/${publishResult.id}`);
    
  } catch (error) {
    console.log(`   ❌ Error creating post: ${error.message}`);
  }
}

testInstagramViaPages().catch(console.error);