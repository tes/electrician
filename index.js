'use strict';

var async = require('async');
var _ = require('lodash');
var Toposort = require('toposort-class');

module.exports = {
    system: system
};

function system(components) {
    var ctx = {};
    return {
        start: start,
        stop: stop
    };

    function start(next) {
        ctx = {};
        startSequence(components, function (err, sequence) {
            if (err) return next(err);

            async.reduce(sequence, ctx, function (acc, key, next) {
                if (!components[key].start) return next(null, acc);
                components[key].start(acc, function (err, started) {
                    if (err) {
                        err.message = key + ': ' + err.message;
                        return next(err);
                    }
                    next(null, _.assign(acc, toObject(key, started)));
                });
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
