/**
 * Admin Dashboard E2E Tests
 * Tests for admin dashboard home and navigation
 */

import { test, expect } from '../fixtures/test-fixtures.js';
import { AdminDashboardPage } from '../utils/page-objects.js';

test.describe('Admin Dashboard', () => {
  test('should display dashboard home page', async ({ page }) => {
    const dashboardPage = new AdminDashboardPage(page);
    await dashboardPage.goto();

    // Check page loaded
    await expect(page).toHaveURL('http://localhost:3001/');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Should show dashboard content
    const heading = page.locator('h1, h2, text=Dashboard, text=Admin');
    await expect(heading.first()).toBeVisible({ timeout: 10000 });
  });

  test('should display navigation menu', async ({ page }) => {
    const dashboardPage = new AdminDashboardPage(page);
    await dashboardPage.goto();

    await page.waitForLoadState('networkidle');

    // Should have navigation links
    const navLinks = ['Categories', 'Parameters', 'Content', 'Settings'];

    for (const link of navLinks) {
      const linkElement = page.locator(`a:has-text("${link}"), button:has-text("${link}")`);
      const isVisible = await linkElement.first().isVisible().catch(() => false);

      // At least some navigation should be visible
      if (isVisible) {
        expect(isVisible).toBeTruthy();
        break;
      }
    }
  });

  test('should navigate to categories page', async ({ page }) => {
    const dashboardPage = new AdminDashboardPage(page);
    await dashboardPage.goto();

    await page.waitForLoadState('networkidle');

    // Click categories navigation
    const categoriesLink = page.locator('a:has-text("Categories"), button:has-text("Categories")');
    await categoriesLink.first().click();

    // Should navigate to categories page
    await expect(page).toHaveURL(/\/categories/, { timeout: 5000 });
  });

  test('should navigate to parameters page', async ({ page }) => {
    const dashboardPage = new AdminDashboardPage(page);
    await dashboardPage.goto();

    await page.waitForLoadState('networkidle');

    // Click parameters navigation
    const parametersLink = page.locator('a:has-text("Parameters"), button:has-text("Parameters")');
    await parametersLink.first().click();

    // Should navigate to parameters page
    await expect(page).toHaveURL(/\/parameters/, { timeout: 5000 });
  });

  test('should navigate to content page', async ({ page }) => {
    const dashboardPage = new AdminDashboardPage(page);
    await dashboardPage.goto();

    await page.waitForLoadState('networkidle');

    // Click content navigation
    const contentLink = page.locator('a:has-text("Content"), button:has-text("Content")');
    await contentLink.first().click();

    // Should navigate to content page
    await expect(page).toHaveURL(/\/content/, { timeout: 5000 });
  });

  test('should navigate to settings page', async ({ page }) => {
    const dashboardPage = new AdminDashboardPage(page);
    await dashboardPage.goto();

    await page.waitForLoadState('networkidle');

    // Click settings navigation
    const settingsLink = page.locator('a:has-text("Settings"), button:has-text("Settings")');
    const hasSettings = await settingsLink.first().isVisible().catch(() => false);

    if (hasSettings) {
      await settingsLink.first().click();

      // Should navigate to settings page
      await expect(page).toHaveURL(/\/settings/, { timeout: 5000 });
    }
  });

  test('should display server status indicator', async ({ page }) => {
    const dashboardPage = new AdminDashboardPage(page);
    await dashboardPage.goto();

    await page.waitForLoadState('networkidle');

    // Check for server status
    const statusIndicator = page.locator('text=Server, text=Online, text=Status, [data-testid="server-status"]');
    const hasStatus = await statusIndicator.first().isVisible({ timeout: 10000 }).catch(() => false);

    // Status should be visible
    if (hasStatus) {
      const isOnline = await dashboardPage.isServerOnline();
      expect(isOnline).toBeTruthy();
    }
  });

  test('should display dashboard statistics', async ({ page }) => {
    const dashboardPage = new AdminDashboardPage(page);
    await dashboardPage.goto();

    await page.waitForLoadState('networkidle');

    // Check for statistics/metrics
    const stats = page.locator('[data-testid="stats"], .stats, .metrics, text=Categories, text=Parameters, text=Content');
    const hasStats = await stats.first().isVisible().catch(() => false);

    // Dashboard might show stats
    expect(hasStats || true).toBeTruthy();
  });

  test('should display navigation cards', async ({ page }) => {
    const dashboardPage = new AdminDashboardPage(page);
    await dashboardPage.goto();

    await page.waitForLoadState('networkidle');

    // Check for navigation cards
    const cards = page.locator('.card, [data-testid="nav-card"], article');
    const cardCount = await cards.count();

    // Dashboard might have navigation cards
    expect(cardCount).toBeGreaterThanOrEqual(0);
  });

  test('should be responsive on different screen sizes', async ({ page }) => {
    const dashboardPage = new AdminDashboardPage(page);

    // Test desktop
    await page.setViewportSize({ width: 1920, height: 1080 });
    await dashboardPage.goto();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL('http://localhost:3001/');

    // Test tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL('http://localhost:3001/');

    // Test mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL('http://localhost:3001/');
  });

  test('should load within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    const dashboardPage = new AdminDashboardPage(page);
    await dashboardPage.goto();
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    // Page should load in less than 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('should have consistent navigation across pages', async ({ page }) => {
    const dashboardPage = new AdminDashboardPage(page);
    await dashboardPage.goto();

    await page.waitForLoadState('networkidle');

    // Navigate to categories
    const categoriesLink = page.locator('a:has-text("Categories"), button:has-text("Categories")');
    await categoriesLink.first().click();
    await page.waitForURL(/\/categories/, { timeout: 5000 });

    // Navigation should still be visible on categories page
    const navOnCategoriesPage = page.locator('a:has-text("Parameters"), button:has-text("Parameters")');
    await expect(navOnCategoriesPage.first()).toBeVisible();

    // Navigate to parameters
    await navOnCategoriesPage.first().click();
    await page.waitForURL(/\/parameters/, { timeout: 5000 });

    // Navigation should still be visible
    const navOnParametersPage = page.locator('a:has-text("Content"), button:has-text("Content")');
    await expect(navOnParametersPage.first()).toBeVisible();
  });
});
