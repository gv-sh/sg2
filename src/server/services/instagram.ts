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

  constructor() {
    this.accessToken = process.env.INSTAGRAM_ACCESS_TOKEN || '';
    this.appId = process.env.INSTAGRAM_APP_ID || '';

    // Debug logging
    console.log('[Instagram Service] App ID:', this.appId || 'NOT SET');
    console.log('[Instagram Service] Access Token:', this.accessToken ? `${this.accessToken.slice(0, 20)}...` : 'NOT SET');

    if (!this.accessToken || !this.appId) {
      throw new Error('Instagram credentials are not properly configured');
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
      const mediaContainers: InstagramMediaContainer[] = [];
      
      for (const mediaUrl of request.mediaUrls) {
        const container = await this.createMediaContainer(mediaUrl);
        mediaContainers.push(container);
      }

      // Step 2: Create carousel container with all media containers
      const carouselContainer = await this.createCarouselContainer(
        mediaContainers.map(c => c.id),
        request.caption
      );

      // Step 3: Publish the carousel
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
   * Check if Instagram credentials are valid
   */
  async validateCredentials(): Promise<boolean> {
    try {
      // Use Instagram Graph API endpoint instead of Facebook Graph API
      const response = await fetch(
        `https://graph.instagram.com/me?fields=id,username&access_token=${this.accessToken}`
      );

      const result = await response.json();
      console.log('[Instagram Service] Validation response:', result);
      
      if (response.ok && result.id) {
        console.log('[Instagram Service] Credentials valid for user:', result.username);
        return true;
      }
      
      console.error('[Instagram Service] Invalid credentials:', result);
      return false;
    } catch (error) {
      console.error('Instagram credentials validation failed:', error);
      return false;
    }
  }

  /**
   * Create a media container for a single image
   */
  private async createMediaContainer(imageUrl: string): Promise<InstagramMediaContainer> {
    console.log('[Instagram Service] Creating media container for URL:', imageUrl);
    
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

    console.log('[Instagram Service] Media container response status:', response.status);

    if (!response.ok) {
      const error = await response.json();
      console.error('[Instagram Service] Media container error:', error);
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
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${this.appId}/media`,
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
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${this.appId}/media_publish`,
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

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to publish carousel: ${error.error?.message || response.statusText}`);
    }

    const result = await response.json();
    return { id: result.id };
  }

  /**
   * Get the public URL for uploading images (for external hosting)
   */
  getImageUploadUrl(storyId: string, imageIndex: number): string {
    // Return the full URL that Instagram can access to fetch the image
    // This assumes the images will be served from our API
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    return `${baseUrl}/api/instagram/images/${storyId}/${imageIndex}`;
  }
}

export default InstagramService;