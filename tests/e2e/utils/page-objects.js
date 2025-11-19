/**
 * Page Object Models for E2E tests
 * Provides reusable page interaction methods
 */

/**
 * Landing Page
 */
export class LandingPage {
  constructor(page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto('http://localhost:3002/');
  }

  async clickGetStarted() {
    await this.page.click('text=Get Started');
  }

  async isVisible() {
    return await this.page.isVisible('text=SpecGen');
  }
}

/**
 * Parameters Page
 */
export class ParametersPage {
  constructor(page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto('http://localhost:3002/parameters');
  }

  async selectCategory(categoryName) {
    await this.page.click(`text="${categoryName}"`);
  }

  async selectParameter(parameterName) {
    // Wait for the parameter to be visible and clickable
    await this.page.waitForSelector(`text="${parameterName}"`, { state: 'visible' });
    await this.page.click(`text="${parameterName}"`);
  }

  async setSliderValue(parameterName, value) {
    const slider = this.page.locator(`input[type="range"]`).filter({ hasText: parameterName });
    await slider.fill(value.toString());
  }

  async setTextValue(label, value) {
    await this.page.fill(`input[type="text"]`, value);
  }

  async toggleParameter(parameterName) {
    await this.page.click(`button:has-text("${parameterName}")`);
  }

  async clickGenerate() {
    await this.page.click('button:has-text("Generate")');
  }

  async removeParameter(parameterName) {
    // Click the X button next to the parameter
    await this.page.click(`button[aria-label="Remove ${parameterName}"]`);
  }

  async clearAll() {
    await this.page.click('button:has-text("Clear All")');
  }

  async getSelectedParametersCount() {
    const elements = await this.page.locator('[data-testid="selected-parameter"]').count();
    return elements;
  }

  async isParameterSelected(parameterName) {
    return await this.page.isVisible(`text="${parameterName}"`);
  }
}

/**
 * Generating Page
 */
export class GeneratingPage {
  constructor(page) {
    this.page = page;
  }

  async waitForGeneration(timeout = 30000) {
    // Wait for the generation to complete and redirect to story page
    await this.page.waitForURL(/\/story\?id=/, { timeout });
  }

  async isGenerating() {
    return await this.page.isVisible('text=Generating');
  }
}

/**
 * Story Page
 */
export class StoryPage {
  constructor(page) {
    this.page = page;
  }

  async goto(storyId) {
    await this.page.goto(`http://localhost:3002/story?id=${storyId}`);
  }

  async getTitle() {
    return await this.page.textContent('h1');
  }

  async getContent() {
    return await this.page.textContent('[data-testid="story-content"]');
  }

  async exportToPDF() {
    await this.page.click('button:has-text("Export PDF")');
  }

  async hasImage() {
    return await this.page.isVisible('img[alt*="story"]');
  }

  async clickBackToLibrary() {
    await this.page.click('text=Back to Library');
  }
}

/**
 * Library Page
 */
export class LibraryPage {
  constructor(page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto('http://localhost:3002/library');
  }

  async getStoryCards() {
    return await this.page.locator('[data-testid="story-card"]').all();
  }

  async getStoryCount() {
    return await this.page.locator('[data-testid="story-card"]').count();
  }

  async clickStoryCard(index = 0) {
    const cards = await this.getStoryCards();
    if (cards[index]) {
      await cards[index].click();
    }
  }

  async filterByYear(year) {
    await this.page.selectOption('select[data-testid="year-filter"]', year.toString());
  }

  async hasStories() {
    return (await this.getStoryCount()) > 0;
  }

  async searchStories(query) {
    await this.page.fill('input[type="search"]', query);
  }
}

/**
 * Admin Dashboard Home
 */
export class AdminDashboardPage {
  constructor(page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto('http://localhost:3001/');
  }

  async navigateToCategories() {
    await this.page.click('text=Categories');
  }

  async navigateToParameters() {
    await this.page.click('text=Parameters');
  }

  async navigateToContent() {
    await this.page.click('text=Content');
  }

  async navigateToSettings() {
    await this.page.click('text=Settings');
  }

  async isServerOnline() {
    return await this.page.isVisible('text=Server: Online');
  }
}

/**
 * Admin Categories Page
 */
export class AdminCategoriesPage {
  constructor(page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto('http://localhost:3001/categories');
  }

  async clickAddCategory() {
    await this.page.click('button:has-text("Add Category")');
  }

  async fillCategoryForm(data) {
    if (data.name) {
      await this.page.fill('input[name="name"]', data.name);
    }
    if (data.description) {
      await this.page.fill('textarea[name="description"]', data.description);
    }
    if (data.year) {
      await this.page.fill('input[name="year"]', data.year.toString());
    }
    if (data.is_visible !== undefined) {
      const checkbox = this.page.locator('input[name="is_visible"]');
      const isChecked = await checkbox.isChecked();
      if (isChecked !== data.is_visible) {
        await checkbox.click();
      }
    }
  }

  async submitForm() {
    await this.page.click('button[type="submit"]');
  }

  async editCategory(categoryName) {
    await this.page.click(`tr:has-text("${categoryName}") button:has-text("Edit")`);
  }

  async deleteCategory(categoryName) {
    await this.page.click(`tr:has-text("${categoryName}") button:has-text("Delete")`);
  }

  async confirmDelete() {
    await this.page.click('button:has-text("Confirm")');
  }

  async getCategoryCount() {
    return await this.page.locator('tbody tr').count();
  }

  async isCategoryVisible(categoryName) {
    return await this.page.isVisible(`text="${categoryName}"`);
  }
}

/**
 * Admin Parameters Page
 */
export class AdminParametersPage {
  constructor(page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto('http://localhost:3001/parameters');
  }

  async clickAddParameter() {
    await this.page.click('button:has-text("Add Parameter")');
  }

  async fillParameterForm(data) {
    if (data.name) {
      await this.page.fill('input[name="name"]', data.name);
    }
    if (data.description) {
      await this.page.fill('textarea[name="description"]', data.description);
    }
    if (data.type) {
      await this.page.selectOption('select[name="type"]', data.type);
    }
    if (data.category_id) {
      await this.page.selectOption('select[name="category_id"]', data.category_id.toString());
    }
    if (data.min !== undefined) {
      await this.page.fill('input[name="min"]', data.min.toString());
    }
    if (data.max !== undefined) {
      await this.page.fill('input[name="max"]', data.max.toString());
    }
    if (data.default_value !== undefined) {
      await this.page.fill('input[name="default_value"]', data.default_value.toString());
    }
  }

  async submitForm() {
    await this.page.click('button[type="submit"]');
  }

  async editParameter(parameterName) {
    await this.page.click(`tr:has-text("${parameterName}") button:has-text("Edit")`);
  }

  async deleteParameter(parameterName) {
    await this.page.click(`tr:has-text("${parameterName}") button:has-text("Delete")`);
  }

  async confirmDelete() {
    await this.page.click('button:has-text("Confirm")');
  }

  async filterByCategory(categoryName) {
    await this.page.selectOption('select[data-testid="category-filter"]', categoryName);
  }

  async getParameterCount() {
    return await this.page.locator('tbody tr').count();
  }

  async isParameterVisible(parameterName) {
    return await this.page.isVisible(`text="${parameterName}"`);
  }
}

/**
 * Admin Content Page
 */
export class AdminContentPage {
  constructor(page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto('http://localhost:3001/content');
  }

  async getContentCount() {
    return await this.page.locator('[data-testid="content-item"]').count();
  }

  async viewContent(title) {
    await this.page.click(`text="${title}"`);
  }

  async deleteContent(title) {
    await this.page.click(`tr:has-text("${title}") button:has-text("Delete")`);
  }

  async confirmDelete() {
    await this.page.click('button:has-text("Confirm")');
  }
}
