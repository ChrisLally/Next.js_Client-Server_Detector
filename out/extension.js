'use strict';
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
let statusBarItem;
let clientFiles = [];
function activate(context) {
    console.log('Activating extension: nextjs-client-server-indicator');
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    context.subscriptions.push(statusBarItem);
    statusBarItem.command = 'nextjs-client-server-indicator.showClientFiles';
    context.subscriptions.push(vscode.commands.registerCommand('nextjs-client-server-indicator.showClientFiles', showClientFiles));
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(updateStatusBarItem));
    // Update status bar item immediately
    updateStatusBarItem(vscode.window.activeTextEditor);
    console.log('Extension activated successfully');
    return {
        getStatusBarItem: () => statusBarItem,
        updateStatusBarItem: updateStatusBarItem // Export this function for testing
    };
}
exports.activate = activate;
function updateStatusBarItem(editor) {
    return __awaiter(this, void 0, void 0, function* () {
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
        const result = yield isClientFile(document.uri);
        const isClientComponent = result.isClient;
        clientFiles = result.clientFiles;
        console.log('Is client component:', isClientComponent);
        statusBarItem.text = isClientComponent ? 'Client' : 'Server';
        statusBarItem.show();
        console.log('Status bar item text set to:', statusBarItem.text);
    });
}
function isNextJsFile(document) {
    const supportedExtensions = ['.js', '.jsx', '.ts', '.tsx'];
    const supportedLanguages = ['javascript', 'typescript', 'javascriptreact', 'typescriptreact'];
    return supportedExtensions.includes(path.extname(document.fileName)) ||
        supportedLanguages.includes(document.languageId);
}
function isClientFile(uri, visited = new Set()) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Checking if file is client:', uri.toString());
        const filePath = uri.fsPath;
        if (visited.has(filePath)) {
            console.log('Already visited:', filePath);
            return { isClient: false, clientFiles: [] };
        }
        visited.add(filePath);
        let text;
        if (uri.scheme === 'untitled') {
            // For untitled documents, get the content from the TextDocument
            const document = yield vscode.workspace.openTextDocument(uri);
            text = document.getText();
        }
        else {
            // For saved files, use fs.readFile
            const content = yield vscode.workspace.fs.readFile(uri);
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
        let allClientFiles = [];
        while ((match = importRegex.exec(text)) !== null) {
            const importPath = match[1];
            const resolvedPath = yield resolveImportPath(uri, importPath);
            if (resolvedPath) {
                const result = yield isClientFile(resolvedPath, visited);
                if (result.isClient) {
                    allClientFiles = allClientFiles.concat(result.clientFiles);
                }
            }
        }
        return { isClient: allClientFiles.length > 0, clientFiles: allClientFiles };
    });
}
function resolveImportPath(baseUri, importPath) {
    return __awaiter(this, void 0, void 0, function* () {
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
    });
}
function showClientFiles() {
    return __awaiter(this, void 0, void 0, function* () {
        if (clientFiles.length === 0) {
            vscode.window.showInformationMessage('No client-side files found.');
            return;
        }
        const items = clientFiles.map(file => ({
            label: path.basename(file),
            description: vscode.workspace.asRelativePath(file),
            file: file
        }));
        const selected = yield vscode.window.showQuickPick(items, {
            placeHolder: 'Select a client-side file to open'
        });
        if (selected) {
            const document = yield vscode.workspace.openTextDocument(selected.file);
            yield vscode.window.showTextDocument(document);
        }
    });
}
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map