/* eslint no-console: 0 */
const electrician = require('..');

// COMPOSE SYSTEM
const system = electrician.system({
  A: {
    start: () => {
      console.log('Starting: Component A');
      return 'Component A';
    },
    stop: () => {
      console.log('Stopping: Component A');
    },
  },
  B: {
    start: (A, C) => {
      console.log('Starting: Component B');
      console.log('\t1st dependency: ', A);
      console.log('\t2nd dependency: ', C);
      return 'Component B';
    },
    stop: () => {
      console.log('Stopping: Component B');
    },
  },
  C: {
    start: (A) => {
      console.log('Starting: Component C');
      console.log('\tDependency: ', A);
      return 'Component C';
    },
    stop: () => {
      console.log('Stopping: Component C');
    },
  },
  D: {
    start: (C) => {
      console.log('Starting: Component D');
      console.log('\tDependency: ', C);
      return 'Component D';
    },
    stop: () => {
      console.log('Stopping: Component D');
    },
  },
});

(async () => {
  // START SYSTEM
  await system.start();
  console.log('System started');

  // STOP SYSTEM
  await system.stop();
  console.log('System stopped');
})();
