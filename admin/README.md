# SpecGen Admin Interface

[![Version](https://img.shields.io/badge/version-0.12.2-blue.svg)](https://github.com/gv-sh/specgen-admin)

The admin dashboard for SpecGen, providing a modern and user-friendly interface for managing speculative fiction generation parameters, content, and settings.

## Features

- **Content Management**
  - View all generated content (fiction & images)
  - Edit titles and content
  - Download generated fiction as text files
  - View and download generated images
  - Copy content to clipboard
  - Filter content by type
  - Delete unwanted content

- **Category Management**
  - Add new categories for different fiction types
  - Edit category details with rich descriptions
  - Control category visibility
  - Delete categories

- **Parameter Management**
  - Create and manage parameters for each category
  - Support multiple input types (Dropdown, Slider, Toggle, etc.)
  - Define parameter values and configurations
  - Set visibility levels (Basic/Advanced)

- **Database Management**
  - Download database backup
  - Restore from backup
  - Reset database

- **Modern UI**
  - Clean, minimal interface with shadcn/ui components
  - Responsive design for all device sizes
  - Subtle animations and transitions
  - Consistent design language throughout

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Running SpecGen server

## Setup

1. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

2. Configure environment variables (optional):
   - Create a `.env` file
   - Set the API URL: `REACT_APP_API_URL=http://localhost:3000/api`

3. Start the development server:
   ```bash
   npm start
   # or
   yarn start
   ```

The admin dashboard will be available at [http://localhost:3001](http://localhost:3001).

## Building for Production

To create a production build:

```bash
npm run build
# or
yarn build
```

This will create an optimized build in the `build` folder.

## Technologies

- React 18
- Tailwind CSS for styling
- shadcn/ui component library
- Axios for API calls
- React Router for navigation
- Framer Motion for animations

## API Integration

The admin interface interacts with the following API endpoints:

### Content
- GET /api/content - Get all generated content
- GET /api/content?type=fiction - Filter content by type
- GET /api/content/:id - Get specific content item
- PUT /api/content/:id - Update content
- DELETE /api/content/:id - Delete content

### Categories
- GET /api/categories - Get all categories
- POST /api/categories - Create a new category
- PUT /api/categories/:id - Update a category
- DELETE /api/categories/:id - Delete a category

### Parameters
- GET /api/parameters - Get all parameters
- GET /api/parameters?categoryId=:id - Get parameters for a category
- POST /api/parameters - Create a new parameter
- PUT /api/parameters/:id - Update a parameter
- DELETE /api/parameters/:id - Delete a parameter

### Database
- GET /api/database/download - Download database backup
- POST /api/database/restore - Restore from backup
- POST /api/database/reset - Reset database

### Generation
- POST /api/generate - Generate new content

### Settings
- GET /api/settings - Get application settings
- PUT /api/settings - Update settings
- POST /api/settings/reset - Reset settings to defaults

## Design Principles

- **Minimal & Subtle**: Clean UI without overwhelming visual elements
- **Consistent**: Uniform styling, spacing, and interactions
- **Functional**: Easy to understand and use
- **Responsive**: Works well on all device sizes
- **Accessible**: Follows accessibility best practices

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License.