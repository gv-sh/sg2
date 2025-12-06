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

interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  textMuted: string;
}

export class ImageProcessorService {
  private readonly themes: Record<string, ThemeColors> = {
    cyberpunk: {
      primary: '#ff0080',
      secondary: '#00ffff',
      accent: '#ffff00',
      background: '#1a1a1a',
      text: '#ffffff',
      textMuted: '#cccccc'
    },
    nature: {
      primary: '#22c55e',
      secondary: '#059669',
      accent: '#fbbf24',
      background: '#1f2937',
      text: '#ffffff',
      textMuted: '#d1d5db'
    },
    space: {
      primary: '#6366f1',
      secondary: '#8b5cf6',
      accent: '#f59e0b',
      background: '#1e1b4b',
      text: '#ffffff',
      textMuted: '#c7d2fe'
    },
    dystopian: {
      primary: '#ef4444',
      secondary: '#dc2626',
      accent: '#f97316',
      background: '#2d1b1b',
      text: '#ffffff',
      textMuted: '#fca5a5'
    },
    utopian: {
      primary: '#3b82f6',
      secondary: '#1d4ed8',
      accent: '#06b6d4',
      background: '#1e3a5f',
      text: '#ffffff',
      textMuted: '#93c5fd'
    },
    default: {
      primary: '#6366f1',
      secondary: '#4f46e5',
      accent: '#a78bfa',
      background: '#1a1a1a',
      text: '#ffffff',
      textMuted: '#d1d5db'
    }
  };

  private getThemeFromContent(title: string, content: string): ThemeColors {
    const text = (title + ' ' + content).toLowerCase();
    
    if (text.includes('cyber') || text.includes('digital') || text.includes('ai') || text.includes('robot')) {
      return this.themes.cyberpunk;
    }
    if (text.includes('nature') || text.includes('forest') || text.includes('green') || text.includes('earth')) {
      return this.themes.nature;
    }
    if (text.includes('space') || text.includes('star') || text.includes('planet') || text.includes('galaxy')) {
      return this.themes.space;
    }
    if (text.includes('war') || text.includes('dark') || text.includes('destroy') || text.includes('apocalypse')) {
      return this.themes.dystopian;
    }
    if (text.includes('peace') || text.includes('harmony') || text.includes('perfect') || text.includes('paradise')) {
      return this.themes.utopian;
    }
    
    return this.themes.default;
  }

  private generateCardStyles(theme: ThemeColors): string {
    return `
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
    <style>
      * {
        box-sizing: border-box;
      }
      
      .carousel-card {
        width: 1080px;
        height: 1080px;
        background: ${theme.background};
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        padding: 80px;
        color: ${theme.text};
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        position: relative;
        overflow: hidden;
        background-size: cover;
        background-position: center;
      }
      
      .title-card {
        background: ${theme.background};
        text-align: center;
        border-radius: 8px;
      }
      
      .title-card h1 {
        font-size: 48px;
        font-weight: 700;
        margin: 0 0 30px 0;
        line-height: 1.3;
        letter-spacing: -0.02em;
        color: ${theme.text};
        max-width: 90%;
      }
      
      .title-card .year {
        font-size: 36px;
        font-weight: 600;
        color: ${theme.primary};
        margin-top: 30px;
        font-family: 'JetBrains Mono', monospace;
        letter-spacing: 0.05em;
      }
      
      .title-card .divider {
        width: 150px;
        height: 4px;
        background: ${theme.primary};
        margin: 30px auto;
        border-radius: 2px;
      }
      
      .content-card {
        background: ${theme.background};
        text-align: left;
        border-radius: 8px;
        padding: 80px 80px 120px 80px;
      }
      
      .content-card .content {
        font-size: 28px;
        line-height: 1.7;
        margin: 0;
        font-weight: 400;
        color: ${theme.text};
      }
      
      
      .content-card p {
        margin: 0 0 28px 0;
        text-align: justify;
      }
      
      .content-card p:last-of-type {
        margin-bottom: 0;
      }
      
      .quote-highlight {
        font-style: italic;
        color: ${theme.accent};
        font-weight: 600;
        position: relative;
        padding-left: 20px;
      }
      
      .quote-highlight::before {
        content: '"';
        position: absolute;
        left: 0;
        top: -5px;
        font-size: 48px;
        color: ${theme.primary};
        line-height: 1;
      }
      
      .branding-card {
        background: ${theme.background};
        text-align: center;
        border-radius: 8px;
      }
      
      .branding-card h1 {
        font-size: 48px;
        font-weight: 600;
        margin: 0 0 15px 0;
        color: ${theme.textMuted};
        letter-spacing: 0.05em;
      }
      
      .branding-card h2 {
        font-size: 72px;
        font-weight: 800;
        margin: 0 0 30px 0;
        color: ${theme.text};
        letter-spacing: -0.02em;
        text-shadow: 0 4px 30px rgba(0,0,0,0.5);
      }
      
      .branding-card .subtitle {
        font-size: 28px;
        color: ${theme.textMuted};
        margin: 0;
        font-weight: 500;
        letter-spacing: 0.02em;
      }
      
      .fade-in {
        animation: fadeIn 0.5s ease-in-out;
      }
      
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
    </style>
  `;
  }

  /**
   * Generate complete carousel slide data for a story
   */
  async generateCarouselSlides(story: ContentApiData): Promise<GeneratedCarouselSlides> {
    const slides: CarouselSlide[] = [];

    try {
      // Determine theme based on story content
      const theme = this.getThemeFromContent(story.title, story.content || '');

      // Slide 1: Original story image (if exists)
      if (story.image_original_url) {
        slides.push({
          html: '', // Will be handled separately as it's an existing image
          description: 'Story illustration',
          type: 'original'
        });
      }

      // Slide 2: Title and year card
      const titleSlide = this.createTitleSlide(story.title, story.year, theme);
      slides.push(titleSlide);

      // Slides 3-N: Story content split into readable chunks
      const contentSlides = this.createContentSlides(story.content || '', theme);
      slides.push(...contentSlides);

      // Final slide: Branding card
      const brandingSlide = this.createBrandingSlide(theme);
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
  private createTitleSlide(title: string, year: number | null, theme: ThemeColors): CarouselSlide {
    const html = `
      ${this.generateCardStyles(theme)}
      <div class="carousel-card title-card fade-in">
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
   * Create content slides from story text with improved chunking
   */
  private createContentSlides(content: string, theme: ThemeColors): CarouselSlide[] {
    const slides: CarouselSlide[] = [];
    
    // Clean and split content into paragraphs
    const paragraphs = content
      .split('\n\n')
      .filter(p => p.trim())
      .filter(p => !p.includes('**Title:'))
      .map(p => p.trim());

    if (paragraphs.length === 0) return slides;

    // Intelligent content chunking based on content length
    const chunks = this.chunkContentIntelligently(paragraphs);
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const slideNumber = i + 1;
      
      // Process content for special formatting
      const contentHtml = chunk
        .map(p => {
          let processedParagraph = this.escapeHtml(p);
          
          // Highlight dialogue or quoted text
          if (p.includes('"') || p.includes("'")) {
            processedParagraph = `<span class="quote-highlight">${processedParagraph}</span>`;
          }
          
          return `<p>${processedParagraph}</p>`;
        })
        .join('');

      const html = `
        ${this.generateCardStyles(theme)}
        <div class="carousel-card content-card fade-in">
          <div class="content">
            ${contentHtml}
          </div>
        </div>
      `;

      slides.push({
        html,
        description: `Story content - Part ${slideNumber}`,
        type: 'content'
      });
    }

    return slides;
  }

  /**
   * Intelligently chunk content based on visual space and readability
   */
  private chunkContentIntelligently(paragraphs: string[]): string[][] {
    const chunks: string[][] = [];
    // Reduced character limits to account for visual space with better formatting
    const maxCharsPerSlide = 600; // Optimal for smaller font size and better spacing
    const minCharsPerSlide = 300;
    
    let currentChunk: string[] = [];
    let currentChunkLength = 0;
    
    for (const paragraph of paragraphs) {
      const paragraphLength = paragraph.length;
      
      // If adding this paragraph would exceed max chars and we have minimum content
      if (currentChunkLength + paragraphLength > maxCharsPerSlide && currentChunkLength > minCharsPerSlide) {
        chunks.push([...currentChunk]);
        currentChunk = [paragraph];
        currentChunkLength = paragraphLength;
      } else {
        currentChunk.push(paragraph);
        currentChunkLength += paragraphLength;
      }
    }
    
    // Add final chunk if it exists
    if (currentChunk.length > 0) {
      chunks.push(currentChunk);
    }
    
    // Ensure no single chunk is too long by splitting large paragraphs
    return chunks.map(chunk => {
      if (chunk.length === 1 && chunk[0].length > maxCharsPerSlide) {
        return this.splitLongParagraph(chunk[0], maxCharsPerSlide);
      }
      return chunk;
    });
  }

  /**
   * Split very long paragraphs at sentence boundaries
   */
  private splitLongParagraph(paragraph: string, maxLength: number): string[] {
    const sentences = paragraph.match(/[^\.!?]+[\.!?]+/g) || [paragraph];
    const chunks: string[] = [];
    let currentChunk = '';
    
    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > maxLength && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += sentence;
      }
    }
    
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks;
  }

  /**
   * Create branding slide
   */
  private createBrandingSlide(theme: ThemeColors): CarouselSlide {
    const html = `
      ${this.generateCardStyles(theme)}
      <div class="carousel-card branding-card fade-in">
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
   * Get Instagram-optimized caption with content analysis
   */
  generateInstagramCaption(story: ContentApiData): string {
    const analysis = this.analyzeStoryContent(story.title, story.content || '');
    const dynamicHashtags = this.generateDynamicHashtags(analysis);
    
    const baseHashtags = [
      '#FuturesOfHope',
      '#AIFiction',
      '#SpeculativeFiction',
      '#StoryGeneration',
      '#FutureWorlds',
      '#AIWriting',
      '#CreativeAI'
    ];

    // Create engaging opening based on story themes
    const thematicIntro = this.generateThematicIntro(analysis);
    
    const caption = `${story.title}

${thematicIntro}

Set in the year ${story.year || 'the future'}
Themes: ${analysis.themes.slice(0, 3).join(', ')}
Mood: ${analysis.mood}

Generated with AI
Speculative Fiction
Created with Futures of Hope

${[...baseHashtags, ...dynamicHashtags].slice(0, 20).join(' ')}

What future do you envision? Share your thoughts below!

#carousel #story #fiction`;

    return caption;
  }

  /**
   * Analyze story content for themes, mood, and key concepts
   */
  private analyzeStoryContent(title: string, content: string): {
    themes: string[];
    mood: string;
    keyWords: string[];
    genre: string;
  } {
    const text = (title + ' ' + content).toLowerCase();
    const words = text.split(/\s+/);
    
    // Detect themes
    const themes: string[] = [];
    if (text.includes('technology') || text.includes('ai') || text.includes('robot') || text.includes('digital')) {
      themes.push('technology');
    }
    if (text.includes('nature') || text.includes('environment') || text.includes('earth') || text.includes('climate')) {
      themes.push('sustainability');
    }
    if (text.includes('society') || text.includes('community') || text.includes('people') || text.includes('human')) {
      themes.push('humanity');
    }
    if (text.includes('space') || text.includes('planet') || text.includes('galaxy') || text.includes('star')) {
      themes.push('exploration');
    }
    if (text.includes('time') || text.includes('past') || text.includes('future') || text.includes('dimension')) {
      themes.push('time');
    }

    // Detect mood
    let mood = 'neutral';
    const positiveWords = ['hope', 'bright', 'peace', 'harmony', 'success', 'beautiful', 'wonderful'];
    const negativeWords = ['dark', 'war', 'destruction', 'fear', 'dystopia', 'collapse', 'danger'];
    
    const positiveCount = positiveWords.filter(word => text.includes(word)).length;
    const negativeCount = negativeWords.filter(word => text.includes(word)).length;
    
    if (positiveCount > negativeCount) mood = 'hopeful';
    else if (negativeCount > positiveCount) mood = 'dark';

    // Extract key words (simplified)
    const keyWords = words
      .filter(word => word.length > 4)
      .filter(word => !['the', 'and', 'that', 'with', 'they', 'this', 'from', 'were', 'been', 'have'].includes(word))
      .slice(0, 5);

    // Determine genre
    let genre = 'scifi';
    if (themes.includes('sustainability')) genre = 'solarpunk';
    if (mood === 'dark') genre = 'cyberpunk';
    if (themes.includes('exploration')) genre = 'spaceopera';

    return { themes, mood, keyWords, genre };
  }

  /**
   * Generate dynamic hashtags based on content analysis
   */
  private generateDynamicHashtags(analysis: { themes: string[]; mood: string; genre: string }): string[] {
    const hashtags: string[] = [];
    
    // Theme-based hashtags
    analysis.themes.forEach(theme => {
      switch (theme) {
        case 'technology':
          hashtags.push('#TechFiction', '#DigitalFuture');
          break;
        case 'sustainability':
          hashtags.push('#ClimateChange', '#GreenFuture', '#Solarpunk');
          break;
        case 'humanity':
          hashtags.push('#HumanNature', '#Society', '#Community');
          break;
        case 'exploration':
          hashtags.push('#SpaceExploration', '#CosmicStory', '#SpaceOpera');
          break;
        case 'time':
          hashtags.push('#TimeTravel', '#TemporalFiction');
          break;
      }
    });

    // Mood-based hashtags
    if (analysis.mood === 'hopeful') {
      hashtags.push('#OptimisticFiction', '#HopefulFuture');
    } else if (analysis.mood === 'dark') {
      hashtags.push('#DystopianFiction', '#DarkFuture');
    }

    // Genre hashtags
    switch (analysis.genre) {
      case 'cyberpunk':
        hashtags.push('#Cyberpunk');
        break;
      case 'solarpunk':
        hashtags.push('#Solarpunk');
        break;
      case 'spaceopera':
        hashtags.push('#SpaceOpera');
        break;
      default:
        hashtags.push('#SciFi');
    }

    return hashtags.slice(0, 8); // Limit to avoid caption length issues
  }

  /**
   * Generate thematic introduction for the caption
   */
  private generateThematicIntro(analysis: { themes: string[]; mood: string }): string {
    if (analysis.mood === 'hopeful') {
      return "Imagine a future where possibilities are endless and hope prevails...";
    } else if (analysis.mood === 'dark') {
      return "Step into a world where shadows define the future...";
    } else if (analysis.themes.includes('technology')) {
      return "Where technology meets humanity, extraordinary stories emerge...";
    } else if (analysis.themes.includes('exploration')) {
      return "Beyond the stars lies a universe of infinite possibilities...";
    } else {
      return "A glimpse into tomorrow's world, where the extraordinary becomes reality...";
    }
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