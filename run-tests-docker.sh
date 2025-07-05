#!/bin/bash

echo "🐳 Running tests in Docker to bypass WSL2 issues..."

# Build test image
echo "Building Docker test image..."
docker build -f Dockerfile.test -t poe-helper-tests .

# Run API tests
echo "Running API tests..."
docker run --rm poe-helper-tests

# Run dashboard tests
echo "Running dashboard tests..."
docker run --rm -w /app/dashboard poe-helper-tests npm test

echo "✅ Tests completed in Docker environment"