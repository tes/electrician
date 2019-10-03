const debug = require('debug')('electrician');
const async = require('async');
const _ = require('lodash');
const Toposort = require('toposort-class');

const startSequenceSync = components => {
  const nameDeps = _(components)
    .toPairs()
    .map(pair => [_.head(pair), _.last(pair).dependsOn]);
  const withDeps = nameDeps.filter(_.last);
  const noDeps = nameDeps.difference(withDeps)
    .map(_.head)
    .value();

  return _.uniq(
    withDeps
      .reduce((acc, pair) => acc.add(_.head(pair), _.last(pair)), new Toposort())
      .sort()
      .reverse()
      .concat(noDeps)
  );
};

const startSequence = (components, next) => {
  try {
    next(null, startSequenceSync(components));
  } catch (err) {
    next(err);
  }
};

const stopSequence = (components, next) => {
  try {
    next(null, startSequenceSync(components)
      .reverse());
  } catch (err) {
    next(err);
  }
};

const toComponentError = (id, err) => {
  err.message = `${id}: ${err.message}`;
  return err;
};

const toObject = (key, value) => {
  const obj = {};
  obj[key] = value;
  return obj;
};

const startComponent = (ctx, component, id, next) => {
  const depIds = [].concat(component.dependsOn || []);
  const dependencies = _.map(depIds, depId => ctx[depId]);
  debug(`Resolving ${dependencies.length} dependencies for component ${id}`);
  const argc = component.start.length;
  const args = dependencies.slice(0, argc - 1);
  args[argc - 1] = (err, started) => {
    if (err) {
      return next(toComponentError(id, err));
    }
    next(null, _.assign(ctx, toObject(id, started)));
  };

  component.start(...args);
};

const stopComponent = (ctx, component, id, next) => {
  debug(`Stopping component ${id}`);
  component.stop(err => {
    if (err) {
      return next(toComponentError(id, err));
    }
    next();
  });
};

const exists = obj => obj !== null && obj !== undefined;

const system = components => {
  let ctx = {};

  const start = next => {
    ctx = {};
    startSequence(components, (err, sequence) => {
      if (err) {
        return next(err);
      }
      async.reduce(sequence, ctx, (acc, key, innerNext) => {
        const component = components[key];
        debug(`Starting component ${key}`);
        if (!exists(component)) {
          return innerNext(new Error(`Unknown component: ${key}`));
        }
        if (!component.start) {
          return innerNext(null, acc);
        }
        startComponent(ctx, component, key, innerNext);
      }, next);
    });
  };

  const stop = next => {
    stopSequence(components, (err, sequence) => {
      if (err) {
        return next(err);
      }
      async.eachSeries(sequence, (key, innerNext) => {
        const component = components[key];
        if (!components[key].stop) {
          return innerNext();
        }
        stopComponent(ctx, component, key, innerNext);
      }, next);
    });
  };

  return {
    start,
    stop,
  };
};

module.exports = {
  system,
};
