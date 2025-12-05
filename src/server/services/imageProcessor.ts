/**
 * Image Processor Service - Generate Instagram carousel images from story content
 * Uses HTML/CSS templates that can be converted to images using html2canvas
 */

import type { ContentApiData } from '../../types/api.js';

interface CarouselSlide {
  html: string;
  description: string;
  type: 'title' | 'content' | 'branding' | 'original';
}

interface GeneratedCarouselSlides {
  slides: CarouselSlide[];
  totalCount: number;
}

export class ImageProcessorService {
  private readonly cardStyles = `
    <style>
      .carousel-card {
        width: 1080px;
        height: 1080px;
        background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        padding: 80px;
        box-sizing: border-box;
        color: white;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        position: relative;
        overflow: hidden;
      }
      
      .title-card {
        background: linear-gradient(135deg, #1a1a1a 0%, #6366f1 100%);
        text-align: center;
      }
      
      .title-card h1 {
        font-size: clamp(48px, 5vw, 80px);
        font-weight: bold;
        margin: 0 0 40px 0;
        line-height: 1.2;
        max-width: 100%;
      }
      
      .title-card .year {
        font-size: 48px;
        color: #a78bfa;
        margin-top: 40px;
      }
      
      .title-card .divider {
        width: 200px;
        height: 4px;
        background: #6366f1;
        margin: 40px auto;
      }
      
      .content-card {
        background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
        text-align: left;
        border: 2px dashed #6366f1;
      }
      
      .content-card .content {
        font-size: 32px;
        line-height: 1.6;
        margin: 0;
        max-height: 800px;
        overflow: hidden;
      }
      
      .content-card .page-number {
        position: absolute;
        bottom: 40px;
        left: 50%;
        transform: translateX(-50%);
        color: #6366f1;
        font-size: 24px;
        font-weight: bold;
      }
      
      .content-card p {
        margin: 0 0 32px 0;
      }
      
      .branding-card {
        background: radial-gradient(circle, #6366f1 0%, #1a1a1a 100%);
        text-align: center;
      }
      
      .branding-card h1 {
        font-size: 64px;
        font-weight: bold;
        margin: 0 0 20px 0;
        color: white;
      }
      
      .branding-card h2 {
        font-size: 80px;
        font-weight: bold;
        margin: 0 0 40px 0;
        color: white;
      }
      
      .branding-card .subtitle {
        font-size: 32px;
        color: rgba(255, 255, 255, 0.8);
        margin: 0;
      }
    </style>
  `;

  /**
   * Generate complete carousel slide data for a story
   */
  async generateCarouselSlides(story: ContentApiData): Promise<GeneratedCarouselSlides> {
    const slides: CarouselSlide[] = [];

    try {
      // Slide 1: Original story image (if exists)
      if (story.image_original_url) {
        slides.push({
          html: '', // Will be handled separately as it's an existing image
          description: 'Story illustration',
          type: 'original'
        });
      }

      // Slide 2: Title and year card
      const titleSlide = this.createTitleSlide(story.title, story.year);
      slides.push(titleSlide);

      // Slides 3-N: Story content split into readable chunks
      const contentSlides = this.createContentSlides(story.content || '');
      slides.push(...contentSlides);

      // Final slide: Branding card
      const brandingSlide = this.createBrandingSlide();
      slides.push(brandingSlide);

      return { slides, totalCount: slides.length };
    } catch (error) {
      console.error('Failed to generate carousel slides:', error);
      throw new Error(`Slide generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a title slide with story title and year
   */
  private createTitleSlide(title: string, year: number | null): CarouselSlide {
    const html = `
      ${this.cardStyles}
      <div class="carousel-card title-card">
        <h1>${this.escapeHtml(title)}</h1>
        <div class="divider"></div>
        ${year ? `<div class="year">Year ${year}</div>` : ''}
      </div>
    `;

    return {
      html,
      description: 'Story title and setting',
      type: 'title'
    };
  }

  /**
   * Create content slides from story text
   */
  private createContentSlides(content: string): CarouselSlide[] {
    const slides: CarouselSlide[] = [];
    
    // Clean and split content into paragraphs
    const paragraphs = content
      .split('\n\n')
      .filter(p => p.trim())
      .filter(p => !p.includes('**Title:'))
      .map(p => p.trim());

    // Group paragraphs into slides (2 paragraphs per slide for readability)
    const paragraphsPerSlide = 2;
    for (let i = 0; i < paragraphs.length; i += paragraphsPerSlide) {
      const slideParagraphs = paragraphs.slice(i, i + paragraphsPerSlide);
      const slideNumber = Math.floor(i / paragraphsPerSlide) + 1;
      
      const contentHtml = slideParagraphs
        .map(p => `<p>${this.escapeHtml(p)}</p>`)
        .join('');

      const html = `
        ${this.cardStyles}
        <div class="carousel-card content-card">
          <div class="content">
            ${contentHtml}
          </div>
          <div class="page-number">${slideNumber}</div>
        </div>
      `;

      slides.push({
        html,
        description: 'Story content',
        type: 'content'
      });
    }

    return slides;
  }

  /**
   * Create branding slide
   */
  private createBrandingSlide(): CarouselSlide {
    const html = `
      ${this.cardStyles}
      <div class="carousel-card branding-card">
        <h1>Created with</h1>
        <h2>Futures of Hope</h2>
        <p class="subtitle">AI-Powered Speculative Fiction</p>
      </div>
    `;

    return {
      html,
      description: 'Created with Futures of Hope',
      type: 'branding'
    };
  }

  /**
   * Get the total number of slides that will be generated for a story
   */
  calculateSlideCount(story: ContentApiData): number {
    const hasOriginalImage = !!story.image_original_url;
    const paragraphs = (story.content || '')
      .split('\n\n')
      .filter(p => p.trim())
      .filter(p => !p.includes('**Title:'));
    
    const contentSlides = Math.ceil(paragraphs.length / 2); // 2 paragraphs per slide
    
    // Original image (if exists) + title slide + content slides + branding slide
    return (hasOriginalImage ? 1 : 0) + 1 + contentSlides + 1;
  }

  /**
   * Get Instagram-optimized caption for the carousel post
   */
  generateInstagramCaption(story: ContentApiData): string {
    const hashtags = [
      '#FuturesOfHope',
      '#AIFiction',
      '#SpeculativeFiction',
      '#SciFi',
      '#StoryGeneration',
      '#FutureWorlds',
      '#AIWriting',
      '#CreativeAI'
    ];

    const caption = `${story.title}

Set in the year ${story.year || 'unknown'}, this speculative fiction story explores themes of hope, technology, and human potential.

🤖 Generated with AI
📚 Speculative Fiction
🔮 Futures of Hope

${hashtags.join(' ')}

#carousel #story #fiction`;

    return caption;
  }

  /**
   * Escape HTML characters for safe rendering
   */
  private escapeHtml(text: string): string {
    const div = { textContent: text } as any;
    return div.innerHTML || text.replace(/&/g, '&amp;')
                                  .replace(/</g, '&lt;')
                                  .replace(/>/g, '&gt;')
                                  .replace(/"/g, '&quot;')
                                  .replace(/'/g, '&#39;');
  }
}

export default ImageProcessorService;