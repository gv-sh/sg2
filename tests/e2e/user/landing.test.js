/**
 * Landing Page E2E Tests
 * Tests for the user interface landing page
 */

import { test, expect } from '../fixtures/test-fixtures.js';
import { LandingPage } from '../utils/page-objects.js';

test.describe('Landing Page', () => {
  test('should display landing page with title', async ({ page }) => {
    const landingPage = new LandingPage(page);
    await landingPage.goto();

    // Check if the page loaded
    await expect(page).toHaveTitle(/SpecGen/);

    // Check for main heading
    const isVisible = await landingPage.isVisible();
    expect(isVisible).toBeTruthy();
  });

  test('should navigate to parameters page when clicking Get Started', async ({ page }) => {
    const landingPage = new LandingPage(page);
    await landingPage.goto();

    // Wait for page to fully load
    await page.waitForLoadState('networkidle');

    // Click Get Started button
    await landingPage.clickGetStarted();

    // Should navigate to parameters page
    await expect(page).toHaveURL(/\/parameters/);
  });

  test('should display 3D particle effects', async ({ page }) => {
    const landingPage = new LandingPage(page);
    await landingPage.goto();

    // Wait for canvas element (Three.js renders to canvas)
    await page.waitForSelector('canvas', { timeout: 10000 });

    // Verify canvas is visible
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
  });

  test('should be responsive to viewport changes', async ({ page }) => {
    const landingPage = new LandingPage(page);

    // Test desktop view
    await page.setViewportSize({ width: 1920, height: 1080 });
    await landingPage.goto();
    await expect(page.locator('text=SpecGen')).toBeVisible();

    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    await expect(page.locator('text=SpecGen')).toBeVisible();
  });

  test('should load within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    const landingPage = new LandingPage(page);
    await landingPage.goto();
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    // Page should load in less than 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });
});
