var _ = require('lodash');

var startCounter;
var stopCounter;

function initialState() {
  return {
    started: false,
    stopped: false,
    startSequence: 0,
    stopSequence: 0
  };
}

function onStart(next) {
  this.state.started = true;
  this.state.startSequence = startCounter++;
  next(null, this.state);
}

function onStop(next) {
  this.state.stopped = true;
  this.state.stopSequence = stopCounter++;
  next(null, this.state);
}

function resetCounters() {
  startCounter = 1;
  stopCounter = 1;
}

function Component() {
  this.state = initialState();
}

_.extend(Component.prototype, {
  start: function (next) {
    onStart.call(this, next);
  },
  stop: function (next) {
    onStop.call(this, next);
  }
});

function DepComponent(dependency) {
  this.state = initialState();
  this.dependsOn = dependency;
}

_.extend(DepComponent.prototype, {
  start: function (dependency, next) {
    onStart.call(this, next);
  },
  stop: function (next) {
    onStop.call(this, next);
  }
});

module.exports = {
  Component: Component,
  DepComponent: DepComponent,
  resetCounters: resetCounters
};
