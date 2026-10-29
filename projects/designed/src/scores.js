import fs from 'node:fs';

export const loadScores = (file) => {
  const scores = { X: 0, O: 0, draws: 0 };
  try {
    return { ...scores, ...JSON.parse(fs.readFileSync(file, 'utf8')) };
  } catch {
    return scores;
  }
};

export const saveScores = (file, scores) => fs.writeFileSync(file, JSON.stringify(scores));

export const recordResult = (scores, result) =>
  result === 'DRAW'
    ? { ...scores, draws: scores.draws + 1 }
    : { ...scores, [result]: scores[result] + 1 };

export const formatScores = (s) => `SCORES X=${s.X} O=${s.O} draws=${s.draws}`;
