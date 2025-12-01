# Integration Tests

This directory contains integration tests for the SpecGen monorepo, testing the interaction between the server API and client applications.

## Test Structure

- `api.test.js` - Tests individual API endpoints
- `e2e-flow.test.js` - Tests complete end-to-end workflows
- `setup.js` - Setup script to initialize test environment
- `jest.config.js` - Jest configuration for integration tests

## Running Integration Tests

### Prerequisites

1. Ensure all dependencies are installed:
   ```bash
   npm install
   ```

2. The server must be running before tests execute. You have two options:

### Option 1: Run tests with server already running

1. Start the server in a separate terminal:
   ```bash
   npm run dev:server
   ```

2. Run integration tests:
   ```bash
   npm run test:integration
   ```

### Option 2: Run tests with automatic server startup

Use the provided script that starts the server and runs tests:

```bash
npm run test:integration:full
```

This script will:
1. Start the server in test mode
2. Wait for the server to be ready
3. Initialize the test database
4. Run all integration tests
5. Clean up and shut down the server

## Environment Variables

- `API_URL` - Base URL for the API (default: `http://localhost:3000`)
- `NODE_ENV` - Should be set to `test` for test runs

## Test Coverage

### System Endpoints
- Health check
- Database status and initialization
- API info

### Admin Endpoints
- Category CRUD operations
- Parameter CRUD operations
- Settings management

### Content Endpoints
- Content generation (requires OpenAI API key)
- Content listing and retrieval
- Content summary
- Image retrieval

### Error Handling
- 404 errors for non-existent resources
- 400 errors for validation failures
- Proper error messages

## Writing New Tests

When adding new integration tests:

1. Follow the existing test structure
2. Use descriptive test names
3. Clean up test data in afterAll/cleanup blocks
4. Handle expected failures gracefully (e.g., missing API keys)
5. Add proper assertions for response status and data structure

## Troubleshooting

### Server not ready
If tests fail with "Server not ready" error, increase the timeout in `setup.js` or ensure the server is properly started.

### Database errors
If you encounter database errors, try reinitializing:
```bash
rm src/server/data/*.db
npm run dev:server
```

### Port already in use
If port 3000 is already in use, either:
- Stop the conflicting process
- Change the port in `src/server/.env` or config
- Set `API_URL` environment variable to a different port
