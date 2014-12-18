'use strict';

var expect = require('expect.js');
var async = require('async');
var _ = require('lodash');

var electrician = require('..');

describe('Electrician', function () {
    it('should create an empty system', function () {
        expect(electrician.system({})).to.be.an('object');
    });
});

describe('System', function () {
    var startCounter;
    var stopCounter;

    function component(deps) {
        var state = {
            started: false,
            stopped: false
        };

        return {
            dependsOn: deps,
            start: function (ctx, next) {
                state.started = true;
                state.startSequence = startCounter++;
                next(null, state);
            },
            stop: function (ctx, next) {
                state.stopped = true;
                state.stopSequence = stopCounter++;
                next(null, state);
            },
            state: state
        };
    }

    function componentErrorStart(deps) {
        var c = component(deps);
        c.start = function (ctx, next) {
            next(new Error('Test Error'));
        };
        return c;
    }

    function componentErrorStop(deps) {
        var c = component(deps);
        c.stop = function (ctx, next) {
            next(new Error('Test Error'));
        };
        return c;
    }

    beforeEach(function () {
        startCounter = 1;
        stopCounter = 1;
    });

    it('should have start/stop methods', function () {
        var system = electrician.system({});
        expect(system.start).to.be.a(Function);
        expect(system.stop).to.be.a(Function);
    });

    it('should take callbacks for start/stop', function () {
        var system = electrician.system({});
        expect(system.start.length).to.be(1);
        expect(system.stop.length).to.be(1);
    });

    it('should start a single component', function (done) {
        var system = electrician.system({
            'comp': component()
        });

        system.start(function (err, ctx) {
            if (err) return done(err);
            expect(ctx.comp.started).to.be(true);
            done();
        });
    });

    it('should start multiple components', function (done) {
        var system = electrician.system({
            'one': component(),
            'two': component()
        });

        system.start(function (err, ctx) {
            if (err) return done(err);
            expect(ctx.one.started).to.be(true);
            expect(ctx.two.started).to.be(true);
            done();
        });
    });

    it('should start multiple components in dependency order', function (done) {
        var system = electrician.system({
            'one': component('two'),
            'two': component(),
            'three': component()
        });

        system.start(function (err, ctx) {
            if (err) return done(err);
            expect(ctx.one.startSequence).to.be(2);
            expect(ctx.two.startSequence).to.be(1);
            //standalone - order consequential
            expect(ctx.three.startSequence).to.be(3);
            done();
        });
    });

    it('should stop a single component', function (done) {
        var system = electrician.system({
            'comp': component()
        });

        async.series([
            system.start,
            system.stop
        ], function (err, result) {
            if (err) return done(err);
            var ctx = result.pop();
            expect(ctx.comp.stopped).to.be(true);
            done();
        });
    });

    it('should return an error on stop if one is passed through on a single component', function (done) {
        var system = electrician.system({
            'comp': componentErrorStop()
        });

        async.series([
            system.start,
            system.stop
        ], function (err, result) {
            expect(err.message).to.be('comp: Test Error');
            done();
        });
    });

    it('should return an error on start if one is passed through on a single component', function (done) {
        var system = electrician.system({
            'comp': componentErrorStart()
        });

        async.series([
            system.start,
            system.stop
        ], function (err, result) {
            expect(err.message).to.be('comp: Test Error');
            done();
        });
    });

    it('should stop multiple components', function (done) {
        var system = electrician.system({
            'one': component(),
            'two': component()
        });

        async.series([
            system.start,
            system.stop
        ], function (err, result) {
            if (err) return done(err);
            var ctx = result.pop();
            expect(ctx.one.stopped).to.be(true);
            expect(ctx.two.stopped).to.be(true);
            done();
        });
    });

    it('should stop multiple components in dependency order', function (done) {
        var system = electrician.system({
            'one': component('two'),
            'two': component(),
            'three': component()
        });

        async.series([
            system.start,
            system.stop
        ], function (err, result) {
            if (err) return done(err);
            var ctx = result.pop();
            expect(ctx.one.stopSequence).to.be(2);
            expect(ctx.two.stopSequence).to.be(3);
            //standalone - order consequential
            expect(ctx.three.stopSequence).to.be(1);
            done();
        });
    });

    it('should not attempt to start components without start method', function (done) {
        var system = electrician.system({
            'comp': _.omit(component(), 'start')
        });

        system.start(function (err, ctx) {
            if (err) return done(err);
            expect(ctx.comp).to.not.be.ok();
            done();
        });
    });

    it('should not attempt to stop components without stop method', function (done) {
        var system = electrician.system({
            'comp': _.omit(component(), 'stop')
        });

        async.series([
            system.start,
            system.stop
        ], function (err, result) {
            if (err) return done(err);
            var ctx = result.pop();
            expect(ctx.comp.stopped).to.be(false);
            done();
        });
    });

    it('should return error when wiring cyclical dependencies on start', function (done) {
        var system = electrician.system({
            'A': component('B'),
            'B': component('A')
        });

        system.start(function (err, ctx) {
            expect(err.message).to.match(/^Cyclic dependency found/);
            done();
        });
    });

    it('should return error when wiring cyclical dependencies on stop', function (done) {
        var A = component();
        var B = component('A');
        var system = electrician.system({
            'A': A,
            'B': B
        });

        system.start(function (err) {
            if (err) return done(err);

            A.dependsOn = 'B';
            system.stop(function (err) {
                expect(err.message).to.match(/^Cyclic dependency found/);
                done();
            });
        });
    });
});
