// Improved server.js with explicit health check
const express = require('express');
const path = require('path');
const fs = require('fs');

console.log('Starting server via server.js entrypoint');
console.log(`Current working directory: ${process.cwd()}`);
console.log(`PORT environment variable: ${process.env.PORT || 3000}`);

// Check if dist/main.js exists
const mainJsPath = path.join(process.cwd(), 'dist/main.js');
try {
  if (fs.existsSync(mainJsPath)) {
    console.log(`Found main.js at ${mainJsPath}`);
  } else {
    console.error(`ERROR: main.js not found at ${mainJsPath}`);
    console.log('Contents of dist directory:');
    try {
      const distContents = fs.readdirSync(path.join(process.cwd(), 'dist'));
      console.log(distContents);
    } catch (e) {
      console.error('Could not read dist directory:', e);
    }
  }
} catch (err) {
  console.error('Error checking for main.js:', err);
}

// Create a minimal Express app for health checks
const app = express();

// Add a simple health check endpoint
app.get('/health', (req, res) => {
  console.log('Health check received directly in server.js');
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'Health check from standalone express server',
  });
});

// Fallback for other routes
app.use('*', (req, res, next) => {
  console.log(`Passing ${req.method} ${req.baseUrl} to NestJS application`);
  next();
});

// Start the Express server
const port = process.env.PORT || 3000;
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`Express server listening on port ${port}`);

  // Load NestJS application after Express server is running
  try {
    console.log('Attempting to load NestJS application from dist/main.js');
    require('./dist/main');
  } catch (error) {
    console.error('Failed to load NestJS application:', error);
    // Keep Express server running for health checks
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Express server closed');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Express server closed');
  });
});
