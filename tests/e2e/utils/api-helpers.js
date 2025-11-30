/**
 * API helper functions for E2E tests
 * Provides utilities for interacting with the backend API
 */

const API_BASE_URL = 'http://localhost:3000';

/**
 * Initialize database with clean state
 */
export async function initializeDatabase() {
  const response = await fetch(`${API_BASE_URL}/api/system/database/init`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  return response.json();
}

/**
 * Create a test category
 */
export async function createCategory(data) {
  const response = await fetch(`${API_BASE_URL}/api/admin/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: data.name || 'Test Category',
      description: data.description || 'A test category',
      is_visible: data.is_visible !== undefined ? data.is_visible : true,
      sort_order: data.sort_order || 0
    })
  });
  return response.json();
}

/**
 * Create a test parameter
 */
export async function createParameter(data) {
  const response = await fetch(`${API_BASE_URL}/api/admin/parameters`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      category_id: data.category_id,
      name: data.name || 'Test Parameter',
      description: data.description || 'A test parameter',
      type: data.type || 'text',
      min: data.min,
      max: data.max,
      step: data.step,
      default_value: data.default_value,
      is_required: data.is_required !== undefined ? data.is_required : false,
      sort_order: data.sort_order || 0,
      parameter_values: data.parameter_values || []
    })
  });
  return response.json();
}

/**
 * Delete a category
 */
export async function deleteCategory(id) {
  const response = await fetch(`${API_BASE_URL}/api/admin/categories/${id}`, {
    method: 'DELETE'
  });
  return response.ok;
}

/**
 * Delete a parameter
 */
export async function deleteParameter(id) {
  const response = await fetch(`${API_BASE_URL}/api/admin/parameters/${id}`, {
    method: 'DELETE'
  });
  return response.ok;
}

/**
 * Get all categories
 */
export async function getCategories() {
  const response = await fetch(`${API_BASE_URL}/api/admin/categories`);
  return response.json();
}

/**
 * Get all parameters
 */
export async function getParameters() {
  const response = await fetch(`${API_BASE_URL}/api/admin/parameters`);
  return response.json();
}

/**
 * Get all content
 */
export async function getContent() {
  const response = await fetch(`${API_BASE_URL}/api/content`);
  return response.json();
}

/**
 * Delete content by ID
 */
export async function deleteContent(id) {
  const response = await fetch(`${API_BASE_URL}/api/content/${id}`, {
    method: 'DELETE'
  });
  return response.ok;
}

/**
 * Generate content
 */
export async function generateContent(data) {
  const response = await fetch(`${API_BASE_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return response.json();
}

/**
 * Get server health status
 */
export async function getHealthStatus() {
  const response = await fetch(`${API_BASE_URL}/api/system/health`);
  return response.json();
}

/**
 * Wait for server to be ready
 */
export async function waitForServer(maxAttempts = 30, interval = 1000) {
  console.log(`Waiting for server... (max ${maxAttempts} attempts)`);
  
  for (let i = 0; i < maxAttempts; i++) {
    try {
      // Check the ping endpoint that admin UI uses
      const pingResponse = await fetch(`${API_BASE_URL}/api/health/ping`);
      if (pingResponse.ok) {
        const pingData = await pingResponse.json();
        if (pingData.message === 'pong') {
          console.log(`Server ready after ${i + 1} attempts`);
          return true;
        }
      }
      
      // Fallback to system health check
      const healthResponse = await fetch(`${API_BASE_URL}/api/system/health`);
      if (healthResponse.ok) {
        const health = await healthResponse.json();
        if (health.success || health.data?.status === 'ok') {
          console.log(`Server ready after ${i + 1} attempts`);
          return true;
        }
      }
    } catch (error) {
      // Server not ready yet, continue trying
      if (i % 5 === 0) {
        console.log(`Attempt ${i + 1}/${maxAttempts} - Server not ready yet...`);
      }
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  throw new Error(`Server failed to start after ${maxAttempts} attempts`);
}

/**
 * Clean up all test data
 */
export async function cleanupTestData() {
  // Get all content and delete
  const content = await getContent();
  if (content.data) {
    for (const item of content.data) {
      await deleteContent(item.id);
    }
  }

  // Get all parameters and delete
  const parameters = await getParameters();
  if (parameters.data) {
    for (const param of parameters.data) {
      await deleteParameter(param.id);
    }
  }

  // Get all categories and delete
  const categories = await getCategories();
  if (categories.data) {
    for (const category of categories.data) {
      await deleteCategory(category.id);
    }
  }
}
