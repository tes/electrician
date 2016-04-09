// TODO(geophree): shutdown everything on error in the right order
// Build up list as we start, then play it back?  Need to make sure we reject with the first error.  Should keep track if we errored, and not start anything else.
// TODO(geophree): expose components on system
var _ = require('lodash');
var Promise = require('core-js/library/es6/promise');

var findDepCycles = require('./lib/findDepCycles');
var findMissingDeps = require('./lib/findMissingDeps');

var alreadyStopped = Promise.reject(new Error('stop called before start'));
var alreadyStarted = Promise.reject(new Error('start called before stop'));

var is = {
  func: function (f) { return typeof f === 'function'; },
  iterator: function (it) { return it && is.func(it.next); },
};

function normalizeComponent(component) {
  if (!is.func(component)) return component;

  var iterator;
  return {
    start: function (context) {
      iterator = component(context);
      if (!is.iterator(iterator)) {
        return Promise.resolve(iterator);
      }
      return Promise.resolve(iterator.next().value);
    },
    stop: function () {
      if (!is.iterator(iterator)) {
        return Promise.resolve();
      }
      return Promise.resolve(iterator.next().value);
    },
    dependencies: component.dependencies,
  };
}

function prepareComponent(action, component) {
  var exec;
  var promise = new Promise(function (resolve, reject) {
    exec = function (ctx) {
      var func = component[action] || function () {};
      Promise.resolve().then(function () {
        return func.call(component, ctx);
      }).then(resolve, reject);
      return promise;
    };
  });

  return {
    promise: promise,
    exec: exec,
  };
}

function system(rawComponents) {
  var deps;
  var promises;
  var context;
  var startingPromise = alreadyStopped;
  var stoppingPromise = Promise.resolve();
  var components = _.mapValues(rawComponents, normalizeComponent);
  var missingDeps = findMissingDeps(components);

  function makeDepsPromise(action, actionDeps) {
    return Promise.all(_.map(actionDeps, function (dep) {
      var depPromise = promises[action][dep];
      if (!depPromise) return Promise.reject(new Error('Unknown component: ' + dep));
      return depPromise;
    }));
  }

  function runExecAfterDeps(action, name, exec) {
    var actionDeps = deps[action][name];
    var startDeps = deps.start[name];

    if (!actionDeps.length) return exec({});

    return makeDepsPromise(action, actionDeps).then(function (doneDeps) {
      if (action === 'start') return doneDeps;
      return makeDepsPromise('start', startDeps);
    }).then(function (doneDeps) {
      return exec(_.zipObject(startDeps, doneDeps));
    });
  }

  function runAction(action, each) {
    var execs = {};
    _.forOwn(context, function (contextObj, name) {
      deps.start[name] = [];
      deps.stop[name] = [];
      promises[action][name] = Promise.resolve(contextObj);
      execs[name] = function () { };
    });

    _.forOwn(components, function (component, name) {
      if (context[name]) return;
      deps.start[name] = component.dependencies || [];
      deps.stop[name] = deps.stop[name] || [];
      var prep = prepareComponent(action, component);
      promises[action][name] = prep.promise;
      if (each) each(component, name);
      execs[name] = prep.exec;
    });

    var cycles = findDepCycles(deps.start);
    if (cycles.length) {
      var error = new Error('Cyclical dependencies found: ' + _.map(cycles, JSON.stringify).join(', '));
      error.cycles = cycles;
      return Promise.reject(error);
    }

    var allExecs = [];
    _.forOwn(execs, function (exec, name) {
      allExecs.push(runExecAfterDeps(action, name, exec));
    });

    var allDeps = _.keys(components);
    return Promise.all(allExecs).then(function () {
      return makeDepsPromise(action, allDeps);
    }).then(function (doneDeps) {
      return _.zipObject(allDeps, doneDeps);
    });
  }

  function start(startContext) {
    var promise = stoppingPromise.then(function () {
      deps = { start: {}, stop: {} };
      promises = { start: {}, stop: {} };
      context = startContext || {};
      startingPromise = runAction('start');
      return startingPromise;
    });
    stoppingPromise = alreadyStarted;
    return promise;
  }

  function prepareStopEach(component, name) {
    _.forEach(component.dependencies || [], function (dep) {
      deps.stop[dep].push(name);
    });
  }

  function stop() {
    var promise = startingPromise.then(function () {
      stoppingPromise = runAction('stop', prepareStopEach).then(function () {
        deps = undefined;
        promises = undefined;
        context = undefined;
        return {};
      });
      return stoppingPromise;
    });
    startingPromise = alreadyStopped;
    return promise;
  }

  return {
    start: start,
    stop: stop,
    dependencies: missingDeps,
  };
}

module.exports = {
  system: system,
};
