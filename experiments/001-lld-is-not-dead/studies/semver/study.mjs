// node-semver and its degraded twin. Each task starts from a fresh baseline, and each
// trial also reruns the variant's original upstream suite (its test/ folder) against
// the agent's code, so a fix that breaks existing behaviour fails.
// A task's prompt is tasks/<id>.md; test paths are relative to this folder.
const ids = ['t1-uppercase-v', 't2-prerelease-tags', 't3-natural-prerelease', 't4-compatible-release'];

export default {
  variants: ['good', 'bad'],
  chained: false,
  upstreamSuite: 'test',
  tasks: ids.map((id) => ({ id, tests: [`tasks/${id}.test.mjs`] })),
};
