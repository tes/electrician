'use strict';

var async = require('async');
var _ = require('lodash');
var Toposort = require('toposort-class');

module.exports = {
    system: system
};

function system(options, components) {
    var ctx = {};
    var defaults = {
        explicit: false
    };

    if (!components) {
        components = options;
        options = defaults;
    } else {
        options = _.extend({}, defaults, options);
    }

    var startComponent = options.explicit ? startExplicitComponent : startImplicitComponent;
    var stopComponent = options.explicit ? stopExplicitComponent : stopImplicitComponent;

    return {
        start: start,
        stop: stop
    };

    function start(next) {
        ctx = {};
        startSequence(components, function (err, sequence) {
            if (err) return next(err);
            async.reduce(sequence, ctx, function (acc, key, next) {
                var component = components[key];
                if (!component.start) return next(null, acc);
                startComponent(ctx, component, key, next);
            }, next);
        });
    }

    function stop(next) {
        stopSequence(components, function (err, sequence) {
            if (err) return next(err);
            async.eachSeries(sequence, function(key, next) {
                var component = components[key];
                if (!components[key].stop) return next();
                stopComponent(ctx, component, key, next);
            }, function(err) {
                if (err) return next(err);
                next(null, ctx);
            });
        });
    }
}

function startSequence(components, next) {
    try {
        next(null, startSequenceSync(components));
    }
    catch (err) {
        next(err);
    }
}

function stopSequence(components, next) {
    try {
        next(null, startSequenceSync(components).reverse());
    }
    catch (err) {
        next(err);
    }
}

function startSequenceSync(components) {
    var nameDeps = _.map(_.pairs(components), function (pair) {
        return [_.head(pair), _.last(pair).dependsOn];
    });
    var withDeps = _.filter(nameDeps, _.last);
    var noDeps = _.map(_.difference(nameDeps, withDeps), _.head);

    return _.uniq(
        _.reduce(
            withDeps,
            function (acc, pair) {
                return acc.add(_.head(pair), _.last(pair));
            },
            new Toposort()
        )
        .sort()
        .reverse()
        .concat(noDeps)
    );
}

function startExplicitComponent(ctx, component, id, next) {
    var dependencyIds = [].concat(component.dependsOn || []);
    var dependencies = _.map(dependencyIds, function(id) {
        return ctx[id];
    });
    var argc = component.start.length;
    var args = dependencies.slice(0, argc -1);
    args[argc - 1] = function (err, started) {
        if (err) return next(toComponentError(id, err));
        next(null, _.assign(ctx, toObject(id, started)));
    }

    component.start.apply(component, args);
}

function startImplicitComponent(ctx, component, id, next) {
    component.start(ctx, function (err, started) {
        if (err) return next(toComponentError(id, err));
        next(null, _.assign(ctx, toObject(id, started)));
    });
}

function stopImplicitComponent(ctx, component, id, next) {
    component.stop(ctx, function (err) {
        if (err) return next(toComponentError(id, err));
        next();
    });
}

function stopExplicitComponent(ctx, component, id, next) {
    component.stop(function (err) {
        if (err) return next(toComponentError(id, err));
        next();
    });
}

function toComponentError(id, err) {
    err.message = id + ': ' + err.message;
    return err;
}

function toObject(key, value) {
    var obj = {};
    obj[key] = value;
    return  obj;
}
