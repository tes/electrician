const expect = require('expect.js');

const electrician = require('..');

const pause = () => new Promise((resolve) => setTimeout(() => resolve(), 10));

describe('Electrician', () => {
  it('creates an empty system', () => {
    expect(electrician.system({})).to.be.an('object');
  });
});

describe('System', () => {
  it('has start/stop methods', () => {
    const system = electrician.system({});

    expect(system.start).to.be.a(Function);
    expect(system.stop).to.be.a(Function);
  });

  it('starts a single component', async () => {
    let started;
    const comp = {
      start: () => {
        started = true;
      },
    };

    const system = electrician.system({ comp });
    await system.start();

    expect(started).to.be(true);
  });

  it('starts a single component with async start function', async () => {
    let started;
    const comp = {
      start: async () => {
        await pause();
        started = true;
      },
    };

    const system = electrician.system({ comp });
    await system.start();

    expect(started).to.be(true);
  });

  it('stores the return values of start functions in the context', async () => {
    const comp = {
      start: async () => {
        await pause();
        return ['something', 'useful'];
      },
    };

    const another = {
      start: () => ({ a: 1 }),
    };

    const system = electrician.system({ comp, another });
    const context = await system.start();

    expect(context.comp).to.eql(['something', 'useful']);
    expect(context.another).to.eql({ a: 1 });
  });

  it('starts multiple components', async () => {
    const started = [false, false];
    const one = {
      start: () => {
        started[0] = true;
      },
    };
    const two = {
      start: () => {
        started[1] = true;
      },
    };
    const system = electrician.system({ one, two });
    await system.start();

    expect(started).to.eql([true, true]);
  });

  it('starts multiple components in dependency order', async () => {
    const startSequence = [];
    const one = {
      start: async (two) => {
        startSequence.push('one');
        await pause(two);
      },
    };
    const two = {
      start: () => {
        startSequence.push('two');
      },
    };
    const three = {
      start: () => {
        startSequence.push('three');
      },
    };

    const system = electrician.system({ one, two, three });
    await system.start();

    expect(startSequence).to.eql(['two', 'one', 'three']);
  });

  it('stops a single component', async () => {
    let stopped;
    const comp = {
      start: () => {
      },
      stop: () => {
        stopped = true;
      },
    };

    const system = electrician.system({ comp });
    await system.start();
    await system.stop();

    expect(stopped).to.be(true);
  });

  it('stops a single component with async stop function', async () => {
    let stopped;
    const comp = {
      start: () => {
      },
      stop: async () => {
        await pause();
        stopped = true;
      },
    };

    const system = electrician.system({ comp });
    await system.start();
    await system.stop();

    expect(stopped).to.be(true);
  });

  it('throws an error on stop if a single component throws an error', async () => {
    const comp = {
      start: () => {
      },
      stop: () => {
        throw new Error('Test Error');
      },
    };

    const system = electrician.system({ comp });
    await system.start();

    try {
      await system.stop();
      throw new Error('this should not be reached');
    } catch (err) {
      expect(err.message).to.be('comp: Test Error');
    }
  });

  it('throws an error on start if a single component throws an error', async () => {
    const comp = {
      start: () => {
        throw new Error('Test Error');
      },
    };

    const system = electrician.system({ comp });

    try {
      await system.start();
      throw new Error('this should not be reached');
    } catch (err) {
      expect(err.message).to.be('comp: Test Error');
    }
  });

  it('stops multiple components', async () => {
    const stopped = [false, false];
    const one = {
      start: () => {
      },
      stop: () => {
        stopped[0] = true;
      },
    };
    const two = {
      start: () => {
      },
      stop: () => {
        stopped[1] = true;
      },
    };
    const system = electrician.system({ one, two });
    await system.start();
    await system.stop();

    expect(stopped).to.eql([true, true]);
  });

  it('stops multiple components in dependency order', async () => {
    const stopSequence = [];
    const one = {
      start: async (two) => {
        await pause(two);
      },
      stop: () => {
        stopSequence.push('one');
      },
    };
    const two = {
      start: () => {
      },
      stop: () => {
        stopSequence.push('two');
      },
    };
    const three = {
      start: () => {
      },
      stop: () => {
        stopSequence.push('three');
      },
    };

    const system = electrician.system({ one, two, three });
    await system.start();
    await system.stop();

    expect(stopSequence).to.eql(['three', 'one', 'two']);
  });

  it('does not attempt to start components without start method', async () => {
    const system = electrician.system({ comp: {} });
    const ctx = await system.start();

    expect(ctx.comp).to.not.be.ok();
  });

  it('does not attempt to stop components without stop method', async () => {
    const comp = {
      start: () => {
      },
    };

    const system = electrician.system({ comp });
    await system.start();
    try {
      await system.stop();
    } catch (e) {
      throw new Error('this should not be reached');
    }
  });

  it('returns error when wiring cyclical dependencies on start', async () => {
    const system = electrician.system({
      A: {
        start: async (B) => {
          await pause(B);
        },
      },
      B: {
        start: async (A) => {
          await pause(A);
        },
      },
    });

    try {
      await system.start();
      throw new Error('this should not be reached');
    } catch (e) {
      expect(e.message).to.match(/^Cyclic dependency found/);
    }
  });

  it('reports missing dependencies', async () => {
    const comp = {
      start: async (missing) => {
        await pause(missing);
      },
    };

    const system = electrician.system({ comp });
    try {
      await system.start();
      throw new Error('this should not be reached');
    } catch (e) {
      expect(e.message).to.be('Unknown component: missing');
    }
  });
});
