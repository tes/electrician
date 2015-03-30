'use strict';

var electrician = require('..');

// COMPONENTS IMPLEMENTATIONS
function NoDepComponent(name) {
    this.name = name;
    return this;
}
NoDepComponent.prototype.start = function (next) {
    console.log('Starting: ' + this);
    next(null, this);
}
NoDepComponent.prototype.stop = stop;
NoDepComponent.prototype.toString = toString;

function OneDepComponent(name, dep) {
    this.name = name;
    this.dependsOn = [dep]
    return this;
}
OneDepComponent.prototype.start = function (dep, next) {
    console.log('Starting: ' + this);
    console.log('\tDependency: ' + dep);
    next(null, this);
}
OneDepComponent.prototype.stop = stop;
OneDepComponent.prototype.toString = toString;

function TwoDepComponent(name, firstDep, secondDep) {
    this.name = name;
    this.dependsOn = [firstDep, secondDep]
    return this;
}
TwoDepComponent.prototype.start = function (firstDep, secondDep, next) {
    console.log('Starting: ' + this);
    console.log('\t1st dependency: ' + firstDep);
    console.log('\t2nd dependency: ' + secondDep);
    next(null, this);
}
TwoDepComponent.prototype.stop = stop;
TwoDepComponent.prototype.toString = toString;

function stop(next) {
    console.log('Stopping: ' + this);
    next();
}

function toString() {
    return 'Component ' + this.name;
}

// COMPOSE SYSTEM
var system = electrician.system({explicit: true}, {
  'A': new NoDepComponent('A'),
  'B': new TwoDepComponent('B', 'A', 'C'),
  'C': new OneDepComponent('C', 'A'),
  'D': new OneDepComponent('D', 'C'),
});

// START SYSTEM
system.start(function (err) {
    if (err) return console.error(err);
    console.log('System started');
});

// STOP SYSTEM
system.stop(function (err) {
    if (err) return console.error(err);
    console.log('System stopped');
});

