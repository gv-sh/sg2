const { spawn } = require('child_process');
const net = require('net');

// Function to check if a port is available
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => {
      resolve(false);
    });
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port);
  });
}

// Function to find an available port
async function findAvailablePort(startPort, maxAttempts = 10) {
  // Always try to use port 3002 first for user interface
  const preferredPort = 3002;
  
  // First check if preferred port is available
  if (await isPortAvailable(preferredPort)) {
    console.log(`Preferred port ${preferredPort} is available.`);
    return preferredPort;
  }
  
  console.log(`Warning: Preferred port ${preferredPort} is not available. Trying alternative ports...`);
  
  // If preferred port is not available, try others
  for (let port = startPort; port < startPort + maxAttempts; port++) {
    if (port !== preferredPort && await isPortAvailable(port)) {
      console.log(`Using alternative port: ${port}`);
      return port;
    }
  }
  
  throw new Error(`Error: No available ports found between ${startPort} and ${startPort + maxAttempts - 1}`);
}

// Start the React development server
async function startServer() {
  try {
    const port = await findAvailablePort(3002);
    
    // Display clear message about ports being used
    console.log('\n==================================================');
    console.log(`🚀 Starting SpecGen User Interface on port: ${port}`);
    console.log(`🔌 API Server expected at: http://localhost:3000`);
    console.log('==================================================\n');
    
    const reactScriptsStart = spawn('react-scripts', ['start'], {
      stdio: 'inherit',
      shell: true,
      env: { 
        ...process.env, 
        PORT: port,
        REACT_APP_API_URL: 'http://localhost:3000'
      }
    });

    reactScriptsStart.on('error', (err) => {
      console.error('Failed to start server:', err);
      process.exit(1);
    });
  } catch (error) {
    console.error('Failed to find available port:', error.message);
    process.exit(1);
  }
}

startServer(); 