Electrician
===========
> ... will sort out your wiring.

Usage
-----

Please don't yet.


### Example

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

var electrician = require('electrician');

var system = electrician.system({
  'A': component('A'),
  'B': component('B', ['A', 'C']),
  'C': component('C', ['A']),
  'D': component('D', ['C']),
});

system.start(function (err, ctx) {
    console.log('Started: ', ctx);
});
system.stop(function (err, ctx) {
    console.log('Stopped: ', ctx);
});


function component(name, deps) {
    return {
        dependsOn: deps,
        start: start,
        stop: stop,
        toString: toString
    }

    function start(ctx, next) {
        console.log('Starting: ', toString());
        if (deps) {
            console.log('Dependencies:');
            deps.forEach(function (dependency) {
                console.log('\t' + dependency + ': ' + ctx[dependency]);
            });
        }
        next(null, toString());
    }

    function stop(ctx, next) {
        console.log('Stopping: ', toString());
        next();
    }

    function toString() {
        return 'name:[' + name + '], dependencies:[' + deps + ']';
    }
}
```
