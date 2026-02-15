// scripts/local-llm-helper.js
const LLMRouter = require('../llm-router');
const fs = require('fs');
const path = require('path');

const router = new LLMRouter();
const [, , action, filePath] = process.argv;

async function main() {
    if (!action || !filePath) {
        console.log('Usage: node local-llm-helper.js [action] [file_path]');
        console.log('Actions: comment, explain, test, refactor');
        return;
    }

    const absolutePath = path.resolve(filePath);
    if (!fs.existsSync(absolutePath)) {
        console.error(`File not found: ${absolutePath}`);
        return;
    }

    const code = fs.readFileSync(absolutePath, 'utf8');

    console.log(`Processing ${action} via local LLM...`);

    let result;
    switch (action) {
        case 'comment':
            result = await router.generateComments(code);
            break;
        case 'explain':
            result = await router.explainCode(code);
            console.log('\n--- Explanation ---\n');
            console.log(result);
            return;
        case 'test':
            result = await router.generateUnitTests(code);
            break;
        case 'refactor':
            // For refactor, we might want a third argument for the instruction
            const instruction = process.argv[4] || 'Refactor for clarity and efficiency';
            result = await router.simpleRefactor(code, instruction);
            break;
        default:
            console.error('Unknown action');
            return;
    }

    if (result) {
        // Backup original
        const backupPath = `${absolutePath}.bak`;
        fs.writeFileSync(backupPath, code);

        // Write result (cleaning up potential markdown wrapping if the LLM ignored instructions)
        let cleanedResult = result.trim();
        if (cleanedResult.startsWith('```')) {
            cleanedResult = cleanedResult.replace(/^```[a-z]*\n/, '').replace(/\n```$/, '');
        }

        fs.writeFileSync(absolutePath, cleanedResult);
        console.log(`\n✓ ${action} completed successfully.`);
        console.log(`✓ Original backed up to: ${path.basename(backupPath)}`);
        console.log(`✓ Result written to: ${path.basename(absolutePath)}`);
    }
}

main().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
