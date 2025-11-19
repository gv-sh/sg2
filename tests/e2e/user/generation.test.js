/**
 * Content Generation Flow E2E Tests
 * Tests for the complete generation workflow
 */

import { test, expect } from '../fixtures/test-fixtures.js';
import { ParametersPage, GeneratingPage, StoryPage } from '../utils/page-objects.js';

test.describe('Content Generation Flow', () => {
  test.use({ cleanDatabase: true });

  test('should complete full generation flow', async ({ page, categoryWithParameters }) => {
    const parametersPage = new ParametersPage(page);
    const generatingPage = new GeneratingPage(page);

    // Navigate to parameters page
    await parametersPage.goto();

    // Select category and parameters
    await page.waitForSelector('text=Test Category', { timeout: 10000 });
    await parametersPage.selectCategory('Test Category');
    await page.waitForSelector('text=Test Slider', { timeout: 5000 });
    await parametersPage.selectParameter('Test Slider');
    await page.waitForTimeout(1000);

    // Click generate button
    await parametersPage.clickGenerate();

    // Should navigate to generating page
    await expect(page).toHaveURL(/\/generating/, { timeout: 5000 });

    // Verify generating state
    const isGenerating = await generatingPage.isGenerating();
    expect(isGenerating).toBeTruthy();

    // Wait for generation to complete and redirect to story page
    await generatingPage.waitForGeneration(60000);

    // Should be on story page now
    await expect(page).toHaveURL(/\/story\?id=/, { timeout: 5000 });
  });

  test('should show loading state during generation', async ({ page, categoryWithParameters }) => {
    const parametersPage = new ParametersPage(page);

    await parametersPage.goto();
    await page.waitForSelector('text=Test Category', { timeout: 10000 });
    await parametersPage.selectCategory('Test Category');
    await page.waitForSelector('text=Test Slider', { timeout: 5000 });
    await parametersPage.selectParameter('Test Slider');
    await page.waitForTimeout(1000);

    await parametersPage.clickGenerate();

    // Wait for generating page
    await page.waitForURL(/\/generating/, { timeout: 5000 });

    // Check for loading indicators
    const loadingIndicator = page.locator('[data-testid="loading-spinner"], .spinner, text=Generating');
    await expect(loadingIndicator.first()).toBeVisible({ timeout: 5000 });
  });

  test('should redirect to story after successful generation', async ({ page, categoryWithParameters }) => {
    const parametersPage = new ParametersPage(page);
    const generatingPage = new GeneratingPage(page);

    await parametersPage.goto();
    await page.waitForSelector('text=Test Category', { timeout: 10000 });
    await parametersPage.selectCategory('Test Category');
    await page.waitForSelector('text=Test Text', { timeout: 5000 });
    await parametersPage.selectParameter('Test Text');
    await page.waitForTimeout(1000);

    await parametersPage.clickGenerate();
    await generatingPage.waitForGeneration(60000);

    // Verify we're on story page with an ID
    const url = page.url();
    expect(url).toContain('/story?id=');
    expect(url).toMatch(/id=\d+/);
  });

  test('should handle generation with multiple parameters', async ({ page, categoryWithParameters }) => {
    const parametersPage = new ParametersPage(page);
    const generatingPage = new GeneratingPage(page);

    await parametersPage.goto();
    await page.waitForSelector('text=Test Category', { timeout: 10000 });
    await parametersPage.selectCategory('Test Category');

    // Add multiple parameters
    await page.waitForSelector('text=Test Slider', { timeout: 5000 });
    await parametersPage.selectParameter('Test Slider');
    await page.waitForTimeout(500);
    await parametersPage.selectParameter('Test Text');
    await page.waitForTimeout(500);
    await parametersPage.selectParameter('Test Toggle');
    await page.waitForTimeout(1000);

    await parametersPage.clickGenerate();
    await generatingPage.waitForGeneration(60000);

    // Should successfully reach story page
    await expect(page).toHaveURL(/\/story\?id=/, { timeout: 5000 });
  });

  test('should persist generation if page is refreshed during generation', async ({ page, categoryWithParameters }) => {
    const parametersPage = new ParametersPage(page);

    await parametersPage.goto();
    await page.waitForSelector('text=Test Category', { timeout: 10000 });
    await parametersPage.selectCategory('Test Category');
    await page.waitForSelector('text=Test Slider', { timeout: 5000 });
    await parametersPage.selectParameter('Test Slider');
    await page.waitForTimeout(1000);

    await parametersPage.clickGenerate();

    // Wait a moment for generation to start
    await page.waitForTimeout(2000);

    // Refresh page
    await page.reload();

    // Should still show generating state or redirect to story
    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    const isOnGeneratingOrStory = currentUrl.includes('/generating') || currentUrl.includes('/story');
    expect(isOnGeneratingOrStory).toBeTruthy();
  });

  test('should disable generate button during generation', async ({ page, categoryWithParameters }) => {
    const parametersPage = new ParametersPage(page);

    await parametersPage.goto();
    await page.waitForSelector('text=Test Category', { timeout: 10000 });
    await parametersPage.selectCategory('Test Category');
    await page.waitForSelector('text=Test Slider', { timeout: 5000 });
    await parametersPage.selectParameter('Test Slider');
    await page.waitForTimeout(1000);

    // Generate button should be enabled before clicking
    const generateButton = page.locator('button:has-text("Generate")');
    await expect(generateButton).toBeEnabled();

    await parametersPage.clickGenerate();

    // After clicking, wait for redirect to generating page
    await page.waitForURL(/\/generating/, { timeout: 5000 });

    // On generating page, there shouldn't be a generate button
    expect(await page.locator('button:has-text("Generate")').count()).toBe(0);
  });
});
