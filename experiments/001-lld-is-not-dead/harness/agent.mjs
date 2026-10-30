// The agent under test: Claude Code in print mode with its own system prompt and tools, no
// user settings or MCP servers, confined by macOS sandbox-exec so it cannot read this repo
// (where the hidden tests live) or write outside its working copy.
import { spawnSync } from 'node:child_process';
import os from 'node:os';

export const MODELS = { sonnet: 'claude-sonnet-5-5', haiku: 'claude-haiku-4-5-20251001' };
const TOOLS = 'Read,Edit,Write,Bash,Glob,Grep';

const sandboxProfile = (workdir, hiddenDir) => {
  const home = os.homedir();
  const writable = [
    `(subpath "${workdir}")`,
    `(subpath "${home}/.claude")`,
    `(regex #"^${home}/\\.claude\\.json")`,
    `(subpath "/private/var/folders")`,
    `(subpath "/private/tmp")`,
    `(subpath "/dev")`,
  ];
  return `(version 1)
(allow default)
(deny file-read* file-write* (subpath "${hiddenDir}"))
(deny file-write*
  (require-all
    ${writable.map((rule) => `(require-not ${rule})`).join('\n    ')}))`;
};

// Returns Claude's raw stream-json output and the wall time in seconds.
export const runAgent = (workdir, prompt, model, hiddenDir) => {
  const started = Date.now();
  const res = spawnSync('sandbox-exec', ['-p', sandboxProfile(workdir, hiddenDir), 'claude',
    '-p', prompt,
    '--model', model,
    '--output-format', 'stream-json', '--verbose',
    '--settings', JSON.stringify({ showThinkingSummaries: true }),
    '--permission-mode', 'acceptEdits',
    '--tools', TOOLS,
    '--allowedTools', TOOLS,
    '--setting-sources', 'project,local',
    '--strict-mcp-config',
    '--no-session-persistence',
  ], { cwd: workdir, encoding: 'utf8', timeout: 20 * 60 * 1000, maxBuffer: 256 * 1024 * 1024 });
  return { stream: res.stdout ?? '', wall_s: Math.round((Date.now() - started) / 1000) };
};
