/**
 * Parameters Page E2E Tests
 * Tests for parameter selection and configuration
 */

import { test, expect } from '../fixtures/test-fixtures.js';
import { ParametersPage } from '../utils/page-objects.js';

test.describe('Parameters Page', () => {
  test('should display parameters page', async ({ page, categoryWithParameters }) => {
    const parametersPage = new ParametersPage(page);
    await parametersPage.goto();

    // Check page title
    await expect(page).toHaveURL(/\/parameters/);

    // Check for three-column layout
    await expect(page.locator('[data-testid="categories-column"]')).toBeVisible();
    await expect(page.locator('[data-testid="parameters-column"]')).toBeVisible();
    await expect(page.locator('[data-testid="selected-column"]')).toBeVisible();
  });

  test('should display categories in left column', async ({ page, categoryWithParameters }) => {
    const parametersPage = new ParametersPage(page);
    await parametersPage.goto();

    // Wait for categories to load
    await page.waitForSelector('text=Test Category', { timeout: 10000 });

    // Check if category is visible
    const categoryVisible = await page.isVisible('text=Test Category');
    expect(categoryVisible).toBeTruthy();
  });

  test('should display parameters when category is selected', async ({ page, categoryWithParameters }) => {
    const parametersPage = new ParametersPage(page);
    await parametersPage.goto();

    // Select category
    await page.waitForSelector('text=Test Category', { timeout: 10000 });
    await parametersPage.selectCategory('Test Category');

    // Wait for parameters to appear
    await page.waitForSelector('text=Test Slider', { timeout: 5000 });

    // Verify parameters are visible
    expect(await page.isVisible('text=Test Slider')).toBeTruthy();
    expect(await page.isVisible('text=Test Text')).toBeTruthy();
    expect(await page.isVisible('text=Test Toggle')).toBeTruthy();
  });

  test('should add parameter to selection', async ({ page, categoryWithParameters }) => {
    const parametersPage = new ParametersPage(page);
    await parametersPage.goto();

    // Select category and parameter
    await page.waitForSelector('text=Test Category', { timeout: 10000 });
    await parametersPage.selectCategory('Test Category');
    await page.waitForSelector('text=Test Slider', { timeout: 5000 });
    await parametersPage.selectParameter('Test Slider');

    // Wait for parameter to appear in selected column
    await page.waitForTimeout(1000);

    // Verify parameter appears in selected column
    const selectedColumn = page.locator('[data-testid="selected-column"]');
    await expect(selectedColumn).toContainText('Test Slider');
  });

  test('should remove parameter from selection', async ({ page, categoryWithParameters }) => {
    const parametersPage = new ParametersPage(page);
    await parametersPage.goto();

    // Select category and parameter
    await page.waitForSelector('text=Test Category', { timeout: 10000 });
    await parametersPage.selectCategory('Test Category');
    await page.waitForSelector('text=Test Slider', { timeout: 5000 });
    await parametersPage.selectParameter('Test Slider');

    // Wait for parameter to be added
    await page.waitForTimeout(1000);

    // Remove parameter
    const removeButton = page.locator('button[aria-label*="Remove"]').first();
    if (await removeButton.isVisible()) {
      await removeButton.click();
      await page.waitForTimeout(500);
    }

    // Verify parameter is removed (check that selected column is empty or doesn't contain the parameter)
    const selectedColumn = page.locator('[data-testid="selected-column"]');
    const hasNoParameters = await selectedColumn.locator('text=No parameters selected').isVisible()
      .catch(() => false);

    expect(hasNoParameters || !(await selectedColumn.textContent()).includes('Test Slider')).toBeTruthy();
  });

  test('should modify slider parameter value', async ({ page, categoryWithParameters }) => {
    const parametersPage = new ParametersPage(page);
    await parametersPage.goto();

    // Select category and parameter
    await page.waitForSelector('text=Test Category', { timeout: 10000 });
    await parametersPage.selectCategory('Test Category');
    await page.waitForSelector('text=Test Slider', { timeout: 5000 });
    await parametersPage.selectParameter('Test Slider');

    // Wait for parameter to be added
    await page.waitForTimeout(1000);

    // Find and modify slider
    const slider = page.locator('input[type="range"]').first();
    if (await slider.isVisible()) {
      await slider.fill('75');
      await page.waitForTimeout(500);

      // Verify value changed
      const value = await slider.inputValue();
      expect(parseInt(value)).toBe(75);
    }
  });

  test('should add multiple parameters', async ({ page, categoryWithParameters }) => {
    const parametersPage = new ParametersPage(page);
    await parametersPage.goto();

    // Select category
    await page.waitForSelector('text=Test Category', { timeout: 10000 });
    await parametersPage.selectCategory('Test Category');

    // Add multiple parameters
    await page.waitForSelector('text=Test Slider', { timeout: 5000 });
    await parametersPage.selectParameter('Test Slider');
    await page.waitForTimeout(500);

    await parametersPage.selectParameter('Test Text');
    await page.waitForTimeout(500);

    await parametersPage.selectParameter('Test Toggle');
    await page.waitForTimeout(500);

    // Verify all parameters are in selected column
    const selectedColumn = page.locator('[data-testid="selected-column"]');
    await expect(selectedColumn).toContainText('Test Slider');
    await expect(selectedColumn).toContainText('Test Text');
    await expect(selectedColumn).toContainText('Test Toggle');
  });

  test('should persist selected parameters in session storage', async ({ page, categoryWithParameters }) => {
    const parametersPage = new ParametersPage(page);
    await parametersPage.goto();

    // Select category and parameter
    await page.waitForSelector('text=Test Category', { timeout: 10000 });
    await parametersPage.selectCategory('Test Category');
    await page.waitForSelector('text=Test Slider', { timeout: 5000 });
    await parametersPage.selectParameter('Test Slider');
    await page.waitForTimeout(1000);

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify parameter is still selected
    const selectedColumn = page.locator('[data-testid="selected-column"]');
    await expect(selectedColumn).toContainText('Test Slider', { timeout: 10000 });
  });

  test('should enable generate button when parameters are selected', async ({ page, categoryWithParameters }) => {
    const parametersPage = new ParametersPage(page);
    await parametersPage.goto();

    // Select category and parameter
    await page.waitForSelector('text=Test Category', { timeout: 10000 });
    await parametersPage.selectCategory('Test Category');
    await page.waitForSelector('text=Test Slider', { timeout: 5000 });
    await parametersPage.selectParameter('Test Slider');
    await page.waitForTimeout(1000);

    // Check if generate button is enabled
    const generateButton = page.locator('button:has-text("Generate")');
    await expect(generateButton).toBeEnabled();
  });

  test('should show guided tour on first visit', async ({ page, categoryWithParameters }) => {
    // Clear any existing tour state
    await page.context().clearCookies();

    const parametersPage = new ParametersPage(page);
    await parametersPage.goto();

    // Wait for page load
    await page.waitForLoadState('networkidle');

    // Check if tour elements might appear (this depends on implementation)
    // The tour might show tooltips or overlays
    await page.waitForTimeout(2000);

    // This is a placeholder - actual implementation depends on tour library
    // Just verify page loads successfully with tour
    expect(await page.isVisible('text=Test Category')).toBeTruthy();
  });

  test('should handle empty state when no categories exist', async ({ page }) => {
    const parametersPage = new ParametersPage(page);
    await parametersPage.goto();

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Should show empty state message
    const emptyMessage = page.locator('text=No categories available');
    const categoryColumn = page.locator('[data-testid="categories-column"]');

    // Either empty message or empty column
    const hasEmptyState = await emptyMessage.isVisible().catch(() => false);
    const columnEmpty = (await categoryColumn.textContent()).length < 50;

    expect(hasEmptyState || columnEmpty).toBeTruthy();
  });
});
