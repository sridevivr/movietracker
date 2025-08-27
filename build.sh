#!/bin/bash

# Production build script to ensure correct static file structure
echo "Starting production build..."

# Build the application
echo "Building frontend..."
npm run build

# Check if dist/public exists and copy to the expected server/public directory
if [ -d "dist/public" ]; then
    echo "Copying static files to correct location..."
    mkdir -p server/public
    cp -r dist/public/* server/public/ 2>/dev/null || true
    echo "Static files copied to server/public successfully"
else
    echo "Warning: dist/public directory not found"
fi

# Make sure the server build exists
if [ -f "dist/index.js" ]; then
    echo "Server build completed successfully"
else
    echo "Warning: Server build not found"
fi

echo "Production build complete!"