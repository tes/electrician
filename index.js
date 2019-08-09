var util = require('util');
var debug = require('debug')('electrician');
var async = require('async');
var _ = require('lodash');
var Toposort = require('toposort-class');

function startSequenceSync(components) {
  var nameDeps = _(components).toPairs().map(function (pair) {
    return [_.head(pair), _.last(pair).dependsOn];
  });
  var withDeps = nameDeps.filter(_.last);
  var noDeps = nameDeps.difference(withDeps).map(_.head).value();

  return _.uniq(
    withDeps
      .reduce(function (acc, pair) {
        return acc.add(_.head(pair), _.last(pair));
      }, new Toposort())
      .sort()
      .reverse()
      .concat(noDeps));
}

function startSequence(components, next) {
  try {
    next(null, startSequenceSync(components));
  } catch (err) {
    next(err);
  }
}

function stopSequence(components, next) {
  try {
    next(null, startSequenceSync(components).reverse());
  } catch (err) {
    next(err);
  }
}

function toComponentError(id, err) {
  err.message = id + ': ' + err.message;
  return err;
}

function toObject(key, value) {
  var obj = {};
  obj[key] = value;
  return obj;
}

function startComponent(ctx, component, id, next) {
  var depIds = [].concat(component.dependsOn || []);
  var dependencies = _.map(depIds, function (depId) {
    return ctx[depId];
  });
  debug('Resolving ' + dependencies.length + ' dependencies for component ' + id);
  var argc = component.start.length;
  var args = dependencies.slice(0, argc - 1);
  args[argc - 1] = function (err, started) {
    if (err) return next(toComponentError(id, err));
    next(null, _.assign(ctx, toObject(id, started)));
  };

  component.start.apply(component, args);
}

function stopComponent(ctx, component, id, next) {
  debug('Stopping component ' + id);
  component.stop(function (err) {
    if (err) return next(toComponentError(id, err));
    next();
  });
}

function exists(obj) {
  return obj !== null && obj !== undefined;
}

function system(components) {
  var ctx = {};

  function start(next) {
    ctx = {};
    startSequence(components, function (err, sequence) {
      if (err) return next(err);
      async.reduce(sequence, ctx, function (acc, key, next) {
        var component = components[key];
        debug('Starting component ' + key);
        if (!exists(component)) {
          return next(new Error('Unknown component: ' + key));
        }
        if (!component.start) return next(null, acc);
        startComponent(ctx, component, key, next);
      }, next);
    });
  }

  function stop(next) {
    stopSequence(components, function (err, sequence) {
      if (err) return next(err);
      async.eachSeries(sequence, function (key, next) {
        var component = components[key];
        if (!components[key].stop) return next();
        stopComponent(ctx, component, key, next);
      }, next);
    });
  }

  function promiseWrapper(fn) {
    return function (next) {
      var expectingPromise = !next;
      if (expectingPromise) {
        var promisifiedFn = util.promisify(fn);
        return promisifiedFn();
      }
      fn(next);
    };
  }

  return {
    start: promiseWrapper(start),
    stop: promiseWrapper(stop),
  };
}

module.exports = {
  system: system,
};
