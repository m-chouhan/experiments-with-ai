// Parking-lot CLI, one main.js per variant. The two changes are chained: change2 is
// made on top of the agent's own change1, in the same repo.
// A task's prompt is tasks/<id>.md; test paths are relative to this folder.
export default {
  variants: ['good', 'bad'],
  chained: true,
  tasks: [
    { id: 'change1', tests: ['baseline.test.js', 'tasks/change1.test.js'] },
    { id: 'change2', tests: ['baseline.test.js', 'tasks/change1.test.js', 'tasks/change2.test.js'] },
  ],
};
