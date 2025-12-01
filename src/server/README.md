# SpecGen Server

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/gv-sh/sg2)

A Node.js/Express API server for the SpecGen unified application. Generates speculative fiction stories using AI, manages fiction categories and parameters, and provides RESTful endpoints for both admin and user interfaces.

## Architecture

SpecGen is a unified application with three main components:

- **Server** (this directory): Backend API built with Express.js
- **Admin UI**: React-based interface for managing categories, parameters, and settings  
- **User UI**: React-based interface for generating and viewing stories

All components are integrated into a single application that serves the React build and provides API endpoints.

## Features

### Core Functionality
- RESTful API for managing fiction categories and parameters
- OpenAI integration for fiction and image generation
- SQLite database with automatic schema management
- Comprehensive error handling and validation with Zod
- Rate limiting and security middleware

### API Endpoints
- **Admin APIs** (`/api/admin/*`): Category, parameter, and settings management
- **Content APIs** (`/api/content/*`): Story generation, retrieval, and management  
- **System APIs** (`/api/system/*`): Health checks, database status, API documentation

### Development Features
- Live API documentation via Swagger UI
- Comprehensive test suite with 100% passing tests
- ESLint configuration for code quality
- Environment-based configuration

## Quick Start

### Prerequisites
- Node.js ≥18.0.0
- npm ≥8.0.0

### Installation & Development

```bash
# Install dependencies (run from project root)
npm install

# Start development server with file watching
npm run dev:watch

# Or start server only
npm run server:dev
```

### Production

```bash
# Build and start production server
npm start

# Or start server directly
npm run start:server
```

### Testing

```bash
# Run server tests
npm run test:server

# Run all tests (server + client)
npm run test

# Run integration tests
npm run test:integration

# Lint code
npm run lint
```

## API Documentation

### Live Documentation
The server provides live API documentation accessible at:
- **Swagger UI**: `http://localhost:3000/api/system/docs`
- **OpenAPI JSON**: `http://localhost:3000/api/system/docs.json`

### Core Endpoints

#### Admin Management
- `GET /api/admin/categories` - List all categories
- `POST /api/admin/categories` - Create new category  
- `PUT /api/admin/categories/:id` - Update category
- `DELETE /api/admin/categories/:id` - Delete category

- `GET /api/admin/parameters` - List parameters (with optional category filter)
- `POST /api/admin/parameters` - Create new parameter
- `PUT /api/admin/parameters/:id` - Update parameter  
- `DELETE /api/admin/parameters/:id` - Delete parameter

- `GET /api/admin/settings` - Get application settings
- `PUT /api/admin/settings` - Update application settings

#### Content Management
- `POST /api/generate` - Generate new fiction content with image
- `GET /api/content` - List generated content with pagination
- `GET /api/content/:id` - Get specific content
- `PUT /api/content/:id` - Update content title
- `DELETE /api/content/:id` - Delete content

#### System
- `GET /api/system/health` - Health check with database and AI status
- `GET /api/system/database/status` - Database statistics
- `POST /api/system/database/init` - Initialize/reset database

## Configuration

### Environment Variables
- `NODE_ENV` - Environment (development|production|test)  
- `PORT` - Server port (default: 3000)
- `OPENAI_API_KEY` - OpenAI API key for content generation
- `DATABASE_PATH` - Custom SQLite database path (optional)

### Settings Management
Application settings are managed via the `/api/admin/settings` endpoint and stored in the database. This includes:
- AI model configuration (fiction and image models)
- Generation parameters and prompts
- Application-specific settings

## Database

### SQLite Database
- **Location**: `server/data/specgen.db` (created automatically)
- **Schema**: Automatically created from `schema.js`
- **Test Database**: Separate database for testing (`specgen-test.db`)

### Schema Management
The database schema is automatically created and managed:
- Categories with sorting and visibility options
- Parameters with type validation (select, text, number, boolean, range)
- Generated content with metadata and image support
- Flexible settings storage with data type support

## Development

### File Structure
```
server/
├── server.js          # Main Express application
├── services.js        # Data and AI service layers  
├── config.js          # Configuration management
├── schema.js          # Database schema definitions
├── test.js            # Comprehensive test suite
├── jest.config.js     # Jest testing configuration
├── eslint.config.js   # ESLint code quality rules
└── data/              # SQLite database files
```

### Code Quality
- **ESLint**: Configured for modern JavaScript (ES2022+)
- **Testing**: Jest with supertest for API testing
- **Validation**: Zod schemas for request/response validation
- **Error Handling**: Boom for consistent HTTP error responses

### Adding New Endpoints
1. Define Zod schemas for validation
2. Add Swagger JSDoc comments for documentation  
3. Implement endpoint logic with error handling
4. Add comprehensive tests in `test.js`

## Security

### Production Security
- Helmet.js for security headers
- CORS configuration  
- Rate limiting (60 requests per minute per IP)
- Request size limits (10MB for images, 1MB for JSON)
- Input validation and sanitization

### Development Security
- Environment variable management
- No sensitive data in logs
- Database parameterized queries
- Error message sanitization

## Contributing

### Development Workflow
1. Make changes to server code
2. Run tests: `npm run test:server`  
3. Run linting: `npm run lint`
4. Test integration: `npm run test:integration`
5. Ensure all tests pass before committing

### Code Standards
- Follow ESLint configuration
- Write comprehensive tests for new features
- Include Swagger documentation for new endpoints
- Use TypeScript-style JSDoc comments for better IDE support

## Troubleshooting

### Common Issues
- **Port 3000 in use**: Change PORT environment variable
- **OpenAI API errors**: Verify OPENAI_API_KEY is set correctly
- **Database errors**: Check file permissions in `data/` directory
- **Sharp module warnings**: Normal in development, doesn't affect functionality

### Debug Mode
Enable verbose logging with:
```bash
NODE_ENV=development DEBUG=* npm run server:dev
```

## License

This project is private and not licensed for public use.