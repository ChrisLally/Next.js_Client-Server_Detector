import * as path from 'path';
import { runTests } from '@vscode/test-electron';

async function main() {
    try {
        const extensionDevelopmentPath = path.resolve(__dirname, '../../');
        console.log('Extension development path:', extensionDevelopmentPath);

        const extensionTestsPath = path.resolve(__dirname, './suite/index');
        console.log('Extension tests path:', extensionTestsPath);

        // Download VS Code, unzip it and run the integration test
        await runTests({ 
            extensionDevelopmentPath, 
            extensionTestsPath,
            launchArgs: [
                '--disable-extensions',
                '--verbose',
                '--extensionDevelopmentPath=' + extensionDevelopmentPath
            ]
        });
    } catch (err) {
        console.error('Failed to run tests', err);
        process.exit(1);
    }
}

main();