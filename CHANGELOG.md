# Change Log
All notable changes to the "nextjs-client-server-indicator" extension will be documented in this file.

Check [Keep a Changelog](https://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

### Added
- Route detection feature for Next.js 13+ app directory structure.
- New test cases for route detection functionality.
- Expanded test.sh script to include cleanup, compilation, and linting steps.

### Changed
- Updated status bar item to display both component type (Client/Server) and detected route.
- Improved error handling and logging in extension.ts.

### Fixed
- Resolved linting issues in extension.ts and fileSystemProvider.ts.