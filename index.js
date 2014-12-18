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
                startComponent(options, ctx, component, key, next);
            }, next);
        });
    }

    function stop(next) {
        stopSequence(components, function (err, sequence) {
            if (err) return next(err);

            async.eachSeries(sequence, function(key, next) {
                if (!components[key].stop) return next();
                components[key].stop(ctx, function (err) {
                    if (err) {
                        err.message = key + ': ' + err.message;
                        return next(err);
                    }
                    next();
                });
            }, function(err) {
                if (err) {
                    return next(err);
                }

                next(null, ctx);
            });
        });
    }
}

function startComponent(options, ctx, component, id, next) {
    if (options.explicit) {
        next(null, ctx);
    } else {
        startImplicitComponent(ctx, component, id, next);
    }
}

function startImplicitComponent(ctx, component, id, next) {
    component.start(ctx, function (err, started) {
        if (err) {
            err.message = id + ': ' + err.message;
            return next(err);
        }
        next(null, _.assign(ctx, toObject(id, started)));
    });
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

function toObject(key, value) {
    var obj = {};
    obj[key] = value;
    return  obj;
}
