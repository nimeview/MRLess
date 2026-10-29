#!/usr/bin/env bun
/**
 * One-shot desktop launcher: starts the local mesh node, then Vite UI.
 * Laptop = its own node. Phone (iOS app) = another node. No manual `mrless`.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const uiRoot = resolve(__dirname, '..');
const serverRoot = resolve(uiRoot, '../MRLess_server');

const instance = process.env.MRLESS_INSTANCE || 'mac';
const meshPort = process.env.MRLESS_MESH_PORT || '7421';
const wsPort = process.env.MRLESS_WS_PORT || '7422';
const uiPort = process.env.MRLESS_UI_PORT || '3000';
const name = process.env.MRLESS_NAME || undefined;

function findMrless() {
  const release = join(serverRoot, 'target/release/mrless');
  const debug = join(serverRoot, 'target/debug/mrless');
  // Prefer whichever binary is newer so debug iteration isn't shadowed by a stale release.
  const mtime = (p) => {
    try {
      return Bun.file(p).lastModified;
    } catch {
      return 0;
    }
  };
  const hasR = existsSync(release);
  const hasD = existsSync(debug);
  if (hasR && hasD) return mtime(debug) > mtime(release) ? debug : release;
  if (hasR) return release;
  if (hasD) return debug;
  return null;
}

async function ensureMrless() {
  let bin = findMrless();
  if (bin) return bin;
  console.log('[mrless] building node…');
  await run(join(serverRoot, ''), 'cargo', ['build', '--release'], { cwd: serverRoot });
  bin = findMrless();
  if (!bin) throw new Error('mrless binary missing after build');
  return bin;
}

function run(label, cmd, args, opts = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(cmd, args, {
      stdio: 'inherit',
      cwd: opts.cwd,
      env: { ...process.env, ...opts.env },
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`${label} exited ${code}`));
    });
  });
}

const kids = [];

function shutdown() {
  for (const k of kids.splice(0)) {
    try {
      k.kill('SIGTERM');
    } catch {
      /* ignore */
    }
  }
}

async function portBusy(port) {
  try {
    const s = Bun.listen({
      hostname: '127.0.0.1',
      port: Number(port),
      socket: { data() {}, open() {}, close() {}, error() {} },
    });
    s.stop(true);
    return false;
  } catch {
    return true;
  }
}

async function waitPortFree(port, label) {
  if (!(await portBusy(port))) return;
  console.warn(`[mrless] ${label} port ${port} is busy — waiting for it to free…`);
  for (let i = 0; i < 20; i++) {
    await Bun.sleep(250);
    if (!(await portBusy(port))) return;
  }
  throw new Error(
    `${label} port ${port} still in use. Stop the other process, then retry.`,
  );
}

process.on('SIGINT', () => {
  shutdown();
  process.exit(0);
});
process.on('SIGTERM', () => {
  shutdown();
  process.exit(0);
});

await waitPortFree(wsPort, 'websocket');
await waitPortFree(uiPort, 'ui');

const bin = await ensureMrless();
const nodeArgs = [
  '--instance',
  instance,
  '--mesh-port',
  String(meshPort),
  '--ws-port',
  String(wsPort),
];
if (name) nodeArgs.push('--name', name);

console.log(`[mrless] node · instance=${instance} mesh=${meshPort} ws=${wsPort}`);
const node = spawn(bin, nodeArgs, {
  stdio: 'inherit',
  cwd: serverRoot,
});
kids.push(node);
node.on('exit', (code) => {
  console.error(`[mrless] node exited (${code ?? '?'})`);
  shutdown();
  process.exit(code ?? 1);
});

// Give the node a moment to bind WS before Vite opens.
await Bun.sleep(600);

console.log(`[mrless] ui · http://127.0.0.1:${uiPort} → ws://127.0.0.1:${wsPort}`);
const vite = spawn('bun', ['x', 'vite', '--port', String(uiPort)], {
  stdio: 'inherit',
  cwd: uiRoot,
  env: {
    ...process.env,
    VITE_MRLESS_WS: `ws://127.0.0.1:${wsPort}`,
  },
});
kids.push(vite);
vite.on('exit', (code) => {
  shutdown();
  process.exit(code ?? 0);
});
