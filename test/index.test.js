var _ = require('lodash');
var expect = require('expect.js');
var Promise = require('core-js/library/es6/promise');

var components = require('./components');
var Component = components.Component;
var DepComponent = components.DepComponent;

var electrician = require('..');

describe('Electrician', function () {
  it('creates an empty system', function () {
    expect(electrician.system({})).to.be.an('object');
  });
});

describe('System', function () {
  beforeEach(components.resetCounters);

  it('has start/stop methods', function () {
    var system = electrician.system({});
    expect(system.start).to.be.a(Function);
    expect(system.stop).to.be.a(Function);
  });

  it('takes one arg for start, none for stop', function () {
    var system = electrician.system({});
    expect(system.start.length).to.be(1);
    expect(system.stop.length).to.be(0);
  });

  it('starts a single component', function () {
    var comp = new Component();
    var system = electrician.system({ 'comp': comp });

    return system.start().then(function () {
      expect(comp.state.started).to.be(true);
    });
  });

  it('starts multiple components', function () {
    var one = new Component();
    var two = new Component();
    var system = electrician.system({
      'one': one,
      'two': two,
    });

    return system.start().then(function () {
      expect(one.state.started).to.be(true);
      expect(two.state.started).to.be(true);
    });
  });

  it('overrides components with context passed to start', function () {
    var one = new Component();
    var two = new Component();
    var system = electrician.system({
      'one': one,
      'two': two,
    });

    return system.start({ 'two': true }).then(function (context) {
      expect(one.state.started).to.be(true);
      expect(two.state.started).to.be(false);
      expect(context.two).to.be(true);
    });
  });

  it('starts multiple components in dependency order', function () {
    var one = new DepComponent('two');
    var two = new Component();
    var three = new Component();
    var system = electrician.system({
      'one': one,
      'two': two,
      'three': three,
    });

    return system.start().then(function () {
      expect(one.state.startSequence).to.be.above(two.state.startSequence);
    });
  });

  it('stops a single component', function () {
    var comp = new Component();
    var system = electrician.system({ 'comp': comp });

    return system.start().then(system.stop).then(function () {
      expect(comp.state.stopped).to.be(true);
    });
  });

  it('returns an error on start if one is passed through on a single component', function () {
    var comp = _.extend(new Component(), {
      start: function () {
        return Promise.reject(new Error('Test Error'));
      },
    });
    var system = electrician.system({
      'comp': comp,
    });

    return system.start().then(function () {
      return Promise.reject(new Error('should have errored'));
    }, function (err) {
      expect(err.message).to.be('Test Error');
    });
  });

  it('returns an error on stop if one is passed through on a single component', function () {
    var comp = _.extend(new Component(), {
      stop: function () {
        return Promise.reject(new Error('Test Error'));
      },
    });
    var system = electrician.system({ 'comp': comp });

    return system.start().then(system.stop).then(function () {
      return Promise.reject(new Error('should have errored'));
    }, function (err) {
      expect(err.message).to.be('Test Error');
    });
  });

  it('stops multiple components', function () {
    var one = new Component();
    var two = new Component();
    var system = electrician.system({
      'one': one,
      'two': two,
    });

    return system.start().then(system.stop).then(function () {
      expect(one.state.stopped).to.be(true);
      expect(two.state.stopped).to.be(true);
    });
  });

  it('stops multiple components in dependency order', function () {
    var one = new DepComponent('two');
    var two = new Component();
    var three = new Component();
    var system = electrician.system({
      'one': one,
      'two': two,
      'three': three,
    });

    return system.start().then(system.stop).then(function () {
      expect(one.state.stopSequence).to.be.below(two.state.stopSequence);
    });
  });

  it('does not attempt to start components without start method', function () {
    var system = electrician.system({
      'comp': {},
    });

    system.start().then(function (ctx) {
      expect(ctx.comp).to.not.be.ok();
    });
  });

  it('does not attempt to stop components without stop method', function () {
    var comp = _.omit(new Component(), 'stop');
    var system = electrician.system({
      'comp': comp,
    });

    return system.start().then(system.stop).then(function () {
      expect(comp.state.stopped).to.be(false);
    });
  });

  it('returns error when wiring cyclical dependencies on start', function () {
    var system = electrician.system({
      'A': new DepComponent('B'),
      'B': new DepComponent('A'),
    });

    return system.start().then(function () {
      return Promise.reject(new Error('should have errored'));
    }, function (err) {
      expect(err).to.be.an(Error);
      expect(err.message).to.match(/^Cyclical dependencies found/);
      expect(_.sortBy(_.map(err.cycles, _.sortBy))).to.eql([['A', 'B']]);
    });
  });

  it('starts when cyclical dependency is broken by context passed to start', function () {
    var A = new DepComponent('B');
    var B = new DepComponent('A');
    var system = electrician.system({
      'A': A,
      'B': B,
    });

    return system.start({ 'B': true }).then(function (context) {
      expect(A.state.started).to.be(true);
      expect(B.state.started).to.be(false);
      expect(context.B).to.be(true);
    });
  });

  it('returns error when wiring (mulitple) more complex cyclical dependencies on start', function () {
    var system = electrician.system({
      'A': new DepComponent('B'),
      'B': new DepComponent('C', 'D'),
      'C': new DepComponent('A'),
      'D': new DepComponent('A'),
      'E': new DepComponent('A'),
      'F': new DepComponent('D'),
      'G': new DepComponent('F'),
      'H': new DepComponent('G', 'I'),
      'I': new DepComponent('H', 'B'),
    });

    return system.start().then(function () {
      return Promise.reject(new Error('should have errored'));
    }, function (err) {
      expect(err).to.be.an(Error);
      expect(err.message).to.match(/^Cyclical dependencies found/);
      expect(_.sortBy(_.map(err.cycles, _.sortBy))).to.eql([['A', 'B', 'C', 'D'], ['H', 'I']]);
    });
  });

  it('returns error when wiring cyclical dependencies on stop', function () {
    var A = new Component();
    var system = electrician.system({
      'A': A,
      'B': new DepComponent('A'),
    });

    return system.start().then(function () {
      A.dependencies = ['B'];
    }).then(system.stop).then(function () {
      return Promise.reject(new Error('should have errored'));
    }, function (err) {
      expect(err).to.be.an(Error);
      expect(err.message).to.match(/^Cyclical dependencies found/);
      expect(_.sortBy(_.map(err.cycles, _.sortBy))).to.eql([['A', 'B']]);
    });
  });

  it('reports missing dependencies', function () {
    var comp = new DepComponent('missing');
    var system = electrician.system({ 'comp': comp });

    return system.start().then(function () {
      return Promise.reject(new Error('should have errored'));
    }, function (err) {
      expect(err.message).to.be('Unknown component: missing');
    });
  });

  it('starts multiple components and nested systems', function () {
    var one = new Component();
    var two = new Component();
    var nested = electrician.system({
      'one': one,
    });

    var system = electrician.system({
      'two': two,
      'nested': nested,
    });

    return system.start().then(function () {
      expect(one.state.started).to.be(true);
      expect(two.state.started).to.be(true);
    });
  });

  it('starts multiple components and nested systems with dependencies', function () {
    var one = new Component();
    var two = new Component();
    var nested = electrician.system({
      'one': one,
    });

    nested.dependencies = ['two'];
    nested.oldStart = nested.start;
    nested.start = function (context) {
      nested.context = context;
      nested.oldStart(context);
    };

    var system = electrician.system({
      'two': two,
      'nested': nested,
    });

    return system.start().then(function (context) {
      expect(one.state.startSequence).to.be.above(two.state.startSequence);
      expect(nested.context).to.eql({ 'two': context.two });
    });
  });
});
