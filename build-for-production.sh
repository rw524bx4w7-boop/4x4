#!/bin/bash
# Build script for production deployment

echo "Building B4uSign for production..."

# Check if we should do a full build or minimal build
if [ "$SKIP_FRONTEND_BUILD" = "true" ]; then
  echo "Skipping frontend build for faster deployment..."
  # Create minimal structure for API-only deployment
  mkdir -p server/public
  cat > server/public/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>B4uSign - Vehicle Warranty Marketplace</title>
  <style>
    body {
      margin: 0;
      font-family: system-ui, -apple-system, sans-serif;
      background: #f8f9fa;
    }
    .container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 2rem;
    }
    h1 {
      color: #1a73e8;
      font-size: 2.5rem;
      margin-bottom: 1rem;
    }
    p {
      color: #5f6368;
      font-size: 1.2rem;
      line-height: 1.6;
    }
    .api-info {
      margin-top: 2rem;
      padding: 1.5rem;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .endpoint {
      font-family: monospace;
      background: #f1f3f4;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div>
      <h1>B4uSign API Server</h1>
      <p>The warranty marketplace platform is running in API mode.</p>
      <div class="api-info">
        <p>Available endpoints:</p>
        <p><span class="endpoint">/api/health</span> - Health check</p>
        <p><span class="endpoint">/api/warranty/*</span> - Warranty services</p>
        <p><span class="endpoint">/api/vin/*</span> - VIN decoding services</p>
      </div>
    </div>
  </div>
</body>
</html>
EOF
else
  echo "Building full application with frontend..."
  # Run the full build process
  npm run build
  
  # Ensure server/public exists and has the built files
  if [ -d "dist/public" ]; then
    mkdir -p server/public
    cp -r dist/public/* server/public/
  fi
fi

echo "Build complete!"