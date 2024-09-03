# Next.js Client/Server Indicator

This Visual Studio Code extension provides a status bar indicator for Next.js projects, showing whether the current file is a client-side or server-side component. It now also includes route detection for Next.js 13+ app directory structure.

## Features

- Status bar indicator showing "Client" or "Server" for Next.js components.
- Route detection for Next.js 13+ app directory structure.
- Works with TypeScript and JavaScript files.
- Automatically updates as you switch between files.

## How it works

The extension analyzes the content of your current file:
- If it contains `'use client'` or `"use client"`, it's marked as a Client component.
- Otherwise, it's considered a Server component.
- For files within the `app` directory, the extension also attempts to detect and display the corresponding route.

## Requirements

- Visual Studio Code v1.60.0 or higher
- Next.js project (optimized for Next.js 13+ with app directory structure)

## Extension Settings

This extension does not add any VS Code settings.

## Known Issues

[List any known issues here, or remove this section if there are none]

## Release Notes

See the [CHANGELOG.md](CHANGELOG.md) file for detailed release notes.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

[Include your license information here]
