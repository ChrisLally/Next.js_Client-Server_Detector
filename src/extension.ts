'use strict';

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

let statusBarItem: vscode.StatusBarItem;
const clientFiles = new Set<string>();

export function activate(context: vscode.ExtensionContext) {
	console.log('Activating extension: nextjs-client-server-indicator');
	statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	context.subscriptions.push(statusBarItem);

	statusBarItem.command = 'nextjs-client-server-indicator.showClientFiles';

	context.subscriptions.push(
		vscode.commands.registerCommand('nextjs-client-server-indicator.showClientFiles', showClientFiles)
	);

	context.subscriptions.push(
		vscode.window.onDidChangeActiveTextEditor(updateStatusBarItem)
	);

	// Update status bar item immediately
	updateStatusBarItem(vscode.window.activeTextEditor);

	console.log('Extension activated successfully');

	return {
		getStatusBarItem: () => statusBarItem,
		updateStatusBarItem: updateStatusBarItem // Export this function for testing
	};
}

async function updateStatusBarItem(editor: vscode.TextEditor | undefined) {
	if (!editor) {
		statusBarItem.hide();
		return;
	}

	const document = editor.document;
	if (document.languageId !== 'typescript' && document.languageId !== 'javascript') {
		statusBarItem.hide();
		return;
	}

	const fileContent = document.getText();
	const isClientComponent = fileContent.includes("'use client'") || fileContent.includes('"use client"');
	const detectedRoute = detectRoute(document.fileName);

	if (isClientComponent) {
		statusBarItem.text = `Client${detectedRoute ? ` | ${detectedRoute}` : ''}`;
		statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
	} else {
		statusBarItem.text = `Server${detectedRoute ? ` | ${detectedRoute}` : ''}`;
		statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
	}

	statusBarItem.show();
}

function detectRoute(filePath: string): string | null {
	// Assuming the project follows Next.js 13+ app directory structure
	const appDirIndex = filePath.indexOf('app');
	if (appDirIndex === -1) return null;

	const relativePath = filePath.slice(appDirIndex + 4); // +4 to skip 'app/'
	const parts = relativePath.split(path.sep);

	// Filter out special Next.js file names and folders
	const routeParts = parts.filter(part => 
		!['page.tsx', 'page.js', 'layout.tsx', 'layout.js', '(...)'].some(specialName => 
			part.includes(specialName)
		)
	);

	// Join the remaining parts to form the route
	const route = '/' + routeParts.join('/');

	return route || null;
}

// TODO: Implement or remove these unused functions
// function isNextJsFile(document: vscode.TextDocument): boolean {
//     // Implementation...
// }

// Remove this function if it's no longer used
// function isClientFile(document: vscode.TextDocument): boolean {
//     // Implementation...
// }

async function isClientFile(uri: vscode.Uri, visited: Set<string> = new Set()): Promise<{ isClient: boolean, clientFiles: string[] }> {
	console.log('Checking if file is client:', uri.toString());
	const filePath = uri.fsPath;
	
	if (visited.has(filePath)) {
		console.log('Already visited:', filePath);
		return { isClient: false, clientFiles: [] };
	}
	visited.add(filePath);

	let text: string;
	if (uri.scheme === 'untitled') {
		// For untitled documents, get the content from the TextDocument
		const document = await vscode.workspace.openTextDocument(uri);
		text = document.getText();
	} else {
		// For saved files, use fs.readFile
		const content = await vscode.workspace.fs.readFile(uri);
		text = new TextDecoder().decode(content);
	}

	console.log('File content:', text);

	// Check for 'use client' directive
	if (text.trim().startsWith("'use client'") || text.trim().startsWith('"use client"')) {
		console.log('Found "use client" directive');
		return { isClient: true, clientFiles: [filePath] };
	}

	console.log('No "use client" directive found');

	// Check imports
	const importRegex = /import.*from\s+['"](.+)['"]/g;
	let match;
	let allClientFiles: string[] = [];
	while ((match = importRegex.exec(text)) !== null) {
		const importPath = match[1];
		const resolvedPath = await resolveImportPath(uri, importPath);
		if (resolvedPath) {
			const result = await isClientFile(resolvedPath, visited);
			if (result.isClient) {
				allClientFiles = allClientFiles.concat(result.clientFiles);
			}
		}
	}

	return { isClient: allClientFiles.length > 0, clientFiles: allClientFiles };
}

async function resolveImportPath(baseUri: vscode.Uri, importPath: string): Promise<vscode.Uri | undefined> {
	const basePath = path.dirname(baseUri.fsPath);
	const extensions = ['.js', '.jsx', '.ts', '.tsx'];
	
	for (const ext of extensions) {
		const fullPath = path.join(basePath, importPath + ext);
		if (fs.existsSync(fullPath)) {
			return vscode.Uri.file(fullPath);
		}
	}

	// Check for index files
	for (const ext of extensions) {
		const indexPath = path.join(basePath, importPath, 'index' + ext);
		if (fs.existsSync(indexPath)) {
			return vscode.Uri.file(indexPath);
		}
	}

	return undefined;
}

async function showClientFiles() {
	if (clientFiles.size === 0) {
		vscode.window.showInformationMessage('No client-side files found.');
		return;
	}

	const items = Array.from(clientFiles).map(file => ({
		label: path.basename(file),
		description: vscode.workspace.asRelativePath(file),
		file: file
	}));

	const selected = await vscode.window.showQuickPick(items, {
		placeHolder: 'Select a client-side file to open'
	});

	if (selected) {
		const document = await vscode.workspace.openTextDocument(selected.file);
		await vscode.window.showTextDocument(document);
	}
}

export function deactivate() {
    // Perform any cleanup tasks here
    console.log('Extension deactivated');
}
