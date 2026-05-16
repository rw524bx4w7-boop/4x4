#!/usr/bin/env node

// Cloud Run optimized production start script
// Simplified for Cloud Run deployment compatibility

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cloud Run environment configuration
process.env.NODE_ENV = 'production';
process.env.HOST = '0.0.0.0';

// Use Cloud Run's PORT (auto-set) or default to 8080
if (!process.env.PORT) {
  process.env.PORT = '8080';
}

console.log('Starting B4uSign server for Cloud Run deployment...');
console.log(`Environment: ${process.env.NODE_ENV}`);
console.log(`Port: ${process.env.PORT}`);
console.log(`Host: ${process.env.HOST}`);

// Create dist/public directory structure
const distPublicPath = join(__dirname, 'dist', 'public');
if (!fs.existsSync(distPublicPath)) {
  console.log('Creating dist/public directory...');
  fs.mkdirSync(distPublicPath, { recursive: true });
  
  // Create minimal index.html
  const indexPath = join(distPublicPath, 'index.html');
  const indexContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>B4uSign Warranty Marketplace</title>
</head>
<body>
  <div id="root">
    <h1>B4uSign API Server</h1>
    <p>Production server is running.</p>
  </div>
</body>
</html>`;
  fs.writeFileSync(indexPath, indexContent);
  console.log('Created production index.html');
}

// Direct server execution for Cloud Run
const serverPath = join(__dirname, 'server', 'index.ts');

console.log('Starting TypeScript server directly...');
const serverProcess = spawn('npx', ['tsx', serverPath], {
  stdio: 'inherit',
  env: process.env,
  detached: false
});

// Simple error handling for Cloud Run
serverProcess.on('error', (error) => {
  console.error('Server failed to start:', error);
  process.exit(1);
});

serverProcess.on('close', (code) => {
  console.log(`Server process exited with code ${code}`);
  // Let Cloud Run handle process restarts
  process.exit(code || 0);
});

// Cloud Run signal handling
let shuttingDown = false;

const gracefulShutdown = (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;
  
  console.log(`Received ${signal}, shutting down gracefully...`);
  
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill(signal);
  }
  
  // Force exit after reasonable timeout
  setTimeout(() => {
    console.log('Forcing exit after timeout');
    process.exit(0);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Log unhandled errors but don't exit
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Promise Rejection:', reason);
});