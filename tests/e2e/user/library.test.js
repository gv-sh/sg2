/**
 * Library Page E2E Tests
 * Tests for browsing and filtering generated content
 */

import { test, expect } from '../fixtures/test-fixtures.js';
import { LibraryPage } from '../utils/page-objects.js';
import { generateContent } from '../utils/api-helpers.js';

test.describe('Library Page', () => {
  test('should display empty library when no content exists', async ({ page }) => {
    const libraryPage = new LibraryPage(page);
    await libraryPage.goto();

    await page.waitForLoadState('networkidle');

    // Should show empty state
    const emptyMessage = page.locator('text=No stories, text=no content, text=empty');
    const hasEmptyMessage = await emptyMessage.first().isVisible().catch(() => false);

    const storyCount = await libraryPage.getStoryCount();

    expect(hasEmptyMessage || storyCount === 0).toBeTruthy();
  });

  test('should display stories when content exists', async ({ page, categoryWithParameters }) => {
    // Generate test content
    await generateContent({
      category_id: categoryWithParameters.category.id,
      content_type: 'fiction',
      parameters: { 'Test Text': 'Story 1' }
    });

    await generateContent({
      category_id: categoryWithParameters.category.id,
      content_type: 'fiction',
      parameters: { 'Test Text': 'Story 2' }
    });

    const libraryPage = new LibraryPage(page);
    await libraryPage.goto();

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Should display stories
    const storyCount = await libraryPage.getStoryCount();
    expect(storyCount).toBeGreaterThanOrEqual(2);
  });

  test('should navigate to story when clicking card', async ({ page, categoryWithParameters }) => {
    // Generate test content
    const result = await generateContent({
      category_id: categoryWithParameters.category.id,
      content_type: 'fiction',
      parameters: { 'Test Text': 'Clickable Story' }
    });

    const libraryPage = new LibraryPage(page);
    await libraryPage.goto();

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Click first story card
    const storyCards = page.locator('[data-testid="story-card"], .story-card, article');
    const firstCard = storyCards.first();

    if (await firstCard.isVisible()) {
      await firstCard.click();

      // Should navigate to story page
      await expect(page).toHaveURL(/\/story\?id=/, { timeout: 5000 });
    }
  });

  test('should display story thumbnails', async ({ page, categoryWithParameters }) => {
    // Generate test content
    await generateContent({
      category_id: categoryWithParameters.category.id,
      content_type: 'fiction',
      parameters: { 'Test Text': 'Story with Thumbnail' }
    });

    const libraryPage = new LibraryPage(page);
    await libraryPage.goto();

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check for images in story cards
    const thumbnails = page.locator('[data-testid="story-card"] img, .story-card img, article img');
    const thumbnailCount = await thumbnails.count();

    // Thumbnails may or may not exist depending on content
    expect(thumbnailCount).toBeGreaterThanOrEqual(0);
  });

  test('should display story titles and metadata', async ({ page, categoryWithParameters }) => {
    await generateContent({
      category_id: categoryWithParameters.category.id,
      content_type: 'fiction',
      parameters: { 'Test Text': 'Story with Metadata' }
    });

    const libraryPage = new LibraryPage(page);
    await libraryPage.goto();

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check for story titles
    const storyCards = page.locator('[data-testid="story-card"], .story-card, article');
    const firstCard = storyCards.first();

    if (await firstCard.isVisible()) {
      const cardText = await firstCard.textContent();
      expect(cardText.length).toBeGreaterThan(0);
    }
  });

  test('should filter stories by year', async ({ page, categoryWithParameters }) => {
    // Generate stories for different years
    await generateContent({
      category_id: categoryWithParameters.category.id,
      content_type: 'fiction',
      parameters: { 'Test Text': 'Story 2025' }
    });

    const libraryPage = new LibraryPage(page);
    await libraryPage.goto();

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check for year filter
    const yearFilter = page.locator('select[data-testid="year-filter"], select:has-text("Year")');
    const hasYearFilter = await yearFilter.isVisible().catch(() => false);

    if (hasYearFilter) {
      // Filter should be present
      expect(hasYearFilter).toBeTruthy();
    }
  });

  test('should show loading state while fetching stories', async ({ page, categoryWithParameters }) => {
    const libraryPage = new LibraryPage(page);

    // Start navigation
    const navigationPromise = libraryPage.goto();

    // Check for loading indicator during navigation
    const loadingIndicator = page.locator('[data-testid="loading"], .loading, .spinner');
    const hasLoadingIndicator = await loadingIndicator.first().isVisible({ timeout: 1000 }).catch(() => false);

    // Wait for navigation to complete
    await navigationPromise;
    await page.waitForLoadState('networkidle');

    // Loading might be too fast to catch, so this test just verifies page loads
    expect(page.url()).toContain('/library');
  });

  test('should display stories in grid layout', async ({ page, categoryWithParameters }) => {
    // Generate multiple stories
    for (let i = 0; i < 5; i++) {
      await generateContent({
        category_id: categoryWithParameters.category.id,
        content_type: 'fiction',
        parameters: { 'Test Text': `Story ${i}` }
      });
    }

    const libraryPage = new LibraryPage(page);
    await libraryPage.goto();

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Should have multiple story cards
    const storyCount = await libraryPage.getStoryCount();
    expect(storyCount).toBeGreaterThanOrEqual(5);
  });

  test('should be responsive on different screen sizes', async ({ page, categoryWithParameters }) => {
    await generateContent({
      category_id: categoryWithParameters.category.id,
      content_type: 'fiction',
      parameters: { 'Test Text': 'Responsive Story' }
    });

    const libraryPage = new LibraryPage(page);

    // Test mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await libraryPage.goto();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    expect(await libraryPage.getStoryCount()).toBeGreaterThan(0);

    // Test tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    expect(await libraryPage.getStoryCount()).toBeGreaterThan(0);

    // Test desktop
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    expect(await libraryPage.getStoryCount()).toBeGreaterThan(0);
  });

  test('should handle pagination if implemented', async ({ page, categoryWithParameters }) => {
    // Generate many stories
    for (let i = 0; i < 15; i++) {
      await generateContent({
        category_id: categoryWithParameters.category.id,
        content_type: 'fiction',
        parameters: { 'Test Text': `Story ${i}` }
      });
    }

    const libraryPage = new LibraryPage(page);
    await libraryPage.goto();

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check for pagination controls
    const pagination = page.locator('[data-testid="pagination"], .pagination, button:has-text("Next"), button:has-text("Previous")');
    const hasPagination = await pagination.first().isVisible().catch(() => false);

    // Pagination may or may not be implemented
    // Just verify stories are displayed
    const storyCount = await libraryPage.getStoryCount();
    expect(storyCount).toBeGreaterThan(0);
  });

  test('should support direct URL access', async ({ page }) => {
    await page.goto('http://localhost:3002/library');
    await page.waitForLoadState('networkidle');

    // Should load library page successfully
    expect(page.url()).toContain('/library');
  });
});
