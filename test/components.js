'use strict';

var _ = require('lodash');

var startCounter;
var stopCounter;

function Component() {
    this.state = initialState();
}

_.extend(Component.prototype, {
    start: function(next) {
        onStart(this.state, next);
    },
    stop: function(next) {
        onStop(this.state, next);
    }
});


function DepComponent(dependency) {
    this.state = initialState();
    this.dependsOn = dependency;
}

_.extend(DepComponent.prototype, {
    start: function(dependency, next) {
        onStart(this.state, next);
    },
    stop: function(next) {
        onStop(this.state, next);
    }
});

function initialState() {
    return {
        started: false,
        stopped: false,
        startSequence: 0,
        stopSequence: 0
    };
}

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

function resetCounters() {
    startCounter = 1;
    stopCounter = 1;
}

module.exports = {
    Component: Component,
    DepComponent: DepComponent,
    resetCounters: resetCounters
};
