import express from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import path, { join } from 'path';
import fs from 'fs-extra';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';

const execAsync = promisify(exec);
const app = express();
app.use(express.json());

const NARGO_TOML = `[package]
name = "easy_private_voting_contract"
authors = [""]
compiler_version = ">=0.25.0"
type = "contract"

[dependencies]
aztec = { git="https://github.com/AztecProtocol/aztec-packages/", tag="v0.82.3", directory="noir-projects/aztec-nr/aztec" }
value_note = { git="https://github.com/AztecProtocol/aztec-packages/", tag="v0.82.3", directory="noir-projects/aztec-nr/value-note"}
easy_private_state = { git="https://github.com/AztecProtocol/aztec-packages/", tag="v0.82.3", directory="noir-projects/aztec-nr/easy-private-state"}
uint_note = { git="https://github.com/AztecProtocol/aztec-packages/", tag="v0.82.3", directory="noir-projects/aztec-nr/uint-note"}
compressed_string = { git="https://github.com/AztecProtocol/aztec-packages/", tag="v0.82.3", directory="noir-projects/aztec-nr/compressed-string"}
authwit = { git="https://github.com/AztecProtocol/aztec-packages/", tag="v0.82.3", directory="noir-projects/aztec-nr/authwit"}
`;

// Status endpoint
app.get('/status', (req, res) => {
    res.status(200).json({ status: 'OK' });
});

app.post('/compile', async (req, res) => {
    const { code } = req.body;
    if (!code) {
        return res.status(400).json({ error: 'No code provided' });
    }

    // Create a unique temporary directory
    const tmpDir = path.join(os.tmpdir(), 'texcoco-', uuidv4());
    console.log({ tmpDir });

    try {
        // Create directory and write files
        await fs.ensureDir(path.join(tmpDir, 'src'));
        await fs.writeFile(join(tmpDir, 'src/main.nr'), code);
        await fs.writeFile(join(tmpDir, 'Nargo.toml'), NARGO_TOML);

        // Run the compilation command
        const { stdout, stderr } = await execAsync(
            '/usr/src/aztec-nargo/compile_then_postprocess.sh compile',
            { cwd: tmpDir }
        );

        // Run codegen
        await execAsync(
            'node --no-warnings /usr/src/yarn-project/aztec/dest/bin/index.js codegen target --outdir src/artifacts',
            { cwd: tmpDir }
        );

        // Read all generated artifacts
        const artifactsDir = path.join(tmpDir, 'src/artifacts');
        console.log({ artifactsDir });
        const artifacts: Record<string, string> = {};
        
        if (await fs.pathExists(artifactsDir)) {
            const files = await fs.readdir(artifactsDir);
            for (const file of files) {
                const content = await fs.readFile(path.join(artifactsDir, file), 'utf-8');
                artifacts[file] = content;
            }
        }

        // Send the results
        res.json({
            success: true,
            stdout,
            stderr,
            artifacts
        });
    } catch (error) {
        // Send error details
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            stdout: error instanceof Error ? (error as any).stdout : undefined,
            stderr: error instanceof Error ? (error as any).stderr : undefined
        });
    } finally {
        // Clean up the temporary directory
        try {
            await fs.rm(tmpDir, { recursive: true });
        } catch (error) {
            console.error('Error cleaning up temporary directory:', error);
        }
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 