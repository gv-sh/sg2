const config = {
  API_URL: process.env.REACT_APP_API_URL || 'http://localhost:3000',
  PORT: process.env.PORT || 3002,
  TIMEOUT: 5000
};

// Log the API URL to help with debugging
console.log('Using API URL:', config.API_URL);

export default config; 