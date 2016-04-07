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

function onStart(state) {
  state.started = true;
  state.startSequence = startCounter++;
  return state;
}

function onStop(state) {
  state.stopped = true;
  state.stopSequence = stopCounter++;
  return state;
}

function resetCounters() {
  startCounter = 1;
  stopCounter = 1;
}

function Component() {
  this.state = initialState();
}

_.extend(Component.prototype, {
  start: function () {
    return onStart(this.state);
  },
  stop: function () {
    return onStop(this.state);
  },
});

function DepComponent(dependency) {
  this.state = initialState();
  this.dependencies = [dependency];
}

_.extend(DepComponent.prototype, {
  start: function () {
    return onStart(this.state);
  },
  stop: function () {
    return onStop(this.state);
  },
});

module.exports = {
  Component: Component,
  DepComponent: DepComponent,
  resetCounters: resetCounters,
};
