// Minimal tools for the agent, served over MCP stdio (newline-delimited JSON-RPC).
// Usage: node tools.mjs <workdir>. Paths are relative to workdir.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

const workdir = process.argv[2];
const resolve = (p) => path.resolve(workdir, p);

const TOOLS = [
  {
    name: 'read_file',
    description: 'Read a file.',
    inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] },
    run: ({ path: p }) => fs.readFileSync(resolve(p), 'utf8'),
  },
  {
    name: 'write_file',
    description: 'Create or overwrite a file.',
    inputSchema: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } }, required: ['path', 'content'] },
    run: ({ path: p, content }) => {
      const file = resolve(p);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, content);
      return `wrote ${p}`;
    },
  },
  {
    name: 'run_command',
    description: 'Run a shell command and return its output.',
    inputSchema: { type: 'object', properties: { command: { type: 'string' } }, required: ['command'] },
    run: ({ command }) => {
      const res = spawnSync('sh', ['-c', command], { cwd: workdir, encoding: 'utf8', timeout: 60_000 });
      return `${res.stdout}${res.stderr}exit code ${res.status ?? res.signal}`;
    },
  },
];

const reply = (id, result) => process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result }) + '\n');

readline.createInterface({ input: process.stdin }).on('line', (line) => {
  const { id, method, params } = JSON.parse(line);
  if (method === 'initialize') {
    reply(id, { protocolVersion: params.protocolVersion, capabilities: { tools: {} }, serverInfo: { name: 'tools', version: '1' } });
  } else if (method === 'tools/list') {
    reply(id, { tools: TOOLS.map(({ run, ...t }) => t) });
  } else if (method === 'tools/call') {
    const tool = TOOLS.find((t) => t.name === params.name);
    try {
      reply(id, { content: [{ type: 'text', text: tool.run(params.arguments ?? {}) }] });
    } catch (e) {
      reply(id, { content: [{ type: 'text', text: e.message }], isError: true });
    }
  } else if (id !== undefined) {
    reply(id, {});
  }
});
