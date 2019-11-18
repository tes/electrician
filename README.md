Electrician
===========
> ... will sort out your wiring.

[![Build Status](https://travis-ci.org/tes/electrician.svg?branch=master)](https://travis-ci.org/tes/electrician)
[![Dependencies Status](https://david-dm.org/tes/electrician.svg)](https://david-dm.org/tes/electrician)
[![Dev Dependencies Status](https://david-dm.org/tes/electrician/dev-status.svg)](https://david-dm.org/tes/electrician#info=devDependencies)

![Electrician at work](http://www.cdelec.co.uk/media//commercial-electrician_1.jpg)

Electrician is a module for wiring together systems composed of components. In
order for a component to play well with electrician, it needs to support a
 simple interface. Components supporting this interface are called _electric
 components_. Electric component should define a way to be started (`start`
 function), a way to be stopped (`stop` function) and list its dependencies
 (`dependsOn` property). Electrician can then wire these components into a system
 (which is itself an electric component).

When system is started, electrician ensures that all the components are started
 in correct dependency order, and it passes all dependencies down to components
 start functions.

Conversely when system is stopped all the components are stopped in reverse
 order.

It is probably the easiest to just show an example...

Usage
-----

### Example

Given a system composed of four components A, B, C and D. Where component
 A has no dependencies. Component B depends on components A and C. Component C
 depends on component A. And component D depends on component C.

We'd like to be able to start and stop the system in the right order and
 pass the right dependencies to individual components.

#### Topology
```
    +---+      +---+      +---+
    | A |<----+| C |<----+| D |
    +---+      +---+      +---+
      ^          ^
      |          |
      |        +---+
      +-------+| B |
               +---+
```

#### Code
```js
'use strict';

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
// callback version
system.start(function (err) {
    if (err) return console.error(err);
    console.log('System started');
});

// promise version
system
    .start()
    .then(() => console.log('System started'))
    .catch(err => console.error(err))

// STOP SYSTEM
// callback version
system.stop(function (err) {
    if (err) return console.error(err);
    console.log('System stopped');
});

// promise version
system
    .stop()
    .then(() => console.log('System stoopped '))
    .catch(err => console.error(err))
```

##### Output

```
Starting: Component A
Starting: Component C
        Dependency: Component A
Starting: Component B
        1st dependency: Component A
        2nd dependency: Component C
Starting: Component D
        Dependency: Component C
System started
Stopping: Component D
Stopping: Component B
Stopping: Component C
Stopping: Component A
System stopped
```

Electric component interface
----------------------------

### dependsOn

Array of dependency names. Used to determine starting order of components and
 to inject dependencies into `start` function of given component.

#### Example
```js
this.dependsOn = ['rabbitmq', 'redis'];
```

### start([dependencies], next)

Function used to start the component. Electrician will call this function after
 all the dependencies of component were started and pass them as arguments.
 Arguments will be passed in order declared in `dependsOn` property. If
 function declares fewer dependencies than declared in `dependsOn`, then only
 as many dependencies as there are available arguments will be passed (last
 argument is persumed to be a callback). This facilitates being able to declare
 dependencies that you wish to be started before the component, but you don't
 intend on using directly (e.g. environment setup).

When component is sucessfully started, an instance of it should be given to
 `next` callback so it can be passed to components depending on it.

#### Arguments
 * `[dependencies]` _(...Object)_ Dependency components
 * `next` Callback to export started component or notify of failure

#### Example
```js
this.start = function (rabbit, redis, next) {
    app.subscribe(rabbit);
    app.cache(new RedisCache(redis));
    app.start(function (err) {
        if (err) return next(err);
        next(null, app);
    });
};
```

### stop(next)

Function used to stop the component. Electrician will call this function after
 all the components that depend on this component were stopped.

#### Arguments
 * `next` Callback to notify of successful stop or failure

#### Example
```js
this.stop = function (next) {
    app.stop(next);
};
```

Electrician system interface
----------------------------

System is a supercomponent composed of components wired together by
 electrician.

### system(componentMap)

Creates a system composed of components provided in `componentMap`. Map keys
 are considered component names (that can be used when declaring dependencies
 in `dependsOn`). While values are instances of components themselves.

#### Example
```js
var config = require('./config');
var Application = require('./app');
var Redis = require('electric-redis');
var RabbitMq = require('electric-rabbit');

var electrician = require('electrician');

var system = electrician.system({
  app: new Application();
  redis: new Redis(config.redis);
  rabbitmq: new RabbitMq(config.rabbit);
});
```

### System instance interface

System is essentially a component with no declared dependencies (no `dependsOn`
 property). Thus it can be started and stopped by the same `start`/`stop`
 functions.

#### start(next)

Starts the system (all the components it is composed of).
If `next` is passed in, calls `next` when done or on failure.
If `next` is not passed in, returns a resolved Promise when done or a rejected one on failure.

##### Arguments
 * `next` Callback to notify of successful start or failure. If not passed in, method returns a promise.

##### Example
```js
// callback version
system.start(function (err, sys) {
    if (err) return console.error('System did not start.', err);
    console.log('System started.', sys);
});

// promise version
system
    .start()
    .then(sys => console.log('System started', sys))
    .catch(err => console.error('System did not start', err))
```

#### stop(next)

Stops the system (all the components it is composed of).
If `next` is passed in, calls `next` when done or on failure.
If `next` is not passed in, returns a resolved Promise when done or a rejected one on failure.

##### Arguments
 * `next` Callback to notify of successful stop or failure. If not passed in, method returns a promise.

##### Example
```js
// callback version
system.stop(function (err) {
    if (err) return console.error('System did not stop.', err);
    console.log('System stopped.');
});

// promise version
system
    .stop()
    .then(() => console.log('System stopped.'))
    .catch(err => console.error('System did not stop.', err));
```
