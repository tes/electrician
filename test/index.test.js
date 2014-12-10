'use strict';

var expect = require('expect.js');

var components = require('..');

describe('Components', function () {

    it('should create an empty system', function () {
        expect(components.system({})).to.be.an('object');
    });


});

describe('System', function () {

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
});
