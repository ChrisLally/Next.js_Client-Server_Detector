'use strict';

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

let statusBarItem: vscode.StatusBarItem;
const clientFiles = new Set<string>();

let updateTimer: NodeJS.Timeout | undefined;

class NextJSFileDecorationProvider implements vscode.FileDecorationProvider {
	private _onDidChangeFileDecorations: vscode.EventEmitter<vscode.Uri | vscode.Uri[]> = new vscode.EventEmitter<vscode.Uri | vscode.Uri[]>();
	onDidChangeFileDecorations: vscode.Event<vscode.Uri | vscode.Uri[]> = this._onDidChangeFileDecorations.event;

	async provideFileDecoration(uri: vscode.Uri): Promise<vscode.FileDecoration | undefined> {
		const { isClient } = await isClientFile(uri);
		return isClient ? { badge: 'C' } : { badge: 'S' };
	}

	updateDecoration(uri: vscode.Uri) {
		this._onDidChangeFileDecorations.fire(uri);
	}
}

const decorationProvider = new NextJSFileDecorationProvider();

export function activate(context: vscode.ExtensionContext) {
	console.log('Activating extension: nextjs-client-server-indicator');
	statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	statusBarItem.text = 'Analyzing...'; // Set initial text
	statusBarItem.show(); // Show the status bar item immediately
	context.subscriptions.push(statusBarItem);

	statusBarItem.command = 'nextjs-client-server-indicator.showClientFiles';

	context.subscriptions.push(
		vscode.commands.registerCommand('nextjs-client-server-indicator.showClientFiles', showClientFiles)
	);

	context.subscriptions.push(
		vscode.window.onDidChangeActiveTextEditor(updateStatusBarItem)
	);

	// Register the file decoration provider
	context.subscriptions.push(
		vscode.window.registerFileDecorationProvider(decorationProvider)
	);

	// Listen for configuration changes
	context.subscriptions.push(
		vscode.workspace.onDidChangeConfiguration(event => {
			if (event.affectsConfiguration('nextjs-client-server-indicator')) {
				updateStatusBarItem(vscode.window.activeTextEditor);
			}
		})
	);

	// Update status bar item immediately
	updateStatusBarItem(vscode.window.activeTextEditor);

	console.log('Extension activated successfully');

	context.subscriptions.push(
		vscode.workspace.onDidChangeTextDocument((event) => {
			if (event.document === vscode.window.activeTextEditor?.document) {
				if (updateTimer) {
					clearTimeout(updateTimer);
				}
				updateTimer = setTimeout(() => {
					updateStatusBarItem(vscode.window.activeTextEditor);
					decorationProvider.updateDecoration(event.document.uri);
				}, 500); // 500ms delay
			}
		})
	);

	return {
		getStatusBarItem: () => statusBarItem,
		updateStatusBarItem: updateStatusBarItem // Export this function for testing
	};
}

async function updateStatusBarItem(editor: vscode.TextEditor | undefined) {
	console.log('Updating status bar item');
	if (!editor) {
		console.log('No active editor');
		// Don't change the text, keep the last known state
		return;
	}

	const document = editor.document;
	console.log('Current file:', document.fileName);

	// Set the text to "Analyzing..." while we determine the new state
	statusBarItem.text = 'Analyzing...';

	const { isClient, clientFiles: newClientFiles } = await isClientFile(document.uri);
	console.log('isClient:', isClient);
	console.log('newClientFiles:', newClientFiles);

	newClientFiles.forEach(file => clientFiles.add(file));

	const config = vscode.workspace.getConfiguration('nextjs-client-server-indicator');

	if (isClient) {
		statusBarItem.text = 'Client';
		const clientColor = config.get<string>('clientColor');
		if (clientColor) {
			statusBarItem.color = clientColor;
		} else {
			statusBarItem.color = undefined; // Reset to default color
		}
		console.log('Set status: Client');
	} else {
		statusBarItem.text = 'Server';
		const serverColor = config.get<string>('serverColor');
		if (serverColor) {
			statusBarItem.color = serverColor;
		} else {
			statusBarItem.color = undefined; // Reset to default color
		}
		console.log('Set status: Server');
	}

	console.log('Status bar updated:', statusBarItem.text);

	// After updating the status bar, also update the file decoration
	if (editor) {
		decorationProvider.updateDecoration(editor.document.uri);
	}
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
		const document = await vscode.workspace.openTextDocument(uri);
		text = document.getText();
	} else {
		try {
			const content = await vscode.workspace.fs.readFile(uri);
			text = new TextDecoder().decode(content);
		} catch (error) {
			console.error(`Error reading file ${uri.toString()}:`, error);
			return { isClient: false, clientFiles: [] };
		}
	}

	console.log('File content (first 200 characters):', text.substring(0, 200));

	// Check for 'use client' directive, ignoring comments and whitespace
	const useClientRegex = /^\s*['"]use client['"]\s*;?/m;
	if (useClientRegex.test(text)) {
		console.log('Found "use client" directive');
		return { isClient: true, clientFiles: [filePath] };
	}

	console.log('No "use client" directive found, checking imports');

	// Check imports
	const importRegex = /import.*from\s+['"](.+)['"]/g;
	let match;
	let allClientFiles: string[] = [];
	while ((match = importRegex.exec(text)) !== null) {
		const importPath = match[1];
		console.log('Found import:', importPath);
		const resolvedPath = await resolveImportPath(uri, importPath);
		if (resolvedPath) {
			console.log('Resolved import path:', resolvedPath.toString());
			const result = await isClientFile(resolvedPath, visited);
			if (result.isClient) {
				allClientFiles = allClientFiles.concat(result.clientFiles);
			}
		} else {
			console.log('Could not resolve import path:', importPath);
		}
	}

	const isClient = allClientFiles.length > 0;
	console.log('File is client:', isClient);
	return { isClient, clientFiles: allClientFiles };
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
