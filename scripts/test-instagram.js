#!/usr/bin/env node

/**
 * Instagram API Test Script
 * Tests the Instagram Graph API integration with provided credentials
 */

import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class InstagramTest {
  constructor() {
    this.accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
    this.appId = process.env.INSTAGRAM_APP_ID;
    
    console.log('📸 Instagram API Test Script');
    console.log('============================');
    console.log(`Access Token: ${this.accessToken ? `${this.accessToken.slice(0, 20)}...` : 'NOT SET'}`);
    console.log(`App ID: ${this.appId || 'NOT SET'}`);
    console.log('');
  }

  async validateCredentials() {
    console.log('🔍 Step 1: Validating credentials...');
    
    if (!this.accessToken) {
      console.error('❌ INSTAGRAM_ACCESS_TOKEN environment variable is not set');
      return false;
    }

    if (!this.appId) {
      console.error('❌ INSTAGRAM_APP_ID environment variable is not set');
      return false;
    }

    try {
      const response = await fetch(
        `https://graph.instagram.com/me?fields=id,username,account_type&access_token=${this.accessToken}`
      );

      const result = await response.json();
      
      if (response.ok && result.id) {
        console.log('✅ Credentials are valid!');
        console.log(`   User: @${result.username}`);
        console.log(`   ID: ${result.id}`);
        console.log(`   Account Type: ${result.account_type}`);
        console.log('');
        return true;
      } else {
        console.error('❌ Invalid credentials:');
        console.error('   ', result);
        return false;
      }
    } catch (error) {
      console.error('❌ Error validating credentials:', error.message);
      return false;
    }
  }

  async createTestPost() {
    console.log('📝 Step 2: Creating test Instagram post...');
    
    // Test image URL (you can replace this with your own)
    const testImageUrl = 'https://picsum.photos/1080/1080?random=1';
    const testCaption = `🤖 Test post from Instagram Graph API integration\n\nGenerated on ${new Date().toLocaleString()}\n\n#test #automation #api`;

    try {
      console.log('   Creating media container...');
      
      // Step 1: Create media container
      const mediaResponse = await fetch(
        `https://graph.facebook.com/v18.0/${this.appId}/media`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            image_url: testImageUrl,
            caption: testCaption,
            access_token: this.accessToken,
          }),
        }
      );

      if (!mediaResponse.ok) {
        const error = await mediaResponse.json();
        throw new Error(`Failed to create media container: ${error.error?.message || mediaResponse.statusText}`);
      }

      const mediaResult = await mediaResponse.json();
      console.log('✅ Media container created:', mediaResult.id);

      // Step 2: Publish the post
      console.log('   Publishing post...');
      
      const publishResponse = await fetch(
        `https://graph.facebook.com/v18.0/${this.appId}/media_publish`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            creation_id: mediaResult.id,
            access_token: this.accessToken,
          }),
        }
      );

      if (!publishResponse.ok) {
        const error = await publishResponse.json();
        throw new Error(`Failed to publish post: ${error.error?.message || publishResponse.statusText}`);
      }

      const publishResult = await publishResponse.json();
      console.log('✅ Post published successfully!');
      console.log(`   Post ID: ${publishResult.id}`);
      console.log(`   URL: https://instagram.com/p/${publishResult.id}`);
      console.log('');
      
      return publishResult.id;
      
    } catch (error) {
      console.error('❌ Failed to create test post:', error.message);
      return null;
    }
  }

  async createCarouselTest() {
    console.log('🎠 Step 3: Creating test carousel post...');
    
    const testImages = [
      'https://picsum.photos/1080/1080?random=2',
      'https://picsum.photos/1080/1080?random=3'
    ];
    const carouselCaption = `🎠 Test carousel from Instagram Graph API\n\nMultiple images test - ${new Date().toLocaleString()}\n\n#carousel #test #api`;

    try {
      console.log('   Creating media containers for carousel...');
      
      // Step 1: Create media containers for each image
      const mediaContainers = [];
      
      for (let i = 0; i < testImages.length; i++) {
        const imageUrl = testImages[i];
        console.log(`     Creating container ${i + 1}/${testImages.length}...`);
        
        const response = await fetch(
          `https://graph.facebook.com/v18.0/${this.appId}/media`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              image_url: imageUrl,
              is_carousel_item: true,
              access_token: this.accessToken,
            }),
          }
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(`Failed to create media container ${i + 1}: ${error.error?.message || response.statusText}`);
        }

        const result = await response.json();
        mediaContainers.push(result.id);
        console.log(`     ✅ Container ${i + 1} created:`, result.id);
      }

      // Step 2: Create carousel container
      console.log('   Creating carousel container...');
      
      const carouselResponse = await fetch(
        `https://graph.facebook.com/v18.0/${this.appId}/media`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            media_type: 'CAROUSEL',
            children: mediaContainers.join(','),
            caption: carouselCaption,
            access_token: this.accessToken,
          }),
        }
      );

      if (!carouselResponse.ok) {
        const error = await carouselResponse.json();
        throw new Error(`Failed to create carousel container: ${error.error?.message || carouselResponse.statusText}`);
      }

      const carouselResult = await carouselResponse.json();
      console.log('✅ Carousel container created:', carouselResult.id);

      // Step 3: Publish the carousel
      console.log('   Publishing carousel...');
      
      const publishResponse = await fetch(
        `https://graph.facebook.com/v18.0/${this.appId}/media_publish`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            creation_id: carouselResult.id,
            access_token: this.accessToken,
          }),
        }
      );

      if (!publishResponse.ok) {
        const error = await publishResponse.json();
        throw new Error(`Failed to publish carousel: ${error.error?.message || publishResponse.statusText}`);
      }

      const publishResult = await publishResponse.json();
      console.log('✅ Carousel published successfully!');
      console.log(`   Post ID: ${publishResult.id}`);
      console.log(`   URL: https://instagram.com/p/${publishResult.id}`);
      console.log('');
      
      return publishResult.id;
      
    } catch (error) {
      console.error('❌ Failed to create carousel:', error.message);
      return null;
    }
  }

  async run() {
    try {
      // Step 1: Validate credentials
      const isValid = await this.validateCredentials();
      if (!isValid) {
        console.log('\n❌ Test failed: Invalid credentials');
        console.log('\nTo fix this:');
        console.log('1. Set INSTAGRAM_ACCESS_TOKEN environment variable');
        console.log('2. Set INSTAGRAM_APP_ID environment variable');
        console.log('3. Ensure your access token has content_publishing permission');
        process.exit(1);
      }

      // Step 2: Create simple test post
      const postId = await this.createTestPost();
      
      // Step 3: Create carousel test (optional)
      const carouselId = await this.createCarouselTest();
      
      // Summary
      console.log('🎉 Instagram API Test Complete!');
      console.log('================================');
      console.log(`Single post: ${postId ? '✅ Success' : '❌ Failed'}`);
      console.log(`Carousel post: ${carouselId ? '✅ Success' : '❌ Failed'}`);
      
      if (postId || carouselId) {
        console.log('\n🔗 Check your Instagram account to see the posts!');
      }
      
    } catch (error) {
      console.error('❌ Test script failed:', error.message);
      process.exit(1);
    }
  }
}

// Run the test
const test = new InstagramTest();
test.run().catch(console.error);