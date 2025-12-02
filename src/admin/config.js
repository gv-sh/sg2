// Admin config - API URL is relative since we're on the same port
// We use empty string so API calls use relative paths like "/api/..."
const config = {
  API_URL: process.env.REACT_APP_API_URL || '', // Support env override for development
  
  // Common API endpoints for consistent usage
  ENDPOINTS: {
    ADMIN: {
      CATEGORIES: '/categories',
      PARAMETERS: '/parameters',
      SETTINGS: '/settings'
    },
    PUBLIC: {
      CONTENT: '/content',
      GENERATE: '/generate',
      HEALTH: '/system/health'
    }
  },

  // UI Configuration
  UI: {
    DEFAULT_PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 100,
    ALERT_TIMEOUT: 5000
  }
};

export default config; 