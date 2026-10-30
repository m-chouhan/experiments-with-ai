// Claude Code's stream-json output: the tool calls and usage in it, and a readable step log.
// Shared by the harness and analysis/trajectory.mjs, so both read a run the same way.
const clip = (text, n) => (text.length > n ? `${text.slice(0, n)}…` : text);

export const parse = (stream) => stream.split('\n').filter(Boolean).flatMap((l) => {
  try { return [JSON.parse(l)]; } catch { return []; }
});

// The agent's working directory, as Claude Code reported it at start-up.
export const workdir = (events) => events.find((e) => e.subtype === 'init')?.cwd;

export const toolCalls = (events) => events.filter((e) => e.type === 'assistant')
  .flatMap((e) => e.message.content).filter((b) => b.type === 'tool_use');

export const metrics = (events, wall_s) => {
  const out = events.findLast((e) => e.type === 'result') ?? {};
  const usage = Object.values(out.modelUsage ?? {});
  const sum = (key) => usage.reduce((n, m) => n + (m[key] ?? 0), 0);
  return {
    claude_code_version: events.find((e) => e.subtype === 'init')?.claude_code_version,
    wall_s,
    turns: out.num_turns,
    tool_calls: toolCalls(events).length,
    cost_usd: out.total_cost_usd,
    input_tokens: sum('inputTokens'),
    output_tokens: sum('outputTokens'),
    thinking_tokens: sum('thinkingTokens'),
    cache_read_tokens: sum('cacheReadInputTokens'),
    cache_write_tokens: sum('cacheCreationInputTokens'),
    total_tokens: ['inputTokens', 'outputTokens', 'cacheReadInputTokens', 'cacheCreationInputTokens'].reduce((n, k) => n + sum(k), 0),
    is_error: out.is_error ?? true,
  };
};

export const headline = (m) =>
  `${m.wall_s}s · ${m.turns} turns · ${m.tool_calls} tool calls · ${m.total_tokens} tokens · $${m.cost_usd?.toFixed(3)}`;

const describeCall = ({ name, input }) => {
  if (name === 'Bash') return `Bash\n\n\`\`\`sh\n${clip(input.command, 1500)}\n\`\`\``;
  if (name === 'Edit') return `Edit ${input.file_path}\n\n\`\`\`diff\n${clip(input.old_string, 600).replace(/^/gm, '- ')}\n${clip(input.new_string, 1200).replace(/^/gm, '+ ')}\n\`\`\``;
  if (name === 'Write') return `Write ${input.file_path} (${input.content.length} chars)`;
  return `${name} ${JSON.stringify(input)}`;
};

// Markdown step log: the model's thinking, what it said, each tool call and its result.
export const render = (events, title) => {
  const lines = [`# ${title}`];
  let lastId = null;
  let step = 0;
  for (const e of events) {
    if (e.type === 'assistant') {
      if (e.message.id !== lastId) lines.push(`\n## Step ${++step}`);
      lastId = e.message.id;
      for (const b of e.message.content) {
        if (b.type === 'thinking' && b.thinking) lines.push(`\n**Thinking:** ${b.thinking.trim()}`);
        if (b.type === 'text') lines.push(`\n**Says:** ${b.text.trim()}`);
        if (b.type === 'tool_use') lines.push(`\n**Tool:** ${describeCall(b)}`);
      }
    }
    if (e.type === 'user' && Array.isArray(e.message.content)) {
      for (const b of e.message.content.filter((x) => x.type === 'tool_result')) {
        const text = typeof b.content === 'string' ? b.content : (b.content ?? []).map((x) => x.text ?? '').join('');
        lines.push(`\n**Result${b.is_error ? ' (error)' : ''}:**\n\n\`\`\`\n${clip(text.trim(), 800)}\n\`\`\``);
      }
    }
  }
  return `${lines.join('\n')}\n`;
};
