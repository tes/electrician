'use strict';

var expect = require('expect.js');

var components = require('..');

describe('Components', function () {
    it('should create an empty system', function () {
        expect(components.system({})).to.be.an('object');
    });
});

describe('System', function () {
    var counter;

    beforeEach(function() {
        counter = 1;
    });

    it('should have start/stop methods', function () {
        var system = components.system({});
        expect(system.start).to.be.a(Function);
        expect(system.stop).to.be.a(Function);
    });

    it('should take callbacks for start/stop', function () {
        var system = components.system({});
        expect(system.start.length).to.be(1);
        expect(system.stop.length).to.be(1);
    });

    it('should start a single component', function (done) {
        var system = components.system({
            'comp': component()
        });

        system.start(function (err, ctx) {
            expect(ctx.comp.started).to.be(true);
            done();
        });
    });

    it('should start multiple components', function (done) {
        var system = components.system({
            'one': component(),
            'two': component()
        });

        system.start(function (err, ctx) {
            expect(ctx.one.started).to.be(true);
            expect(ctx.two.started).to.be(true);
            done();
        });
    });

    it('should start multiple components in dependency order', function (done) {
        var system = components.system({
            'one': component('two'),
            'two': component(),
            'three': component()
        });

        system.start(function (err, ctx) {
            expect(ctx.one.sequence).to.be(2);
            expect(ctx.two.sequence).to.be(1);
            expect(ctx.three.started).to.be(true); //standalone - order not important
            done();
        });
    });

    function component(deps) {
        var state = {
            started: false
        };

        return {
            dependsOn: deps,
            start: function(ctx, next) {
                state.started = true;
                state.sequence = counter++;
                next(null, state)
            },
            state: state
        };
    }
});


