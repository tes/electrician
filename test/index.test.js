var expect = require('expect.js');
var async = require('async');
var _ = require('lodash');

var components = require('./components');
var Component = components.Component;
var DepComponent = components.DepComponent;

var electrician = require('..');

describe('Electrician', function() {
  it('creates an empty system', function() {
    expect(electrician.system({})).to.be.an('object');
  });
});

describe('System', function() {
  beforeEach(components.resetCounters);

  it('has start/stop methods', function() {
    var system = electrician.system({});
    expect(system.start).to.be.a(Function);
    expect(system.stop).to.be.a(Function);
  });

  it('takes callbacks for start/stop', function() {
    var system = electrician.system({});
    expect(system.start.length).to.be(1);
    expect(system.stop.length).to.be(1);
  });

  it('starts a single component', function(done) {
    var comp = new Component();
    var system = electrician.system({
      'comp': comp,
    });

    system.start(function(err) {
      if (err) return done(err);
      expect(comp.state.started).to.be(true);
      done();
    });
  });

  it('starts multiple components', function(done) {
    var one = new Component();
    var two = new Component();
    var system = electrician.system({
      'one': one,
      'two': two,
    });

    system.start(function(err) {
      if (err) return done(err);
      expect(one.state.started).to.be(true);
      expect(two.state.started).to.be(true);
      done();
    });
  });

  it('starts multiple components in dependency order', function(done) {
    var one = new DepComponent('two');
    var two = new Component();
    var three = new Component();
    var system = electrician.system({
      'one': one,
      'two': two,
      'three': three,
    });

    system.start(function(err) {
      if (err) return done(err);
      expect(one.state.startSequence).to.be(2);
      expect(two.state.startSequence).to.be(1);
      // standalone - order consequential
      expect(three.state.startSequence).to.be(3);
      done();
    });
  });

  it('stops a single component', function(done) {
    var comp = new Component();
    var system = electrician.system({
      'comp': comp,
    });

    async.series([
      system.start,
      system.stop,
    ], function(err) {
      if (err) return done(err);
      expect(comp.state.stopped).to.be(true);
      done();
    });
  });

  it('returns an error on stop if one is passed through on a single component', function(done) {
    var comp = _.extend(new Component(), {
      stop: function(next) {
        next(new Error('Test Error'));
      },
    });
    var system = electrician.system({'comp': comp});

    async.series([
      system.start,
      system.stop,
    ], function(err) {
      expect(err.message).to.be('comp: Test Error');
      done();
    });
  });

  it('returns an error on start if one is passed through on a single component', function(done) {
    var comp = _.extend(new Component(), {
      start: function(next) {
        next(new Error('Test Error'));
      },
    });
    var system = electrician.system({
      'comp': comp,
    });

    system.start(function(err) {
      expect(err.message).to.be('comp: Test Error');
      done();
    });
  });

  it('stops multiple components', function(done) {
    var one = new Component();
    var two = new Component();
    var system = electrician.system({
      'one': one,
      'two': two,
    });

    async.series([
      system.start,
      system.stop,
    ], function(err) {
      if (err) return done(err);
      expect(one.state.stopped).to.be(true);
      expect(two.state.stopped).to.be(true);
      done();
    });
  });

  it('stops multiple components in dependency order', function(done) {
    var one = new DepComponent('two');
    var two = new Component();
    var three = new Component();
    var system = electrician.system({
      'one': one,
      'two': two,
      'three': three,
    });

    async.series([
      system.start,
      system.stop,
    ], function(err) {
      if (err) return done(err);
      expect(one.state.stopSequence).to.be(2);
      expect(two.state.stopSequence).to.be(3);
      // standalone - order consequential
      expect(three.state.stopSequence).to.be(1);
      done();
    });
  });

  it('does not attempt to start components without start method', function(done) {
    var system = electrician.system({
      'comp': {},
    });

    system.start(function(err, ctx) {
      if (err) return done(err);
      expect(ctx.comp).to.not.be.ok();
      done();
    });
  });

  it('does not attempt to stop components without stop method', function(done) {
    var comp = _.omit(new Component(), 'stop');
    var system = electrician.system({
      'comp': comp,
    });

    async.series([
      system.start,
      system.stop,
    ], function(err) {
      if (err) return done(err);
      expect(comp.state.stopped).to.be(false);
      done();
    });
  });

  it('returns error when wiring cyclical dependencies on start', function(done) {
    var system = electrician.system({
      'A': new DepComponent('B'),
      'B': new DepComponent('A'),
    });

    system.start(function(err) {
      expect(err.message).to.match(/^Cyclic dependency found/);
      done();
    });
  });

  it('returns error when wiring cyclical dependencies on stop', function(done) {
    var A = new Component();
    var B = new DepComponent('A');
    var system = electrician.system({
      'A': A,
      'B': B,
    });

    system.start(function(err) {
      if (err) return done(err);

      A.dependsOn = 'B';
      system.stop(function(error) {
        expect(error.message).to.match(/^Cyclic dependency found/);
        done();
      });
    });
  });

  it('reports missing dependencies', function(done) {
    var comp = new DepComponent('missing');
    var system = electrician.system({
      'comp': comp,
    });

    system.start(function(err) {
      expect(err.message).to.be('Unknown component: missing');
      done();
    });
  });
});
