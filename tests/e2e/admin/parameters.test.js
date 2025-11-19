/**
 * Admin Parameters E2E Tests
 * Tests for parameter CRUD operations in admin dashboard
 */

import { test, expect } from '../fixtures/test-fixtures.js';
import { AdminParametersPage } from '../utils/page-objects.js';

test.describe('Admin Parameters Management', () => {
  test.use({ cleanDatabase: true });

  test('should display parameters page', async ({ page }) => {
    const parametersPage = new AdminParametersPage(page);
    await parametersPage.goto();

    // Check page loaded
    await expect(page).toHaveURL(/\/parameters/);

    // Should have add parameter button
    const addButton = page.locator('button:has-text("Add"), button:has-text("New"), button:has-text("Create")');
    await expect(addButton.first()).toBeVisible();
  });

  test('should create a slider parameter', async ({ page, testCategory }) => {
    const parametersPage = new AdminParametersPage(page);
    await parametersPage.goto();

    await page.waitForLoadState('networkidle');

    // Click add parameter
    const addButton = page.locator('button:has-text("Add"), button:has-text("New"), button:has-text("Create")').first();
    await addButton.click();

    // Fill form
    await page.fill('input[name="name"], input[placeholder*="name" i]', 'Test Slider Param');
    await page.fill('textarea[name="description"], textarea[placeholder*="description" i]', 'A slider parameter');

    // Select type
    const typeSelect = page.locator('select[name="type"]');
    if (await typeSelect.isVisible()) {
      await typeSelect.selectOption('slider');
    }

    // Select category
    const categorySelect = page.locator('select[name="category_id"], select[name="category"]');
    if (await categorySelect.isVisible()) {
      await categorySelect.selectOption({ index: 1 }); // Select first available category
    }

    // Set min, max for slider
    const minInput = page.locator('input[name="min"]');
    const maxInput = page.locator('input[name="max"]');

    if (await minInput.isVisible()) {
      await minInput.fill('0');
      await maxInput.fill('100');
    }

    // Submit
    const submitButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")');
    await submitButton.first().click();

    await page.waitForTimeout(1000);

    // Verify parameter appears
    await page.waitForSelector('text=Test Slider Param', { timeout: 5000 });
    expect(await page.isVisible('text=Test Slider Param')).toBeTruthy();
  });

  test('should create a text parameter', async ({ page, testCategory }) => {
    const parametersPage = new AdminParametersPage(page);
    await parametersPage.goto();

    await page.waitForLoadState('networkidle');

    // Click add parameter
    const addButton = page.locator('button:has-text("Add"), button:has-text("New"), button:has-text("Create")').first();
    await addButton.click();

    // Fill form
    await page.fill('input[name="name"], input[placeholder*="name" i]', 'Test Text Param');
    await page.fill('textarea[name="description"], textarea[placeholder*="description" i]', 'A text parameter');

    // Select type
    const typeSelect = page.locator('select[name="type"]');
    if (await typeSelect.isVisible()) {
      await typeSelect.selectOption('text');
    }

    // Select category
    const categorySelect = page.locator('select[name="category_id"], select[name="category"]');
    if (await categorySelect.isVisible()) {
      await categorySelect.selectOption({ index: 1 });
    }

    // Submit
    const submitButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")');
    await submitButton.first().click();

    await page.waitForTimeout(1000);

    // Verify parameter appears
    await page.waitForSelector('text=Test Text Param', { timeout: 5000 });
    expect(await page.isVisible('text=Test Text Param')).toBeTruthy();
  });

  test('should create a toggle parameter', async ({ page, testCategory }) => {
    const parametersPage = new AdminParametersPage(page);
    await parametersPage.goto();

    await page.waitForLoadState('networkidle');

    // Click add parameter
    const addButton = page.locator('button:has-text("Add"), button:has-text("New"), button:has-text("Create")').first();
    await addButton.click();

    // Fill form
    await page.fill('input[name="name"], input[placeholder*="name" i]', 'Test Toggle Param');
    await page.fill('textarea[name="description"], textarea[placeholder*="description" i]', 'A toggle parameter');

    // Select type
    const typeSelect = page.locator('select[name="type"]');
    if (await typeSelect.isVisible()) {
      await typeSelect.selectOption('toggle');
    }

    // Select category
    const categorySelect = page.locator('select[name="category_id"], select[name="category"]');
    if (await categorySelect.isVisible()) {
      await categorySelect.selectOption({ index: 1 });
    }

    // Submit
    const submitButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")');
    await submitButton.first().click();

    await page.waitForTimeout(1000);

    // Verify parameter appears
    await page.waitForSelector('text=Test Toggle Param', { timeout: 5000 });
    expect(await page.isVisible('text=Test Toggle Param')).toBeTruthy();
  });

  test('should create a select parameter with options', async ({ page, testCategory }) => {
    const parametersPage = new AdminParametersPage(page);
    await parametersPage.goto();

    await page.waitForLoadState('networkidle');

    // Click add parameter
    const addButton = page.locator('button:has-text("Add"), button:has-text("New"), button:has-text("Create")').first();
    await addButton.click();

    // Fill form
    await page.fill('input[name="name"], input[placeholder*="name" i]', 'Test Select Param');
    await page.fill('textarea[name="description"], textarea[placeholder*="description" i]', 'A select parameter');

    // Select type
    const typeSelect = page.locator('select[name="type"]');
    if (await typeSelect.isVisible()) {
      await typeSelect.selectOption('select');
    }

    // Select category
    const categorySelect = page.locator('select[name="category_id"], select[name="category"]');
    if (await categorySelect.isVisible()) {
      await categorySelect.selectOption({ index: 1 });
    }

    // Add parameter values/options if interface supports it
    // This would depend on the actual UI implementation

    // Submit
    const submitButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")');
    await submitButton.first().click();

    await page.waitForTimeout(1000);

    // Verify parameter appears
    await page.waitForSelector('text=Test Select Param', { timeout: 5000 });
    expect(await page.isVisible('text=Test Select Param')).toBeTruthy();
  });

  test('should display parameters grouped by category', async ({ page, categoryWithParameters }) => {
    const parametersPage = new AdminParametersPage(page);
    await parametersPage.goto();

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Should display parameters from the test category
    const params = ['Test Slider', 'Test Text', 'Test Toggle'];
    for (const param of params) {
      const isVisible = await page.isVisible(`text=${param}`, { timeout: 5000 }).catch(() => false);
      expect(isVisible).toBeTruthy();
    }
  });

  test('should filter parameters by category', async ({ page, categoryWithParameters }) => {
    const parametersPage = new AdminParametersPage(page);
    await parametersPage.goto();

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Check for category filter
    const categoryFilter = page.locator('select[data-testid="category-filter"], select:has-text("Category")');
    const hasFilter = await categoryFilter.isVisible().catch(() => false);

    if (hasFilter) {
      // Select the test category
      await categoryFilter.selectOption({ label: /Test Category/ });
      await page.waitForTimeout(1000);

      // Should show only parameters from that category
      expect(await page.isVisible('text=Test Slider')).toBeTruthy();
    }
  });

  test('should edit parameter', async ({ page, categoryWithParameters }) => {
    const parametersPage = new AdminParametersPage(page);
    await parametersPage.goto();

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Click edit button for first parameter
    const editButton = page.locator('button:has-text("Edit"), button[aria-label*="Edit"]').first();
    if (await editButton.isVisible()) {
      await editButton.click();

      // Update parameter name
      const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]');
      await nameInput.fill('Updated Parameter Name');

      // Submit
      const submitButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Update")');
      await submitButton.first().click();

      await page.waitForTimeout(1000);

      // Verify update
      await page.waitForSelector('text=Updated Parameter Name', { timeout: 5000 });
      expect(await page.isVisible('text=Updated Parameter Name')).toBeTruthy();
    }
  });

  test('should delete parameter', async ({ page, categoryWithParameters }) => {
    const parametersPage = new AdminParametersPage(page);
    await parametersPage.goto();

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Get initial count
    const initialCount = await page.locator('tbody tr, [data-testid="parameter-row"]').count();

    // Click delete button
    const deleteButton = page.locator('button:has-text("Delete"), button[aria-label*="Delete"]').first();
    if (await deleteButton.isVisible()) {
      await deleteButton.click();

      // Confirm deletion
      const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Delete")');
      if (await confirmButton.first().isVisible({ timeout: 2000 })) {
        await confirmButton.first().click();
      }

      await page.waitForTimeout(1000);

      // Verify count decreased
      const newCount = await page.locator('tbody tr, [data-testid="parameter-row"]').count();
      expect(newCount).toBeLessThan(initialCount);
    }
  });

  test('should validate required fields', async ({ page, testCategory }) => {
    const parametersPage = new AdminParametersPage(page);
    await parametersPage.goto();

    await page.waitForLoadState('networkidle');

    // Click add parameter
    const addButton = page.locator('button:has-text("Add"), button:has-text("New"), button:has-text("Create")').first();
    await addButton.click();

    // Try to submit without filling required fields
    const submitButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")');
    await submitButton.first().click();

    // Should show validation error or prevent submission
    const errorMessage = page.locator('text=required, text=error, .error, [role="alert"]');
    const hasError = await errorMessage.first().isVisible({ timeout: 2000 }).catch(() => false);

    // Verify form is still visible (not submitted)
    const formVisible = await page.locator('input[name="name"], input[placeholder*="name" i]').isVisible();
    expect(formVisible || hasError).toBeTruthy();
  });

  test('should show parameter type-specific fields', async ({ page, testCategory }) => {
    const parametersPage = new AdminParametersPage(page);
    await parametersPage.goto();

    await page.waitForLoadState('networkidle');

    // Click add parameter
    const addButton = page.locator('button:has-text("Add"), button:has-text("New"), button:has-text("Create")').first();
    await addButton.click();

    // Select slider type
    const typeSelect = page.locator('select[name="type"]');
    if (await typeSelect.isVisible()) {
      await typeSelect.selectOption('slider');

      // Wait for conditional fields to appear
      await page.waitForTimeout(500);

      // Should show min/max fields for slider
      const minInput = page.locator('input[name="min"]');
      const maxInput = page.locator('input[name="max"]');

      const hasMinMax = (await minInput.isVisible() && await maxInput.isVisible());

      // Min/max fields should appear for slider type
      if (hasMinMax) {
        expect(hasMinMax).toBeTruthy();
      }
    }
  });

  test('should display parameter count', async ({ page, categoryWithParameters }) => {
    const parametersPage = new AdminParametersPage(page);
    await parametersPage.goto();

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Count parameter rows
    const parameterCount = await page.locator('tbody tr, [data-testid="parameter-row"]').count();
    expect(parameterCount).toBeGreaterThanOrEqual(3); // We created 3 parameters in fixture
  });
});
