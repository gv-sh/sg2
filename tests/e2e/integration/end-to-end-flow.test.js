/**
 * End-to-End Integration Tests
 * Tests complete workflows from admin setup to user content generation
 */

import { test, expect } from '../fixtures/test-fixtures.js';
import {
  AdminCategoriesPage,
  AdminParametersPage,
  ParametersPage,
  GeneratingPage,
  StoryPage,
  LibraryPage
} from '../utils/page-objects.js';

test.describe('End-to-End Integration Flow', () => {
  test('complete flow: admin creates category and parameters, user generates content', async ({ browser }) => {
    // Create two separate browser contexts for admin and user
    const adminContext = await browser.newContext();
    const userContext = await browser.newContext();

    const adminPage = await adminContext.newPage();
    const userPage = await userContext.newPage();

    try {
      // === ADMIN FLOW ===

      // 1. Admin creates a category
      const adminCategoriesPage = new AdminCategoriesPage(adminPage);
      await adminCategoriesPage.goto();
      await adminPage.waitForLoadState('networkidle');

      // Click add category
      const addCategoryBtn = adminPage.locator('button:has-text("Add"), button:has-text("New"), button:has-text("Create")').first();
      await addCategoryBtn.click();

      // Fill category form
      await adminPage.fill('input[name="name"], input[placeholder*="name" i]', 'E2E Fiction');
      await adminPage.fill('textarea[name="description"], textarea[placeholder*="description" i]', 'Category for E2E testing');
      await adminPage.fill('input[name="year"], input[type="number"]', '2025');

      // Submit
      const submitCategoryBtn = adminPage.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")');
      await submitCategoryBtn.first().click();
      await adminPage.waitForTimeout(1500);

      // Verify category was created
      await adminPage.waitForSelector('text=E2E Fiction', { timeout: 5000 });
      expect(await adminPage.isVisible('text=E2E Fiction')).toBeTruthy();

      // 2. Admin creates parameters for the category
      const adminParametersPage = new AdminParametersPage(adminPage);
      await adminParametersPage.goto();
      await adminPage.waitForLoadState('networkidle');

      // Create a slider parameter
      const addParamBtn = adminPage.locator('button:has-text("Add"), button:has-text("New"), button:has-text("Create")').first();
      await addParamBtn.click();

      await adminPage.fill('input[name="name"], input[placeholder*="name" i]', 'Story Length');
      await adminPage.fill('textarea[name="description"], textarea[placeholder*="description" i]', 'Length of the story');

      // Select type
      const typeSelect = adminPage.locator('select[name="type"]');
      if (await typeSelect.isVisible()) {
        await typeSelect.selectOption('slider');
      }

      // Select the category we just created
      const categorySelect = adminPage.locator('select[name="category_id"], select[name="category"]');
      if (await categorySelect.isVisible()) {
        const options = await categorySelect.locator('option').allTextContents();
        const e2eFictionIndex = options.findIndex(opt => opt.includes('E2E Fiction'));
        if (e2eFictionIndex >= 0) {
          await categorySelect.selectOption({ index: e2eFictionIndex });
        } else {
          await categorySelect.selectOption({ index: 1 });
        }
      }

      // Set min/max for slider
      const minInput = adminPage.locator('input[name="min"]');
      const maxInput = adminPage.locator('input[name="max"]');
      if (await minInput.isVisible()) {
        await minInput.fill('100');
        await maxInput.fill('1000');
      }

      // Submit parameter
      const submitParamBtn = adminPage.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")');
      await submitParamBtn.first().click();
      await adminPage.waitForTimeout(1500);

      // Verify parameter was created
      await adminPage.waitForSelector('text=Story Length', { timeout: 5000 });
      expect(await adminPage.isVisible('text=Story Length')).toBeTruthy();

      // Create a text parameter
      await adminPage.click('button:has-text("Add"), button:has-text("New"), button:has-text("Create")');

      await adminPage.fill('input[name="name"], input[placeholder*="name" i]', 'Theme');
      await adminPage.fill('textarea[name="description"], textarea[placeholder*="description" i]', 'Story theme');

      const typeSelect2 = adminPage.locator('select[name="type"]');
      if (await typeSelect2.isVisible()) {
        await typeSelect2.selectOption('text');
      }

      const categorySelect2 = adminPage.locator('select[name="category_id"], select[name="category"]');
      if (await categorySelect2.isVisible()) {
        const options = await categorySelect2.locator('option').allTextContents();
        const e2eFictionIndex = options.findIndex(opt => opt.includes('E2E Fiction'));
        if (e2eFictionIndex >= 0) {
          await categorySelect2.selectOption({ index: e2eFictionIndex });
        } else {
          await categorySelect2.selectOption({ index: 1 });
        }
      }

      const submitParamBtn2 = adminPage.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")');
      await submitParamBtn2.first().click();
      await adminPage.waitForTimeout(1500);

      // === USER FLOW ===

      // 3. User navigates to parameters page
      const parametersPage = new ParametersPage(userPage);
      await parametersPage.goto();
      await userPage.waitForLoadState('networkidle');

      // 4. User selects the category created by admin
      await userPage.waitForSelector('text=E2E Fiction', { timeout: 10000 });
      await parametersPage.selectCategory('E2E Fiction');

      // 5. User selects parameters
      await userPage.waitForSelector('text=Story Length', { timeout: 5000 });
      await parametersPage.selectParameter('Story Length');
      await userPage.waitForTimeout(500);

      await parametersPage.selectParameter('Theme');
      await userPage.waitForTimeout(1000);

      // 6. User generates content
      await parametersPage.clickGenerate();

      // 7. Wait for generation to complete
      const generatingPage = new GeneratingPage(userPage);
      await userPage.waitForURL(/\/generating/, { timeout: 5000 });
      await generatingPage.waitForGeneration(60000);

      // 8. Verify user lands on story page
      await expect(userPage).toHaveURL(/\/story\?id=/, { timeout: 5000 });

      // 9. Verify story content is displayed
      const storyPage = new StoryPage(userPage);
      const title = await storyPage.getTitle();
      expect(title).toBeTruthy();
      expect(title.length).toBeGreaterThan(0);

      // 10. Navigate to library
      const libraryPage = new LibraryPage(userPage);
      await libraryPage.goto();
      await userPage.waitForLoadState('networkidle');
      await userPage.waitForTimeout(2000);

      // 11. Verify generated story appears in library
      const storyCount = await libraryPage.getStoryCount();
      expect(storyCount).toBeGreaterThanOrEqual(1);

    } finally {
      await adminContext.close();
      await userContext.close();
    }
  });

  test('admin modifies parameter, user sees updated parameter', async ({ browser }) => {
    const adminContext = await browser.newContext();
    const userContext = await browser.newContext();

    const adminPage = await adminContext.newPage();
    const userPage = await userContext.newPage();

    try {
      // Admin creates category and parameter
      const adminCategoriesPage = new AdminCategoriesPage(adminPage);
      await adminCategoriesPage.goto();
      await adminPage.waitForLoadState('networkidle');

      const addCategoryBtn = adminPage.locator('button:has-text("Add"), button:has-text("New"), button:has-text("Create")').first();
      await addCategoryBtn.click();

      await adminPage.fill('input[name="name"], input[placeholder*="name" i]', 'Dynamic Category');
      await adminPage.fill('textarea[name="description"], textarea[placeholder*="description" i]', 'Category for dynamic testing');
      await adminPage.fill('input[name="year"], input[type="number"]', '2025');

      const submitBtn = adminPage.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")');
      await submitBtn.first().click();
      await adminPage.waitForTimeout(1500);

      // Create parameter
      const adminParametersPage = new AdminParametersPage(adminPage);
      await adminParametersPage.goto();
      await adminPage.waitForLoadState('networkidle');

      const addParamBtn = adminPage.locator('button:has-text("Add"), button:has-text("New"), button:has-text("Create")').first();
      await addParamBtn.click();

      await adminPage.fill('input[name="name"], input[placeholder*="name" i]', 'Original Name');
      await adminPage.fill('textarea[name="description"], textarea[placeholder*="description" i]', 'Original description');

      const typeSelect = adminPage.locator('select[name="type"]');
      if (await typeSelect.isVisible()) {
        await typeSelect.selectOption('text');
      }

      const categorySelect = adminPage.locator('select[name="category_id"], select[name="category"]');
      if (await categorySelect.isVisible()) {
        const options = await categorySelect.locator('option').allTextContents();
        const index = options.findIndex(opt => opt.includes('Dynamic Category'));
        if (index >= 0) {
          await categorySelect.selectOption({ index });
        } else {
          await categorySelect.selectOption({ index: 1 });
        }
      }

      const submitParamBtn = adminPage.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")');
      await submitParamBtn.first().click();
      await adminPage.waitForTimeout(1500);

      // Edit the parameter
      const editBtn = adminPage.locator('button:has-text("Edit"), button[aria-label*="Edit"]').first();
      if (await editBtn.isVisible()) {
        await editBtn.click();

        const nameInput = adminPage.locator('input[name="name"], input[placeholder*="name" i]');
        await nameInput.fill('Updated Name');

        const updateBtn = adminPage.locator('button[type="submit"], button:has-text("Save"), button:has-text("Update")');
        await updateBtn.first().click();
        await adminPage.waitForTimeout(1500);
      }

      // User refreshes parameters page
      const parametersPage = new ParametersPage(userPage);
      await parametersPage.goto();
      await userPage.waitForLoadState('networkidle');

      await userPage.waitForSelector('text=Dynamic Category', { timeout: 10000 });
      await parametersPage.selectCategory('Dynamic Category');

      // User should see updated parameter name
      await userPage.waitForTimeout(1000);
      const updatedNameVisible = await userPage.isVisible('text=Updated Name', { timeout: 5000 });
      expect(updatedNameVisible).toBeTruthy();

    } finally {
      await adminContext.close();
      await userContext.close();
    }
  });

  test('admin deletes category, user no longer sees it', async ({ browser }) => {
    const adminContext = await browser.newContext();
    const userContext = await browser.newContext();

    const adminPage = await adminContext.newPage();
    const userPage = await userContext.newPage();

    try {
      // Admin creates category
      const adminCategoriesPage = new AdminCategoriesPage(adminPage);
      await adminCategoriesPage.goto();
      await adminPage.waitForLoadState('networkidle');

      const addBtn = adminPage.locator('button:has-text("Add"), button:has-text("New"), button:has-text("Create")').first();
      await addBtn.click();

      await adminPage.fill('input[name="name"], input[placeholder*="name" i]', 'Temporary Category');
      await adminPage.fill('textarea[name="description"], textarea[placeholder*="description" i]', 'Will be deleted');
      await adminPage.fill('input[name="year"], input[type="number"]', '2025');

      const submitBtn = adminPage.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")');
      await submitBtn.first().click();
      await adminPage.waitForTimeout(1500);

      // User sees the category
      const parametersPage = new ParametersPage(userPage);
      await parametersPage.goto();
      await userPage.waitForLoadState('networkidle');

      const categoryVisibleBefore = await userPage.isVisible('text=Temporary Category', { timeout: 5000 });
      expect(categoryVisibleBefore).toBeTruthy();

      // Admin deletes the category
      await adminCategoriesPage.goto();
      await adminPage.waitForLoadState('networkidle');
      await adminPage.waitForTimeout(1000);

      const deleteBtn = adminPage.locator('button:has-text("Delete"), button[aria-label*="Delete"]').first();
      if (await deleteBtn.isVisible()) {
        await deleteBtn.click();

        const confirmBtn = adminPage.locator('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Delete")');
        if (await confirmBtn.first().isVisible({ timeout: 2000 })) {
          await confirmBtn.first().click();
        }

        await adminPage.waitForTimeout(1500);
      }

      // User refreshes and should not see the category
      await userPage.reload();
      await userPage.waitForLoadState('networkidle');
      await userPage.waitForTimeout(1000);

      const categoryVisibleAfter = await userPage.isVisible('text=Temporary Category', { timeout: 2000 }).catch(() => false);
      expect(categoryVisibleAfter).toBeFalsy();

    } finally {
      await adminContext.close();
      await userContext.close();
    }
  });
});
