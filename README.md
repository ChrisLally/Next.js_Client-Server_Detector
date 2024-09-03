# Next.js Client/Server File Indicator

This extension adds a status bar indicator to show whether a file is a client-side or server-side component in Next.js projects.

## Features

* Displays a status bar indicator for each open file in a Next.js project
* Automatically detects whether a file is a client-side or server-side component
* Recursively checks imports to determine client/server status

## How it works

The extension checks for the following to determine if a file is a client-side component:

1. Presence of the 'use client' directive at the top of the file
2. If any direct imports are client-side components
3. If any nested imports (imports of imports) are client-side components

If none of these conditions are met, the file is considered a server-side component.

## Getting Started

1. Install this extension
2. Open a Next.js project in VS Code
3. Open any .js, .jsx, .ts, or .tsx file
4. Look at the status bar to see whether the current file is a client-side or server-side component

## Usage

The status bar will display one of the following indicators:

* `Client`: The current file is a client-side component
* `Server`: The current file is a server-side component
