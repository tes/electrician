'use strict';

var async = require('async');
var _ = require('lodash');

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
        async.reduce(Object.keys(components), {}, function (acc, key, next) {
            components[key].start(_.clone(acc), function (err, started) {
                if (err) return next(err);
                next(null, _.assign({}, acc, toObject(key, started)));
            });
        }, next);
    }
}

function toObject(key, value) {
    var obj = {};
    obj[key] = value;
    return  obj;
}
