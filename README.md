Components
==========
> Because one module system is not enough.

Usage
-----

Please don't yet.



### Example

#### Topology

```
    +---+      +---+      +---+
    | A |<----+| B |<----+| C |
    +---+      +---+      +---+
      ^          ^
      |          |
      |        +---+
      +-------+| D |
               +---+
```

#### Code

```js
'use strict';

var components = require('components');

var system = components.system({
  'A': component('A'),
  'B': component('B', ['A']),
  'C': component('C', ['B']),
  'D': component('D', ['A', 'B']),
});

system.start(function (err, ctx) {
    console.log('Started: ', ctx);
});
system.stop(function (err, ctx) {
    console.log('Stopped: ', ctx);
});


function component(name, deps) {
    return {
        depends: deps,
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
