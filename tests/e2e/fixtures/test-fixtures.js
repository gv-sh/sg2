/**
 * Test fixtures for E2E tests
 * Provides reusable test data and setup
 */

import { test as base } from '@playwright/test';
import {
  createCategory,
  createParameter,
  cleanupTestData,
  waitForServer
} from '../utils/api-helpers.js';

/**
 * Extended test with custom fixtures
 * Uses unique names to avoid conflicts - no cleanup needed
 */
export const test = base.extend({
  // Create a test category (generates unique name using timestamp + random)
  testCategory: async ({}, use) => {
    const uniqueId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const category = await createCategory({
      name: `Test Category ${uniqueId}`,
      description: 'Category for testing',
      is_visible: true,
      sort_order: 0
    });
    await use(category.data);
  },

  // Create a test category with parameters (generates unique name using timestamp + random)
  categoryWithParameters: async ({}, use) => {
    const uniqueId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const category = await createCategory({
      name: `Test Category ${uniqueId}`,
      description: 'Category for testing',
      is_visible: true,
      sort_order: 0
    });

    const sliderParam = await createParameter({
      category_id: category.data.id,
      name: 'Test Slider',
      description: 'A test slider parameter',
      type: 'slider',
      min: 0,
      max: 100,
      step: 1,
      default_value: 50,
      is_required: false,
      sort_order: 0
    });

    const textParam = await createParameter({
      category_id: category.data.id,
      name: 'Test Text',
      description: 'A test text parameter',
      type: 'text',
      default_value: 'Test value',
      is_required: false,
      sort_order: 1
    });

    const toggleParam = await createParameter({
      category_id: category.data.id,
      name: 'Test Toggle',
      description: 'A test toggle parameter',
      type: 'toggle',
      default_value: 'false',
      is_required: false,
      sort_order: 2
    });

    await use({
      category: category.data,
      parameters: [sliderParam.data, textParam.data, toggleParam.data]
    });
  }
});

export { expect } from '@playwright/test';

/**
 * Common test data
 */
export const testData = {
  categories: [
    {
      name: 'Fiction',
      description: 'Fiction generation category',
      is_visible: true,
      sort_order: 0
    },
    {
      name: 'Poetry',
      description: 'Poetry generation category',
      is_visible: true,
      sort_order: 1
    },
    {
      name: 'Science',
      description: 'Science fiction category',
      is_visible: true,
      sort_order: 2
    }
  ],

  parameters: {
    slider: {
      name: 'Word Count',
      description: 'Number of words in the story',
      type: 'slider',
      min: 100,
      max: 1000,
      step: 50,
      default_value: 500,
      is_required: false
    },
    text: {
      name: 'Theme',
      description: 'Theme of the story',
      type: 'text',
      default_value: 'Adventure',
      is_required: false
    },
    toggle: {
      name: 'Include Image',
      description: 'Whether to generate an image',
      type: 'toggle',
      default_value: 'true',
      is_required: false
    },
    select: {
      name: 'Tone',
      description: 'Tone of the story',
      type: 'select',
      default_value: 'dramatic',
      is_required: false,
      parameter_values: [
        { value: 'dramatic', label: 'Dramatic' },
        { value: 'humorous', label: 'Humorous' },
        { value: 'serious', label: 'Serious' }
      ]
    },
    number: {
      name: 'Characters',
      description: 'Number of characters',
      type: 'number',
      min: 1,
      max: 10,
      default_value: 3,
      is_required: false
    }
  },

  content: {
    fiction: {
      category_id: 1,
      content_type: 'fiction',
      title: 'Test Story',
      content: 'This is a test story generated for testing purposes.',
      metadata: {
        theme: 'Adventure',
        wordCount: 500
      }
    }
  }
};

/**
 * Helper function to wait for element with custom timeout
 */
export async function waitForElement(page, selector, timeout = 5000) {
  return await page.waitForSelector(selector, {
    state: 'visible',
    timeout
  });
}

/**
 * Helper function to wait for navigation
 */
export async function waitForNavigation(page, url) {
  return await page.waitForURL(url);
}

/**
 * Helper to take a screenshot with timestamp
 */
export async function takeScreenshot(page, name) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await page.screenshot({
    path: `playwright-report/screenshots/${name}-${timestamp}.png`,
    fullPage: true
  });
}

/**
 * Helper to verify API response
 */
export async function verifyAPIResponse(response, expectedStatus = 200) {
  if (response.status !== expectedStatus) {
    throw new Error(
      `API request failed with status ${response.status}. Expected ${expectedStatus}`
    );
  }
  return response;
}
