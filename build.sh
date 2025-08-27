#!/bin/bash

# Production build script to ensure correct static file structure
echo "Starting production build..."

# Build the application
echo "Building frontend..."
npm run build

# Check if dist/public exists and copy to the expected public directory
if [ -d "dist/public" ]; then
    echo "Copying static files to correct location..."
    cp -r dist/public/* public/ 2>/dev/null || mkdir -p public && cp -r dist/public/* public/
    echo "Static files copied successfully"
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