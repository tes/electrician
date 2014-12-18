'use strict';

var expect = require('expect.js');
var async = require('async');
var _ = require('lodash');

var components = require('./components');
var Component = components.Component;
var DepComponent = components.DepComponent;

var electrician = require('..');

describe('Explicit Electrician', function () {
    it('should create an empty system', function () {
        expect(electrician.system({explicit: true}, {})).to.be.an('object');
    });
});

describe('Explicit System', function () {

    beforeEach(components.resetCounters);

    it('should have start/stop methods', function () {
        var system = electrician.system({explicit: true}, {});
        expect(system.start).to.be.a(Function);
        expect(system.stop).to.be.a(Function);
    });

    it('should take callbacks for start/stop', function () {
        var system = electrician.system({explicit: true}, {});
        expect(system.start.length).to.be(1);
        expect(system.stop.length).to.be(1);
    });

    it('should start a single component', function (done) {
        var comp = new Component();
        var system = electrician.system({explicit: true}, {
            'comp': comp
        });

        system.start(function (err) {
            if (err) return done(err);
            expect(comp.state.started).to.be(true);
            done();
        });
    });

    it('should start multiple components', function (done) {
        var one = new Component();
        var two = new Component();
        var system = electrician.system({explicit: true}, {
            'one': one,
            'two': two
        });

        system.start(function (err, ctx) {
            if (err) return done(err);
            expect(one.state.started).to.be(true);
            expect(two.state.started).to.be(true);
            done();
        });
    });

    it('should start multiple components in dependency order', function (done) {
        var one = new DepComponent('two');
        var two = new Component();
        var three = new Component();
        var system = electrician.system({explicit: true}, {
            'one': one,
            'two': two,
            'three': three
        });

        system.start(function (err, ctx) {
            if (err) return done(err);
            expect(one.state.startSequence).to.be(2);
            expect(two.state.startSequence).to.be(1);
            //standalone - order consequential
            expect(three.state.startSequence).to.be(3);
            done();
        });
    });

    it('should stop a single component', function (done) {
        var comp = new Component();
        var system = electrician.system({explicit: true}, {
            'comp': comp
        });

        async.series([
            system.start,
            system.stop
        ], function (err) {
            if (err) return done(err);
            expect(comp.state.stopped).to.be(true);
            done();
        });
    });

    it('should return an error on stop if one is passed through on a single component', function (done) {
        var comp = _.extend(new Component(), {
            stop: function (next) {
                next(new Error('Test Error'));
            }
        });
        var system = electrician.system({explicit: true},{
            'comp': comp
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
        var comp = _.extend(new Component(), {
            start: function (next) {
                next(new Error('Test Error'));
            }
        });
        var system = electrician.system({explicit: true},{
            'comp': comp
        });

        system.start(function (err, result) {
            expect(err.message).to.be('comp: Test Error');
            done();
        });
    });

    it('should stop multiple components', function (done) {
        var one = new Component();
        var two = new Component();
        var system = electrician.system({explicit: true}, {
            'one': one,
            'two': two
        });

        async.series([
            system.start,
            system.stop
        ], function (err, result) {
            if (err) return done(err);
            var ctx = result.pop();
            expect(one.state.stopped).to.be(true);
            expect(two.state.stopped).to.be(true);
            done();
        });
    });

    it('should stop multiple components in dependency order', function (done) {
        var one = new DepComponent('two');
        var two = new Component();
        var three = new Component();
        var system = electrician.system({explicit: true}, {
            'one': one,
            'two': two,
            'three': three
        });

        async.series([
            system.start,
            system.stop
        ], function (err, result) {
            if (err) return done(err);
            var ctx = result.pop();
            expect(one.state.stopSequence).to.be(2);
            expect(two.state.stopSequence).to.be(3);
            //standalone - order consequential
            expect(three.state.stopSequence).to.be(1);
            done();
        });
    });

    it('should not attempt to start components without start method', function (done) {
        var system = electrician.system({explicit: true}, {
            'comp': {}
        });

        system.start(function (err, ctx) {
            if (err) return done(err);
            expect(ctx.comp).to.not.be.ok();
            done();
        });
    });

    it('should not attempt to stop components without stop method', function (done) {
        var system = electrician.system({explicit: true}, {
            'comp': _.omit(new Component(), 'stop')
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
        var system = electrician.system({explicit: true}, {
            'A': new DepComponent('B'),
            'B': new DepComponent('A')
        });

        system.start(function (err, ctx) {
            expect(err.message).to.match(/^Cyclic dependency found/);
            done();
        });
    });

    it('should return error when wiring cyclical dependencies on stop', function (done) {
        var A = new Component();
        var B = new DepComponent('A');
        var system = electrician.system({explicit: true}, {
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

