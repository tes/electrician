/* eslint no-console: 0 */
const electrician = require('..');

// COMPONENTS IMPLEMENTATIONS
const NoDepComponent = (name) => ({
  start: (next) => {
    console.log(`Starting: Component ${name}`);
    next(null, `Component ${name}`);
  },
  stop: (next) => {
    console.log(`Stopping: Component ${name}`);
    next();
  },
});

const OneDepComponent = (name, dep1) => ({
  dependsOn: [dep1],
  start: (dep, next) => {
    console.log(`Starting: Component ${name}`);
    console.log(`\tDependency: ${dep}`);
    next(null, `Component ${name}`);
  },
  stop: (next) => {
    console.log(`Stopping: Component ${name}`);
    next();
  },
});

const TwoDepComponent = (name, deps) => ({
  dependsOn: deps,
  start: (firstDep, secondDep, next) => {
    console.log(`Starting: Component ${name}`);
    console.log(`\t1st dependency: ${firstDep}`);
    console.log(`\t2nd dependency: ${secondDep}`);
    next(null, `Component ${name}`);
  },
  stop: (next) => {
    console.log(`Stopping: Component ${name}`);
    next();
  },
});

// COMPOSE SYSTEM
const system = electrician.system({
  A: NoDepComponent('A'),
  B: TwoDepComponent('B', ['A', 'C']),
  C: OneDepComponent('C', 'A'),
  D: OneDepComponent('D', 'C'),
});

// START SYSTEM
system.start(err => {
  if (err) {
    return console.error(err);
  }
  console.log('System started');
});

// STOP SYSTEM
system.stop(err => {
  if (err) {
    return console.error(err);
  }
  console.log('System stopped');
});
