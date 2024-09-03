import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';

suite('Extension Test Suite', () => {
    vscode.window.showInformationMessage('Start all tests.');

    test('Sample test', () => {
        assert.strictEqual(-1, [1, 2, 3].indexOf(5));
        assert.strictEqual(-1, [1, 2, 3].indexOf(0));
    });

    test('Status bar item exists', async function() {
        this.timeout(10000); // Increase timeout to 10 seconds

        // Log all available extensions
        const extensions = vscode.extensions.all;
        console.log('Available extensions:', extensions.map(ext => ext.id));

        // Wait for the extension to be activated
        const extensionId = 'undefined_publisher.nextjs-client-server-indicator';
        console.log('Looking for extension:', extensionId);
        const extension = vscode.extensions.getExtension(extensionId);
        console.log('Extension found:', extension ? 'Yes' : 'No');

        if (extension) {
            console.log('Activating extension...');
            await extension.activate();
            console.log('Extension activated');
        } else {
            console.log('Extension not found, cannot activate');
            console.log('Extension development path:', path.resolve(__dirname, '../../../'));
        }

        // Create a new untitled file
        const document = await vscode.workspace.openTextDocument({
            content: "'use client';\n\nconsole.log('Hello');",
            language: 'typescript'
        });
        await vscode.window.showTextDocument(document);

        // Wait for the status bar item to be created
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        if (!extension) {
            assert.fail('Extension not found');
            return;
        }

        const extensionExports = extension.exports;
        console.log('Extension exports:', extensionExports);

        if (!extensionExports || typeof extensionExports.updateStatusBarItem !== 'function') {
            assert.fail('Extension does not export updateStatusBarItem function');
            return;
        }

        // Explicitly call updateStatusBarItem
        await extensionExports.updateStatusBarItem(vscode.window.activeTextEditor);

        // Add a small delay to allow for asynchronous operations
        await new Promise(resolve => setTimeout(resolve, 100));

        const statusBarItem = extensionExports.getStatusBarItem();
        
        console.log('Status bar item text:', statusBarItem.text);
        assert.ok(statusBarItem, 'Status bar item should exist');
        assert.strictEqual(statusBarItem.text, 'Client', 'Status bar should show "Client" for this file');
    });
});