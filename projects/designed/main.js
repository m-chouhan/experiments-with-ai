import fs from 'node:fs';
import { playGame } from './src/game.js';
import { formatScores, loadScores, recordResult, saveScores } from './src/scores.js';

const parseArgs = (argv) => {
  const opts = { ai: null, scores: 'scores.json' };
  for (let i = 0; i < argv.length; i += 2) {
    if (argv[i] === '--ai') opts.ai = argv[i + 1];
    if (argv[i] === '--scores') opts.scores = argv[i + 1];
  }
  return opts;
};

const readInputs = () => {
  const lines = fs.readFileSync(0, 'utf8').split('\n');
  if (lines.at(-1) === '') lines.pop();
  return lines;
};

const opts = parseArgs(process.argv.slice(2));
const result = playGame({ size: 3, aiMark: opts.ai, inputs: readInputs(), print: console.log });

if (result === 'INCOMPLETE') {
  console.log('INCOMPLETE');
} else {
  console.log(result === 'DRAW' ? 'DRAW' : `WINNER ${result}`);
  const scores = recordResult(loadScores(opts.scores), result);
  saveScores(opts.scores, scores);
  console.log(formatScores(scores));
}
