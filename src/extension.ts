'use strict';

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

let statusBarItem: vscode.StatusBarItem;
let clientFiles: string[] = [];

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
	console.log('updateStatusBarItem called');
	if (!editor) {
		console.log('No active editor');
		statusBarItem.hide();
		return;
	}

	const document = editor.document;
	console.log('Document URI:', document.uri.toString());
	if (!isNextJsFile(document)) {
		console.log('Not a Next.js file');
		statusBarItem.hide();
		return;
	}

	const result = await isClientFile(document.uri);
	const isClientComponent = result.isClient;
	clientFiles = result.clientFiles;
	console.log('Is client component:', isClientComponent);
	statusBarItem.text = isClientComponent ? 'Client' : 'Server';
	statusBarItem.show();
	console.log('Status bar item text set to:', statusBarItem.text);
}

function isNextJsFile(document: vscode.TextDocument): boolean {
	const supportedExtensions = ['.js', '.jsx', '.ts', '.tsx'];
	const supportedLanguages = ['javascript', 'typescript', 'javascriptreact', 'typescriptreact'];
	return supportedExtensions.includes(path.extname(document.fileName)) || 
           supportedLanguages.includes(document.languageId);
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
	if (clientFiles.length === 0) {
		vscode.window.showInformationMessage('No client-side files found.');
		return;
	}

	const items = clientFiles.map(file => ({
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

export function deactivate() {}
