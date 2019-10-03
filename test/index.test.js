const expect = require('expect.js');
const async = require('async');
const _ = require('lodash');
const components = require('./components');

const Component = components.Component;
const DepComponent = components.DepComponent;

const electrician = require('..');

describe('Electrician', () => {
  it('creates an empty system', () => {
    expect(electrician.system({})).to.be.an('object');
  });
});

describe('System', () => {
  beforeEach(components.resetCounters);

  it('has start/stop methods', () => {
    const system = electrician.system({});
    expect(system.start).to.be.a(Function);
    expect(system.stop).to.be.a(Function);
  });

  it('takes callbacks for start/stop', () => {
    const system = electrician.system({});
    expect(system.start.length).to.be(1);
    expect(system.stop.length).to.be(1);
  });

  it('starts a single component', done => {
    const comp = Component();
    const system = electrician.system({ comp });

    system.start(err => {
      if (err) {
        return done(err);
      }
      expect(comp.state.started).to.be(true);
      done();
    });
  });

  it('starts multiple components', done => {
    const one = Component();
    const two = Component();
    const system = electrician.system({ one, two });

    system.start(err => {
      if (err) {
        return done(err);
      }
      expect(one.state.started).to.be(true);
      expect(two.state.started).to.be(true);
      done();
    });
  });

  it('starts multiple components in dependency order', done => {
    const one = DepComponent('two');
    const two = Component();
    const three = Component();
    const system = electrician.system({ one, two, three });

    system.start(err => {
      if (err) {
        return done(err);
      }
      expect(one.state.startSequence).to.be(2);
      expect(two.state.startSequence).to.be(1);
      // standalone - order consequential
      expect(three.state.startSequence).to.be(3);
      done();
    });
  });

  it('stops a single component', done => {
    const comp = Component();
    const system = electrician.system({ comp });

    async.series([
      system.start,
      system.stop,
    ], err => {
      if (err) {
        return done(err);
      }
      expect(comp.state.stopped).to.be(true);
      done();
    });
  });

  it('returns an error on stop if one is passed through on a single component', done => {
    const comp = _.extend(Component(), {
      stop: next => {
        next(new Error('Test Error'));
      },
    });
    const system = electrician.system({ comp });

    async.series([
      system.start,
      system.stop,
    ], err => {
      expect(err.message).to.be('comp: Test Error');
      done();
    });
  });

  it('returns an error on start if one is passed through on a single component', done => {
    const comp = _.extend(Component(), {
      start: next => {
        next(new Error('Test Error'));
      },
    });
    const system = electrician.system({ comp });

    system.start(err => {
      expect(err.message).to.be('comp: Test Error');
      done();
    });
  });

  it('stops multiple components', done => {
    const one = Component();
    const two = Component();
    const system = electrician.system({ one, two });

    async.series([
      system.start,
      system.stop,
    ], err => {
      if (err) {
        return done(err);
      }
      expect(one.state.stopped).to.be(true);
      expect(two.state.stopped).to.be(true);
      done();
    });
  });

  it('stops multiple components in dependency order', done => {
    const one = DepComponent('two');
    const two = Component();
    const three = Component();
    const system = electrician.system({ one, two, three });

    async.series([
      system.start,
      system.stop,
    ], err => {
      if (err) {
        return done(err);
      }
      expect(one.state.stopSequence).to.be(2);
      expect(two.state.stopSequence).to.be(3);
      // standalone - order consequential
      expect(three.state.stopSequence).to.be(1);
      done();
    });
  });

  it('does not attempt to start components without start method', done => {
    const system = electrician.system({ comp: {} });

    system.start((err, ctx) => {
      if (err) {
        return done(err);
      }
      expect(ctx.comp).to.not.be.ok();
      done();
    });
  });

  it('does not attempt to stop components without stop method', done => {
    const comp = _.omit(Component(), 'stop');
    const system = electrician.system({ comp });

    async.series([
      system.start,
      system.stop,
    ], err => {
      if (err) {
        return done(err);
      }
      expect(comp.state.stopped).to.be(false);
      done();
    });
  });

  it('returns error when wiring cyclical dependencies on start', done => {
    const system = electrician.system({
      A: DepComponent('B'),
      B: DepComponent('A'),
    });

    system.start(err => {
      expect(err.message).to.match(/^Cyclic dependency found/);
      done();
    });
  });

  it('returns error when wiring cyclical dependencies on stop', done => {
    const A = Component();
    const B = DepComponent('A');
    const system = electrician.system({ A, B });

    system.start(err => {
      if (err) {
        return done(err);
      }

      A.dependsOn = 'B';
      system.stop(error => {
        expect(error.message).to.match(/^Cyclic dependency found/);
        done();
      });
    });
  });

  it('reports missing dependencies', done => {
    const comp = DepComponent('missing');
    const system = electrician.system({ comp });

    system.start(err => {
      expect(err.message).to.be('Unknown component: missing');
      done();
    });
  });
});
