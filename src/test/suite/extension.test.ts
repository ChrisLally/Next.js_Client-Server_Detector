import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

suite('Extension Test Suite', () => {
    vscode.window.showInformationMessage('Start all tests.');

    const testFolderPath = path.join(__dirname, '..', '..', '..', 'test-workspace');

    suiteSetup(() => {
        if (!fs.existsSync(testFolderPath)) {
            fs.mkdirSync(testFolderPath);
        }
    });

    suiteTeardown(() => {
        if (fs.existsSync(testFolderPath)) {
            fs.rmdirSync(testFolderPath, { recursive: true });
        }
    });

    test('Extension should be present', () => {
        assert.ok(vscode.extensions.getExtension('ChrisLally.nextjs-client-server-indicator'));
    });

    test('Server component detection', async () => {
        const serverFilePath = path.join(testFolderPath, 'server.tsx');
        fs.writeFileSync(serverFilePath, 'export default function ServerComponent() { return <div>Server</div>; }');

        const serverUri = vscode.Uri.file(serverFilePath);
        const document = await vscode.workspace.openTextDocument(serverUri);
        await vscode.window.showTextDocument(document);

        // Wait for the status bar to update
        await new Promise(resolve => setTimeout(resolve, 1000));

        const extension = vscode.extensions.getExtension('ChrisLally.nextjs-client-server-indicator');
        assert.ok(extension);
        const api = await extension.activate();
        assert.strictEqual(api.getStatusBarItem().text, 'Server');
    });

    test('Client component detection', async () => {
        const clientFilePath = path.join(testFolderPath, 'client.tsx');
        fs.writeFileSync(clientFilePath, '"use client";\n\nexport default function ClientComponent() { return <div>Client</div>; }');

        const clientUri = vscode.Uri.file(clientFilePath);
        const document = await vscode.workspace.openTextDocument(clientUri);
        await vscode.window.showTextDocument(document);

        // Wait for the status bar to update
        await new Promise(resolve => setTimeout(resolve, 1000));

        const extension = vscode.extensions.getExtension('ChrisLally.nextjs-client-server-indicator');
        assert.ok(extension);
        const api = await extension.activate();
        assert.strictEqual(api.getStatusBarItem().text, 'Client');
    });

    test('Client component detection from import', async () => {
        const clientUtilFilePath = path.join(testFolderPath, 'clientUtil.ts');
        fs.writeFileSync(clientUtilFilePath, '"use client";\n\nexport const clientUtil = () => console.log("Client util");');

        const importClientFilePath = path.join(testFolderPath, 'importClient.tsx');
        fs.writeFileSync(importClientFilePath, 'import { clientUtil } from "./clientUtil";\n\nexport default function ImportClientComponent() { return <div>Import Client</div>; }');

        const importClientUri = vscode.Uri.file(importClientFilePath);
        const document = await vscode.workspace.openTextDocument(importClientUri);
        await vscode.window.showTextDocument(document);

        // Wait for the status bar to update
        await new Promise(resolve => setTimeout(resolve, 1000));

        const extension = vscode.extensions.getExtension('ChrisLally.nextjs-client-server-indicator');
        assert.ok(extension);
        const api = await extension.activate();
        assert.strictEqual(api.getStatusBarItem().text, 'Client');
    });
});