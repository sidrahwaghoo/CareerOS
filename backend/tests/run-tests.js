'use strict';

// Test runner for the Credensa agentic pipeline suite.
//
// Responsibilities:
//   1. Spawn a dedicated backend on PORT=3002 (the existing port-3001 server is
//      left completely untouched).
//   2. Poll GET /api/health until the spawned backend reports status "ok".
//   3. Run `node --test tests/` with stdio inherited so results stream live.
//   4. Always kill the spawned server in a finally block.
//
// Uses only Node.js built-ins. No npm dependencies are added.

const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const BACKEND_DIR = path.resolve(__dirname, '..');
const PORT = 3002;
const HEALTH_URL = `http://localhost:${PORT}/api/health`;
const STARTUP_TIMEOUT_MS = 15000;
const POLL_INTERVAL_MS = 250;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Poll the health endpoint until it responds with status "ok". */
async function waitForHealth(serverState) {
  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  let lastError = null;

  while (Date.now() < deadline) {
    if (serverState.error) {
      throw new Error(`Backend process failed to start: ${serverState.error.message}`);
    }
    if (serverState.exit) {
      throw new Error(
        `Backend process exited before becoming healthy ` +
          `(code=${serverState.exit.code}, signal=${serverState.exit.signal}).\nServer output:\n${serverState.output}`
      );
    }

    try {
      const response = await fetch(HEALTH_URL);
      if (response.ok) {
        const body = await response.json();
        if (body && body.status === 'ok') return body;
      }
    } catch (err) {
      lastError = err;
    }

    await sleep(POLL_INTERVAL_MS);
  }

  const portHint = /EADDRINUSE|address already in use/i.test(serverState.output)
    ? ` Port ${PORT} appears to be already in use by another process.`
    : '';
  throw new Error(
    `Backend on port ${PORT} did not become healthy within ${STARTUP_TIMEOUT_MS}ms.${portHint}` +
      `${lastError ? ` Last fetch error: ${lastError.message}` : ''}\nServer output:\n${serverState.output}`
  );
}

/**
 * Discover every *.test.js in the tests directory and run the Node test runner
 * on them from the backend directory, streaming output live.
 *
 * Note: passing the directory itself (`node --test tests/`) fails on Windows
 * with Node 24 (MODULE_NOT_FOUND), so test files are enumerated explicitly.
 * This is equivalent to running the whole tests/ directory and also guarantees
 * run-tests.js itself is never picked up as a test file.
 */
function runNodeTest() {
  const testsDir = path.join(BACKEND_DIR, 'tests');
  const testFiles = fs.readdirSync(testsDir)
    .filter((file) => file.endsWith('.test.js'))
    .map((file) => path.join('tests', file));

  if (testFiles.length === 0) {
    throw new Error(`No *.test.js files found in ${testsDir}`);
  }
  console.log(`[runner] Discovered test files: ${testFiles.join(', ')}`);

  return new Promise((resolve) => {
    const child = spawn(process.execPath, ['--test', ...testFiles], {
      cwd: BACKEND_DIR,
      stdio: 'inherit',
      // Marker prevents this runner from recursing if it is ever loaded as a
      // test candidate by another runner.
      env: { ...process.env, CREDENSA_TEST_CHILD: '1' },
    });

    child.on('error', (err) => {
      console.error('[runner] Failed to start the test process:', err);
      resolve(1);
    });
    child.on('exit', (code, signal) => {
      if (signal) console.log(`[runner] Test process terminated by signal ${signal}`);
      resolve(code === null ? 1 : code);
    });
  });
}

async function main() {
  const serverState = { error: null, exit: null, output: '' };
  let server = null;
  let exitCode = 1;

  try {
    console.log(`[runner] Starting backend on PORT=${PORT} (cwd=${BACKEND_DIR})...`);
    server = spawn(process.execPath, ['server.js'], {
      cwd: BACKEND_DIR,
      env: { ...process.env, PORT: String(PORT) },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    server.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      serverState.output += text;
      process.stdout.write(`[server] ${text}`);
    });
    server.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      serverState.output += text;
      process.stderr.write(`[server:err] ${text}`);
    });
    server.on('error', (err) => {
      serverState.error = err;
    });
    server.on('exit', (code, signal) => {
      serverState.exit = { code, signal };
    });

    const health = await waitForHealth(serverState);
    console.log(`[runner] Backend healthy: storage=${health.storage}, ai=${health.ai}`);

    console.log('[runner] Running Node test runner on tests/');
    exitCode = await runNodeTest();
    console.log(`[runner] Test process exited with code ${exitCode}`);
  } catch (err) {
    console.error(`[runner] ERROR: ${err.message}`);
    exitCode = 1;
  } finally {
    if (server && !serverState.exit) {
      console.log('[runner] Stopping spawned backend...');
      server.kill('SIGTERM');
      await Promise.race([
        new Promise((resolve) => server.once('exit', resolve)),
        sleep(2000),
      ]);
      if (!serverState.exit) {
        console.log('[runner] Backend did not exit on SIGTERM; sending SIGKILL.');
        server.kill('SIGKILL');
      }
      console.log('[runner] Spawned backend stopped.');
    }
  }

  process.exitCode = exitCode;
}

// Defensive guard: if node --test discovers this file, do nothing.
if (process.env.CREDENSA_TEST_CHILD !== '1') {
  main();
}
