#!/bin/bash

# Function to check the last command's exit status
check_status() {
    if [ $? -ne 0 ]; then
        echo "Error: $1 failed"
        exit 1
    fi
}

# Clean up the test environment
echo "Cleaning up test environment..."
rm -rf .vscode-test
check_status "Cleanup"

# Compile the project
echo "Compiling TypeScript..."
npm run compile
check_status "Compilation"

# Run the linter
echo "Running linter..."
npm run lint
check_status "Linting"

# Run the tests
echo "Running tests..."
npm run test -- --verbose

# Check the exit status of the test command
if [ $? -eq 0 ]; then
    echo "All tests passed successfully!"
else
    echo "Some tests failed. Please check the output above."
    exit 1
fi

# Create VSIX file
echo "Creating VSIX file..."
npx vsce package
check_status "VSIX creation"

echo "VSIX file created successfully!"
exit 0