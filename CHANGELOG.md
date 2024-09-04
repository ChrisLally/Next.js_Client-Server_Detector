# Change Log
All notable changes to the "nextjs-client-server-indicator" extension will be documented in this file.

### Added
- Route detection feature for Next.js 13+ app directory structure.
- New test cases for route detection functionality.
- Expanded test.sh script to include cleanup, compilation, and linting steps.
- Prompt for window reload after changing extension settings.
- Added LICENSE.txt with custom license for personal and commercial use.

### Changed
- Updated status bar item to display both component type (Client/Server) and detected route.
- Improved error handling and logging in extension.ts.
- Updated configuration change listener to reload the window instead of attempting to restart the extension.
- Updated README.md with license information.

### Fixed
- Resolved linting issues in extension.ts and fileSystemProvider.ts.