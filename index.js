'use strict';

var async = require('async');
var _ = require('lodash');
var Toposort = require('toposort-class');

module.exports = {
    system: system
};

function system(components) {
    return {
        start: start,
        stop: function (next) {}
    };

    function start(next) {
        var ctx = {};
        async.reduce(startSequence(components), {}, function (acc, key, next) {
            components[key].start(_.clone(acc), function (err, started) {
                if (err) return next(err);
                next(null, _.assign({}, acc, toObject(key, started)));
            });
        }, next);
    }
}

function startSequence(components) {
    var nameDeps = _.map(_.pairs(components), function(pair) {
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
