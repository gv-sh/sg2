/**
 * Instagram Service - Handle Instagram Graph API integration for carousel posting
 */

import type { Config } from '../../types/config.js';

interface InstagramMediaContainer {
  id: string;
}

interface InstagramCarouselPost {
  id: string;
}

interface InstagramComment {
  id: string;
}

interface CarouselPostRequest {
  mediaUrls: string[];
  caption: string;
}

interface CommentRequest {
  postId: string;
  message: string;
}

export class InstagramService {
  private accessToken: string;
  private appId: string;
  private facebookPageId: string;
  private instagramBusinessAccountId: string | null = null;

  constructor() {
    this.accessToken = process.env.INSTAGRAM_ACCESS_TOKEN || '';
    this.appId = process.env.INSTAGRAM_APP_ID || '';
    this.facebookPageId = process.env.FACEBOOK_PAGE_ID || '';

    // Debug logging
    console.log('[Instagram Service] App ID:', this.appId || 'NOT SET');
    console.log('[Instagram Service] Facebook Page ID:', this.facebookPageId || 'NOT SET');
    console.log('[Instagram Service] Access Token:', this.accessToken ? `${this.accessToken.slice(0, 20)}...` : 'NOT SET');

    if (!this.accessToken || !this.facebookPageId) {
      throw new Error('Instagram credentials are not properly configured. Need INSTAGRAM_ACCESS_TOKEN and FACEBOOK_PAGE_ID');
    }
  }

  /**
   * Create a carousel post with multiple images
   */
  async createCarouselPost(request: CarouselPostRequest): Promise<InstagramCarouselPost> {
    try {
      // First validate that we have the right type of credentials
      const isValid = await this.validateCredentials();
      if (!isValid) {
        throw new Error('Invalid Instagram credentials. Please ensure you have a valid Instagram Graph API token for content publishing.');
      }

      // Step 1: Create individual media containers for each image
      // Instagram carousels support 2-10 images maximum
      const maxImages = 10;
      const limitedMediaUrls = request.mediaUrls.slice(0, maxImages);
      console.log(`[Instagram Service] Using ${limitedMediaUrls.length} images (max ${maxImages}) for carousel`);
      
      const mediaContainers: InstagramMediaContainer[] = [];
      
      for (const mediaUrl of limitedMediaUrls) {
        const container = await this.createMediaContainer(mediaUrl);
        mediaContainers.push(container);
      }

      // Step 2: Create carousel container with all media containers
      const carouselContainer = await this.createCarouselContainer(
        mediaContainers.map(c => c.id),
        request.caption
      );

      // Step 3: Wait a moment for media processing, then publish the carousel
      console.log(`[Instagram Service] Waiting 5 seconds for media processing...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const publishedPost = await this.publishCarousel(carouselContainer.id);

      return publishedPost;
    } catch (error) {
      console.error('Failed to create Instagram carousel post:', error);
      
      // Provide more helpful error message for common issues
      if (error instanceof Error && error.message.includes('access token')) {
        throw new Error(`Instagram API error: ${error.message}. You may need an Instagram Graph API token (not Basic Display API) for content publishing.`);
      }
      
      throw new Error(`Instagram carousel post failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Add a comment to an Instagram post
   */
  async addComment(request: CommentRequest): Promise<InstagramComment> {
    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${request.postId}/comments`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: request.message,
            access_token: this.accessToken,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Instagram comment failed: ${error.error?.message || response.statusText}`);
      }

      const result = await response.json();
      return { id: result.id };
    } catch (error) {
      console.error('Failed to add Instagram comment:', error);
      throw new Error(`Instagram comment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if Instagram credentials are valid and get Instagram Business Account
   */
  async validateCredentials(): Promise<boolean> {
    try {
      // Step 1: Get Facebook Page information using Facebook Graph API
      console.log('[Instagram Service] Validating Facebook Page access...');
      const pageResponse = await fetch(
        `https://graph.facebook.com/v18.0/${this.facebookPageId}?fields=id,name,instagram_business_account&access_token=${this.accessToken}`
      );

      const pageResult = await pageResponse.json();
      console.log('[Instagram Service] Facebook Page validation response:', pageResult);
      
      if (!pageResponse.ok || pageResult.error) {
        console.error('[Instagram Service] Facebook Page validation failed:', pageResult.error);
        const errorCode = pageResult.error?.code;
        const errorMessage = pageResult.error?.message;
        
        if (errorCode === 190) {
          throw new Error('Instagram access token is invalid or expired. Please refresh your token.');
        } else if (errorCode === 200) {
          throw new Error('Instagram permissions error. Please ensure your app has content_management permissions.');
        } else if (errorCode === 100) {
          throw new Error('Invalid Facebook Page ID. Please check your INSTAGRAM_APP_ID configuration.');
        } else {
          throw new Error(`Facebook API error: ${errorMessage || 'Unknown error'}`);
        }
      }

      if (!pageResult.instagram_business_account) {
        throw new Error('No Instagram Business Account linked to this Facebook Page. Please link an Instagram Business Account to your Facebook Page.');
      }

      // Step 2: Validate Instagram Business Account access
      console.log('[Instagram Service] Validating Instagram Business Account access...');
      const igAccountId = pageResult.instagram_business_account.id;
      const igResponse = await fetch(
        `https://graph.facebook.com/v18.0/${igAccountId}?fields=id,username&access_token=${this.accessToken}`
      );

      const igResult = await igResponse.json();
      console.log('[Instagram Service] Instagram Business Account validation response:', igResult);
      
      if (igResponse.ok && igResult.id) {
        console.log('[Instagram Service] Credentials valid for Instagram Business Account:', igResult.username || igResult.id);
        this.instagramBusinessAccountId = igResult.id; // Store for media operations
        return true;
      }
      
      console.error('[Instagram Service] Invalid Instagram Business Account:', igResult);
      
      if (igResult.error) {
        const errorCode = igResult.error.code;
        const errorMessage = igResult.error.message;
        
        if (errorCode === 190) {
          throw new Error('Instagram access token expired. Please refresh your Instagram access token.');
        } else if (errorCode === 200) {
          throw new Error('Insufficient permissions for Instagram Business Account. Please ensure your app has instagram_content_publish permissions.');
        } else {
          throw new Error(`Instagram Business Account error: ${errorMessage}`);
        }
      }
      
      throw new Error('Instagram Business Account validation failed. Please check your account setup.');
    } catch (error) {
      console.error('Instagram credentials validation failed:', error);
      return false;
    }
  }

  /**
   * Get Instagram Business Account ID
   */
  private async getInstagramBusinessAccountId(): Promise<string> {
    if (this.instagramBusinessAccountId) {
      return this.instagramBusinessAccountId;
    }

    // If not cached, validate credentials to get it
    const isValid = await this.validateCredentials();
    if (!isValid || !this.instagramBusinessAccountId) {
      throw new Error('Unable to get Instagram Business Account ID. Please check your credentials.');
    }

    return this.instagramBusinessAccountId;
  }

  /**
   * Create a media container for a single image
   */
  private async createMediaContainer(imageUrl: string): Promise<InstagramMediaContainer> {
    console.log('[Instagram Service] Creating media container for URL:', imageUrl);
    
    const igAccountId = await this.getInstagramBusinessAccountId();
    
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${igAccountId}/media`,
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

    console.log('[Instagram Service] Media container response status:', response.status);

    if (!response.ok) {
      const error = await response.json();
      console.error('[Instagram Service] Media container error:', error);
      
      // Check for rate limiting
      if (error.error?.code === 4) {
        throw new Error(`RATE_LIMITED: Instagram media upload limit reached. ${error.error?.message || 'Try again later.'}`);
      } else if (error.error?.type === 'OAuthException') {
        throw new Error(`AUTH_ERROR: Instagram authentication issue. ${error.error?.message || 'Check credentials.'}`);
      }
      
      throw new Error(`Failed to create media container: ${error.error?.message || response.statusText}`);
    }

    const result = await response.json();
    console.log('[Instagram Service] Media container created:', result.id);
    return { id: result.id };
  }

  /**
   * Create a carousel container with multiple media items
   */
  private async createCarouselContainer(mediaIds: string[], caption: string): Promise<InstagramMediaContainer> {
    const igAccountId = await this.getInstagramBusinessAccountId();
    
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${igAccountId}/media`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          media_type: 'CAROUSEL',
          children: mediaIds.join(','),
          caption: caption,
          access_token: this.accessToken,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to create carousel container: ${error.error?.message || response.statusText}`);
    }

    const result = await response.json();
    return { id: result.id };
  }

  /**
   * Publish a carousel container
   */
  private async publishCarousel(containerId: string): Promise<InstagramCarouselPost> {
    const igAccountId = await this.getInstagramBusinessAccountId();
    
    console.log(`[Instagram Service] Publishing carousel container ${containerId} to account ${igAccountId}`);
    
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${igAccountId}/media_publish`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          creation_id: containerId,
          access_token: this.accessToken,
        }),
      }
    );

    console.log(`[Instagram Service] Publish response status: ${response.status}`);

    if (!response.ok) {
      const error = await response.json();
      console.error(`[Instagram Service] Publish error:`, error);
      
      // Check for rate limiting specifically
      if (error.error?.code === 4 && error.error?.error_subcode === 2207051) {
        throw new Error(`RATE_LIMITED: Instagram posting limit reached. ${error.error?.error_user_msg || 'Try again later.'}`);
      } else if (error.error?.code === 4) {
        throw new Error(`RATE_LIMITED: Instagram API rate limit exceeded. ${error.error?.message || 'Try again later.'}`);
      } else if (error.error?.type === 'OAuthException') {
        throw new Error(`AUTH_ERROR: Instagram authentication issue. ${error.error?.message || 'Check credentials.'}`);
      }
      
      throw new Error(`Failed to publish carousel: ${error.error?.message || response.statusText}`);
    }

    const result = await response.json();
    console.log(`[Instagram Service] Carousel published successfully:`, result);
    return { id: result.id };
  }

  /**
   * Get the public URL for uploading images (for external hosting)
   */
  getImageUploadUrl(storyId: string, imageIndex: number): string {
    // Use BASE_URL environment variable for public access
    // For local development, use ngrok or similar tunneling service
    const baseUrl = process.env.BASE_URL || process.env.PUBLIC_URL || 'http://localhost:3000';
    return `${baseUrl}/api/instagram/images/${storyId}/${imageIndex}`;
  }
}

export default InstagramService;