import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for SpecGen E2E tests
 * Tests run against three applications:
 * - Server API: http://localhost:3000
 * - Admin Dashboard: http://localhost:3001
 * - User Interface: http://localhost:3002
 */
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/tests/e2e/**/*.test.js',
  testIgnore: ['**/src/**', '**/admin/src/**', '**/user/src/**', '**/node_modules/**'],
  
  // Global setup - temporarily disabled
  // globalSetup: './tests/e2e/global-setup.js',

  // Maximum time one test can run
  timeout: 60 * 1000,

  // Test execution settings
  fullyParallel: false, // Run tests sequentially to avoid conflicts
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 1,

  // Reporter configuration
  reporter: [
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['list'],
    ['json', { outputFile: 'playwright-report/test-results.json' }]
  ],

  // Shared settings for all tests
  use: {
    // Base URL for tests
    baseURL: 'http://localhost:3000',

    // Collect trace on test failure
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',

    // Browser context options
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,

    // Action timeout
    actionTimeout: 10 * 1000,

    // Navigation timeout
    navigationTimeout: 30 * 1000,
  },

  // Configure projects for different test scenarios
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Web server configuration  
  webServer: {
    command: 'cd server && NODE_ENV=test node server.js',
    url: 'http://localhost:3000/api/health/ping',
    timeout: 30 * 1000,
    reuseExistingServer: true,
  },
});
