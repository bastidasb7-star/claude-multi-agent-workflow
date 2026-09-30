#!/usr/bin/env node
// PostToolUse hook: lint the JS file Claude just wrote or edited.
// Uses the ESLint installed in the nearest project (walking up from the file),
// so the plugin ships no linter of its own. Exit 2 feeds the errors back to
// Claude; anything else (no ESLint, not a JS file, bad input) exits 0 silently.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function readStdin() {
  try {
    return JSON.parse(fs.readFileSync(0, 'utf8'));
  } catch {
    return null;
  }
}

function findEslint(startDir) {
  let dir = startDir;
  for (;;) {
    const bin = path.join(dir, 'node_modules', 'eslint', 'bin', 'eslint.js');
    if (fs.existsSync(bin)) return { bin, root: dir };
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

const input = readStdin();
const filePath = input && input.tool_input && input.tool_input.file_path;
if (!filePath || !/\.(c|m)?js$/.test(filePath) || !fs.existsSync(filePath)) process.exit(0);

const eslint = findEslint(path.dirname(path.resolve(filePath)));
if (!eslint) process.exit(0);

// Call ESLint through node directly (no shell), so paths with spaces or
// characters like "&" work on Windows too.
const result = spawnSync(process.execPath, [eslint.bin, '--no-warn-ignored', path.resolve(filePath)], {
  cwd: eslint.root,
  encoding: 'utf8',
});

if (result.status === 1) {
  process.stderr.write(`ESLint found problems in ${filePath}:\n${result.stdout}${result.stderr}`);
  process.exit(2);
}
process.exit(0);
