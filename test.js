const functionArguments = require('fn-args');

const pause = (x) => new Promise(resolve => {
  setTimeout(() => {
    resolve();
  }, x * 1000);
});

const config = {
  config: {
    start: () => {}
  },
  endpoints: {
    start: () => {}
  },
  app:
  {
    dependsOn: [ 'config' ],
    start: (config, next) => { next();}
  },
  postgres:
  {
    dependsOn: [ 'config' ],
    start: (config, next) => { next();}
  },
  rascal:
  {
    dependsOn: [ 'config' ],
    start: (config, next) => { next();}
  },
  features:
  {
    dependsOn: [ 'config', 'endpoints' ],
    start: (config, endpoints, next) => { next();}
  },
  mysql:
  {
    dependsOn: [ 'config', 'endpoints' ],
    start: (config, endpoints, next) => { next();}
  },
  refdata:
  {
    dependsOn: [ 'config' ],
    start: (config, next) => { next();}
  },
  mongodb:
  {
    dependsOn: [ 'config' ],
    start: (config, next) => { next();}
  },
  service:
  {
    dependsOn: [ 'app', 'rascal', 'mongodb', 'refdata', 'config', 'metrics' ],
    start: (app, rascal, mongodb, refdata, config, metrics, next) => { next();}
  },
  server:
  {
    start: (config, app, service) => {}
  },
  metrics:
  {
    // dependsOn: [ 'config' ],
    start: async (config) => { await pause(2)}
  }
};

const shake = function(tree, key) {
  const dependencies = tree[key].dependsOn || functionArguments(tree[key].start);

  if (!dependencies) { return key; }
  return dependencies.concat(...dependencies.map(traversingKey => shake(tree, traversingKey)));
};

const prepare = (tree, start) => {
  let allDeps = shake(tree, start);

  const reversed = allDeps.reverse();
  const uniq = [...new Set(reversed)];

  return uniq;
};

let result = prepare(config, 'server');

console.log({ result });
const expected = [ 'config', 'metrics', 'refdata', 'mongodb', 'rascal', 'app', 'service' ];

const same = (JSON.stringify(result) ==  JSON.stringify(expected));

console.log({ same });


