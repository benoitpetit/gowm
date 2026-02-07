#!/usr/bin/env node

/**
 * GoWM CLI — Command-line interface for Go WASM module management
 * 
 * Usage:
 *   npx gowm list <repo>                     List available modules in a repository
 *   npx gowm info <repo> <module>             Show module.json metadata
 *   npx gowm types <repo> <module> [--out]    Generate TypeScript types from module.json
 *   npx gowm verify <file> --integrity <hash> Verify WASM file integrity
 *   npx gowm install <repo> <module> [--dir]  Download WASM module to local directory
 * 
 * @version 1.1.1
 */

const fs = require('fs');
const path = require('path');

const HELP = `
GoWM CLI v1.1.1 — Go WebAssembly Module Manager

Usage:
  gowm <command> [arguments] [options]

Commands:
  list <repo>                         List modules in a GitHub repository
  info <repo> <module>                Show module.json metadata
  types <repo> <module> [--out file]  Generate TypeScript types
  verify <file> --integrity <hash>    Verify WASM file SHA256 integrity
  install <repo> <module> [--dir d]   Download module to local directory

Options:
  --branch <name>   Git branch (default: master)
  --out <file>      Output file path
  --dir <path>      Target directory (default: ./)
  --help, -h        Show this help
  --version, -v     Show version

Examples:
  gowm list benoitpetit/wasm-modules-repository
  gowm info benoitpetit/wasm-modules-repository math-wasm
  gowm types benoitpetit/wasm-modules-repository math-wasm --out math-wasm.d.ts
  gowm verify ./main.wasm --integrity sha256-roLCI1vD1aDH6m/yC5zY2RF39zwjDtbUvBB+y8yaidQ=
  gowm install benoitpetit/wasm-modules-repository math-wasm --dir ./wasm
`;

async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
        console.log(HELP);
        process.exit(0);
    }

    if (args.includes('--version') || args.includes('-v')) {
        console.log('gowm v1.1.1');
        process.exit(0);
    }

    const command = args[0];

    try {
        switch (command) {
            case 'list':
                await cmdList(args.slice(1));
                break;
            case 'info':
                await cmdInfo(args.slice(1));
                break;
            case 'types':
                await cmdTypes(args.slice(1));
                break;
            case 'verify':
                await cmdVerify(args.slice(1));
                break;
            case 'install':
                await cmdInstall(args.slice(1));
                break;
            default:
                console.error(`Unknown command: ${command}\nRun 'gowm --help' for usage.`);
                process.exit(1);
        }
    } catch (error) {
        console.error(`\x1b[31mError:\x1b[0m ${error.message}`);
        process.exit(1);
    }
}

function getOption(args, name, defaultValue = null) {
    const idx = args.indexOf(name);
    if (idx === -1 || idx === args.length - 1) return defaultValue;
    return args[idx + 1];
}

function hasFlag(args, name) {
    return args.includes(name);
}

async function fetchJSON(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
    return response.json();
}

async function fetchText(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
    return response.text();
}

// ── list ────────────────────────────────────────────────────────────────────

async function cmdList(args) {
    const repo = args[0];
    if (!repo || !repo.includes('/')) {
        throw new Error('Usage: gowm list <owner/repo>');
    }
    const branch = getOption(args, '--branch', 'master');
    const [owner, repoName] = repo.split('/');

    console.log(`\x1b[36m📦 Listing modules in ${repo} (${branch})\x1b[0m\n`);

    // Use GitHub API to list directories
    const apiUrl = `https://api.github.com/repos/${owner}/${repoName}/contents?ref=${branch}`;
    const contents = await fetchJSON(apiUrl);

    const wasmDirs = contents
        .filter(c => c.type === 'dir' && c.name.endsWith('-wasm'))
        .map(c => c.name);

    if (wasmDirs.length === 0) {
        console.log('No WASM modules found.');
        return;
    }

    // Fetch module.json for each directory
    const results = await Promise.allSettled(
        wasmDirs.map(async dir => {
            try {
                const url = `https://raw.githubusercontent.com/${owner}/${repoName}/${branch}/${dir}/module.json`;
                const meta = await fetchJSON(url);
                return { dir, meta };
            } catch {
                return { dir, meta: null };
            }
        })
    );

    console.log(`Found \x1b[33m${wasmDirs.length}\x1b[0m module(s):\n`);
    console.log('  %-20s %-10s %-12s %s', 'Module', 'Version', 'Functions', 'Description');
    console.log('  ' + '─'.repeat(75));

    for (const result of results) {
        if (result.status !== 'fulfilled') continue;
        const { dir, meta } = result.value;
        const version = meta?.version || '?';
        const funcs = meta?.functions?.length || '?';
        const desc = meta?.description ? meta.description.substring(0, 35) : '—';
        console.log(`  %-20s %-10s %-12s %s`, dir, version, `${funcs} funcs`, desc);
    }
    console.log('');
}

// ── info ────────────────────────────────────────────────────────────────────

async function cmdInfo(args) {
    const repo = args[0];
    const moduleName = args[1];
    if (!repo || !moduleName) {
        throw new Error('Usage: gowm info <owner/repo> <module>');
    }
    const branch = getOption(args, '--branch', 'master');
    const [owner, repoName] = repo.split('/');

    const url = `https://raw.githubusercontent.com/${owner}/${repoName}/${branch}/${moduleName}/module.json`;
    const meta = await fetchJSON(url);

    console.log(`\x1b[36m📋 ${meta.name} v${meta.version}\x1b[0m`);
    console.log(`   ${meta.description || '—'}\n`);

    if (meta.author) console.log(`  Author:       ${meta.author}`);
    if (meta.license) console.log(`  License:      ${meta.license}`);
    if (meta.size) console.log(`  Size:         ${(meta.size / 1024 / 1024).toFixed(1)} MB`);
    if (meta.gzipSize) console.log(`  Compressed:   ${(meta.gzipSize / 1024 / 1024).toFixed(1)} MB`);

    if (meta.gowmConfig) {
        console.log(`  Error pattern: ${meta.gowmConfig.errorPattern || '—'}`);
        console.log(`  Ready signal:  ${meta.gowmConfig.readySignal || '—'}`);
    }

    if (meta.compatibility) {
        if (meta.compatibility.nodejs) console.log(`  Node.js:      ${meta.compatibility.nodejs}`);
        if (meta.compatibility.gowm) console.log(`  GoWM:         ${meta.compatibility.gowm}`);
    }

    if (meta.functions && meta.functions.length > 0) {
        console.log(`\n  \x1b[33mFunctions (${meta.functions.length}):\x1b[0m`);
        for (const fn of meta.functions) {
            const params = (fn.parameters || []).map(p => {
                const opt = p.optional ? '?' : '';
                return `${p.name}${opt}: ${p.type || 'any'}`;
            }).join(', ');
            const ret = fn.returnType ? ` → ${fn.returnType}` : '';
            console.log(`    ${fn.name}(${params})${ret}`);
            if (fn.description) console.log(`      ${fn.description}`);
        }
    }

    if (meta.functionCategories) {
        console.log(`\n  \x1b[33mCategories:\x1b[0m`);
        for (const [cat, funcs] of Object.entries(meta.functionCategories)) {
            console.log(`    ${cat}: ${funcs.join(', ')}`);
        }
    }
    console.log('');
}

// ── types ───────────────────────────────────────────────────────────────────

async function cmdTypes(args) {
    const repo = args[0];
    const moduleName = args[1];
    if (!repo || !moduleName) {
        throw new Error('Usage: gowm types <owner/repo> <module> [--out file]');
    }
    const outFile = getOption(args, '--out');
    const branch = getOption(args, '--branch', 'master');

    const { generateTypesFromGitHub } = require('../tools/type-generator');
    const code = await generateTypesFromGitHub(repo, moduleName, { branch });

    if (outFile) {
        fs.writeFileSync(outFile, code, 'utf-8');
        console.log(`\x1b[32m✅ Types written to ${outFile}\x1b[0m`);
    } else {
        console.log(code);
    }
}

// ── verify ──────────────────────────────────────────────────────────────────

async function cmdVerify(args) {
    const file = args[0];
    const expectedHash = getOption(args, '--integrity');
    if (!file) {
        throw new Error('Usage: gowm verify <file.wasm> --integrity <sha256-hash>');
    }

    if (!fs.existsSync(file)) {
        throw new Error(`File not found: ${file}`);
    }

    const bytes = fs.readFileSync(file);
    const crypto = require('crypto');
    const actualBase64 = crypto.createHash('sha256').update(bytes).digest('base64');
    const actualSRI = `sha256-${actualBase64}`;

    if (expectedHash) {
        const match = expectedHash.match(/^sha256-(.+)$/);
        if (!match) throw new Error(`Invalid integrity format: ${expectedHash}. Expected sha256-<base64>`);

        if (actualBase64 === match[1]) {
            console.log(`\x1b[32m✅ Integrity verified: ${actualSRI}\x1b[0m`);
        } else {
            console.error(`\x1b[31m❌ Integrity mismatch!\x1b[0m`);
            console.error(`  Expected: ${expectedHash}`);
            console.error(`  Actual:   ${actualSRI}`);
            process.exit(1);
        }
    } else {
        console.log(`SHA256 (SRI): ${actualSRI}`);
    }
}

// ── install ─────────────────────────────────────────────────────────────────

async function cmdInstall(args) {
    const repo = args[0];
    const moduleName = args[1];
    if (!repo || !moduleName) {
        throw new Error('Usage: gowm install <owner/repo> <module> [--dir path] [--branch name]');
    }
    const targetDir = getOption(args, '--dir', './');
    const branch = getOption(args, '--branch', 'master');
    const [owner, repoName] = repo.split('/');

    const moduleDir = path.join(targetDir, moduleName);
    if (!fs.existsSync(moduleDir)) {
        fs.mkdirSync(moduleDir, { recursive: true });
    }

    console.log(`\x1b[36m📥 Installing ${moduleName} from ${repo}...\x1b[0m`);

    // Download module.json
    const metaUrl = `https://raw.githubusercontent.com/${owner}/${repoName}/${branch}/${moduleName}/module.json`;
    const metaResponse = await fetch(metaUrl);
    if (!metaResponse.ok) throw new Error(`module.json not found at ${metaUrl}`);
    const metaText = await metaResponse.text();
    fs.writeFileSync(path.join(moduleDir, 'module.json'), metaText);
    console.log('  ✓ module.json');

    // Download main.wasm
    const wasmUrl = `https://raw.githubusercontent.com/${owner}/${repoName}/${branch}/${moduleName}/main.wasm`;
    const wasmResponse = await fetch(wasmUrl);
    if (wasmResponse.ok) {
        const wasmBuffer = Buffer.from(await wasmResponse.arrayBuffer());
        fs.writeFileSync(path.join(moduleDir, 'main.wasm'), wasmBuffer);
        console.log(`  ✓ main.wasm (${(wasmBuffer.length / 1024 / 1024).toFixed(1)} MB)`);
    } else {
        console.log('  ⚠ main.wasm not available (may need to be built)');
    }

    // Download integrity file
    const intUrl = `https://raw.githubusercontent.com/${owner}/${repoName}/${branch}/${moduleName}/main.wasm.integrity`;
    const intResponse = await fetch(intUrl);
    if (intResponse.ok) {
        const intText = await intResponse.text();
        fs.writeFileSync(path.join(moduleDir, 'main.wasm.integrity'), intText.trim());
        console.log('  ✓ main.wasm.integrity');
    }

    const meta = JSON.parse(metaText);
    console.log(`\n\x1b[32m✅ Installed ${meta.name} v${meta.version} to ${moduleDir}\x1b[0m`);
}

main();
