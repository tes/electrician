var _ = require('lodash');

var startCounter;
var stopCounter;

function initialState() {
  return {
    started: false,
    stopped: false,
    startSequence: 0,
    stopSequence: 0,
  };
}

function resetCounters() {
  startCounter = 1;
  stopCounter = 1;
}

/* Callback versions */
function onStart(state, next) {
  state.started = true;
  state.startSequence = startCounter++;
  next(null, state);
}

function onStop(state, next) {
  state.stopped = true;
  state.stopSequence = stopCounter++;
  next(null, state);
}

function Component() {
  this.state = initialState();
}

_.extend(Component.prototype, {
  start: function (next) {
    onStart(this.state, next);
  },
  stop: function (next) {
    onStop(this.state, next);
  },
});

function DepComponent(dependency) {
  this.state = initialState();
  this.dependsOn = dependency;
}

_.extend(DepComponent.prototype, {
  start: function (dependency, next) {
    onStart(this.state, next);
  },
  stop: function (next) {
    onStop(this.state, next);
  },
});

/* Promise versions */
function promisifedOnStart(state) {
  state.started = true;
  state.startSequence = startCounter++;
  return Promise.resolve(state);
}

function promisifedOnStop(state) {
  state.stopped = true;
  state.stopSequence = stopCounter++;
  return Promise.resolve(state);
}


function PromiseComponent() {
  this.state = initialState();
}

_.extend(PromiseComponent.prototype, {
  start: function () {
    return promisifedOnStart(this.state);
  },
  stop: function () {
    return promisifedOnStop(this.state);
  },
})

module.exports = {
  Component: Component,
  DepComponent: DepComponent,
  PromiseComponent: PromiseComponent,
  resetCounters: resetCounters,
};
