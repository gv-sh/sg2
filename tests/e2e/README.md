# Playwright E2E Tests

Comprehensive end-to-end UI tests for the SpecGen application using Playwright.

## Overview

This test suite covers all user-facing flows across three applications:
- **Server API** (http://localhost:3000)
- **Admin Dashboard** (http://localhost:3001)
- **User Interface** (http://localhost:3002)

## Test Structure

```
tests/e2e/
├── fixtures/
│   └── test-fixtures.js       # Reusable test fixtures and setup
├── utils/
│   ├── api-helpers.js         # API utility functions
│   └── page-objects.js        # Page Object Models
├── user/                      # User interface tests
│   ├── landing.test.js        # Landing page tests
│   ├── parameters.test.js     # Parameter selection tests
│   ├── generation.test.js     # Content generation tests
│   ├── story.test.js          # Story viewing tests
│   └── library.test.js        # Library browsing tests
├── admin/                     # Admin dashboard tests
│   ├── dashboard.test.js      # Dashboard navigation tests
│   ├── categories.test.js     # Category CRUD tests
│   ├── parameters.test.js     # Parameter CRUD tests
│   └── content.test.js        # Content management tests
└── integration/               # Integration tests
    ├── end-to-end-flow.test.js # Complete user flows
    └── error-handling.test.js  # Error handling and edge cases
```

## Running Tests

### Run all E2E tests
```bash
npm run test:e2e
```

### Run tests with UI mode (recommended for development)
```bash
npm run test:e2e:ui
```

### Run tests in headed mode (see browser)
```bash
npm run test:e2e:headed
```

### Run tests in debug mode
```bash
npm run test:e2e:debug
```

### Run specific test suites
```bash
# User interface tests only
npm run test:e2e:user

# Admin dashboard tests only
npm run test:e2e:admin

# Integration tests only
npm run test:e2e:integration
```

### View test report
```bash
npm run test:e2e:report
```

### Run all tests (unit + integration + E2E)
```bash
npm run test:all
```

## Test Coverage

### User Interface Tests (tests/e2e/user/)

#### Landing Page
- ✅ Display landing page with title
- ✅ Navigate to parameters page
- ✅ Display 3D particle effects
- ✅ Responsive design
- ✅ Performance (load time)

#### Parameters Page
- ✅ Display three-column layout
- ✅ Display categories
- ✅ Load parameters when category selected
- ✅ Add/remove parameters
- ✅ Modify parameter values (sliders, text, toggles)
- ✅ Add multiple parameters
- ✅ Session persistence
- ✅ Enable generate button
- ✅ Guided tour
- ✅ Empty state handling

#### Generation Flow
- ✅ Complete generation workflow
- ✅ Loading state
- ✅ Redirect after generation
- ✅ Multiple parameters
- ✅ Session recovery on refresh
- ✅ Disable button during generation

#### Story Page
- ✅ Display story title and content
- ✅ Navigate back to library
- ✅ Export PDF functionality
- ✅ Handle invalid story IDs
- ✅ Display metadata
- ✅ Handle images
- ✅ Responsive design
- ✅ Direct URL access

#### Library Page
- ✅ Empty state
- ✅ Display stories
- ✅ Navigate to story details
- ✅ Display thumbnails
- ✅ Display titles and metadata
- ✅ Filter by year
- ✅ Loading states
- ✅ Grid layout
- ✅ Responsive design
- ✅ Pagination
- ✅ Direct URL access

### Admin Dashboard Tests (tests/e2e/admin/)

#### Dashboard
- ✅ Display home page
- ✅ Navigation menu
- ✅ Navigate to all sections
- ✅ Server status indicator
- ✅ Dashboard statistics
- ✅ Navigation cards
- ✅ Responsive design
- ✅ Performance
- ✅ Consistent navigation

#### Categories Management
- ✅ Display categories page
- ✅ Create new category
- ✅ Display category list
- ✅ Edit category
- ✅ Delete category
- ✅ Form validation
- ✅ Navigate from dashboard
- ✅ Server status
- ✅ Sort categories
- ✅ Toggle visibility

#### Parameters Management
- ✅ Display parameters page
- ✅ Create slider parameter
- ✅ Create text parameter
- ✅ Create toggle parameter
- ✅ Create select parameter
- ✅ Display parameters by category
- ✅ Filter by category
- ✅ Edit parameter
- ✅ Delete parameter
- ✅ Form validation
- ✅ Type-specific fields
- ✅ Parameter count

#### Content Management
- ✅ Display content page
- ✅ Empty state
- ✅ Display content list
- ✅ Display metadata
- ✅ View details
- ✅ Delete content
- ✅ Filter by category
- ✅ Filter by date
- ✅ Search content
- ✅ Pagination
- ✅ Statistics
- ✅ Export
- ✅ Display images

### Integration Tests (tests/e2e/integration/)

#### End-to-End Flows
- ✅ Complete flow: Admin creates category/parameters → User generates content
- ✅ Admin modifies parameter → User sees update
- ✅ Admin deletes category → User doesn't see it

#### Error Handling
- ✅ Empty database
- ✅ Invalid story ID
- ✅ Malformed URL parameters
- ✅ Network errors
- ✅ Slow API responses
- ✅ Empty library
- ✅ Form validation errors
- ✅ Duplicate names
- ✅ Non-existent routes
- ✅ Browser back button
- ✅ Missing images
- ✅ Session timeout
- ✅ Rapid consecutive clicks
- ✅ Concurrent user sessions
- ✅ XSS attempts
- ✅ Long text inputs

## Configuration

The Playwright configuration is in `playwright.config.js` at the project root.

### Key Settings
- **Test Directory**: `tests/e2e`
- **Timeout**: 60 seconds per test
- **Retries**: 2 retries in CI, 0 in local
- **Workers**: 1 (sequential execution)
- **Browser**: Chromium (Desktop Chrome)
- **Screenshots**: On failure
- **Videos**: On failure
- **Traces**: On first retry

### Web Servers
The configuration automatically starts all three applications:
1. Server API on port 3000
2. Admin Dashboard on port 3001
3. User Interface on port 3002

## Page Object Models

All page interactions are abstracted into Page Object Models in `utils/page-objects.js`:

- `LandingPage` - User interface landing page
- `ParametersPage` - Parameter selection interface
- `GeneratingPage` - Content generation progress
- `StoryPage` - Story viewer
- `LibraryPage` - Story library
- `AdminDashboardPage` - Admin dashboard home
- `AdminCategoriesPage` - Category management
- `AdminParametersPage` - Parameter management
- `AdminContentPage` - Content management

## Fixtures

Reusable test fixtures in `fixtures/test-fixtures.js`:

- `serverReady` - Ensures server is ready
- `cleanDatabase` - Cleans database before/after test
- `testCategory` - Creates a test category
- `categoryWithParameters` - Creates category with parameters

## API Helpers

Utility functions in `utils/api-helpers.js`:

- `initializeDatabase()` - Reset database
- `createCategory(data)` - Create category via API
- `createParameter(data)` - Create parameter via API
- `deleteCategory(id)` - Delete category
- `deleteParameter(id)` - Delete parameter
- `generateContent(data)` - Generate content
- `getCategories()` - Fetch all categories
- `getParameters()` - Fetch all parameters
- `getContent()` - Fetch all content
- `waitForServer()` - Wait for server to be ready
- `cleanupTestData()` - Clean up all test data

## Best Practices

### Writing Tests

1. **Use Page Objects**: Abstract page interactions into Page Object Models
2. **Use Fixtures**: Leverage fixtures for common setup
3. **Clean Database**: Use `cleanDatabase` fixture for isolated tests
4. **Wait Appropriately**: Use `waitForLoadState`, `waitForSelector`, etc.
5. **Handle Timing**: Add appropriate timeouts for async operations
6. **Test Isolation**: Each test should be independent
7. **Descriptive Names**: Use clear, descriptive test names

### Example Test

```javascript
import { test, expect } from '../fixtures/test-fixtures.js';
import { ParametersPage } from '../utils/page-objects.js';

test.describe('My Feature', () => {
  test.use({ cleanDatabase: true });

  test('should do something', async ({ page, categoryWithParameters }) => {
    const parametersPage = new ParametersPage(page);
    await parametersPage.goto();

    await page.waitForSelector('text=Test Category', { timeout: 10000 });
    await parametersPage.selectCategory('Test Category');

    // Your test logic here
    expect(/* ... */).toBeTruthy();
  });
});
```

## Debugging Tests

### Interactive Debugging
```bash
npm run test:e2e:debug
```

### Visual Debugging with UI Mode
```bash
npm run test:e2e:ui
```

### View Test Traces
After a test failure, traces are saved. View them with:
```bash
npx playwright show-trace trace.zip
```

### Run Specific Test
```bash
npx playwright test --grep "should display landing page"
```

### Run Tests in Specific File
```bash
npx playwright test tests/e2e/user/landing.test.js
```

## CI/CD Integration

Tests are configured to run in CI environments:
- Retries: 2 attempts on failure
- Workers: 1 (sequential execution)
- Headless mode: Enabled
- Screenshots and videos: Captured on failure

## Troubleshooting

### Tests Timing Out
- Increase timeout in `playwright.config.js`
- Check if servers are starting properly
- Verify network connectivity

### Flaky Tests
- Use proper wait strategies (`waitForSelector`, `waitForLoadState`)
- Avoid fixed `waitForTimeout` when possible
- Use `test.use({ retries: 2 })` for specific tests

### Server Not Starting
- Check if ports 3000, 3001, 3002 are available
- Verify all dependencies are installed
- Check server logs in test output

### Database Issues
- Use `cleanDatabase` fixture
- Verify database initialization
- Check API helper functions

## Contributing

When adding new tests:

1. **Create tests in appropriate directory** (`user/`, `admin/`, or `integration/`)
2. **Update this README** with new test coverage
3. **Use existing fixtures and page objects** when possible
4. **Follow naming conventions**: `feature.test.js`
5. **Add clear descriptions**: Describe what each test validates
6. **Run tests locally** before committing

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Page Object Model Pattern](https://playwright.dev/docs/pom)
- [Test Fixtures](https://playwright.dev/docs/test-fixtures)
