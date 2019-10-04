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
      start: async () => {
        await pause();
        started = true;
      },
    };

    const system = electrician.system({ comp });
    await system.start();

    expect(started).to.be(true);
  });

  it('starts multiple components', async () => {
    const started = [false, false];
    const one = {
      start: async () => {
        await pause();
        started[0] = true;
      },
    };
    const two = {
      start: async () => {
        await pause();
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
        await pause(two);
        startSequence.push('one');
      },
    };
    const two = {
      start: async () => {
        await pause();
        startSequence.push('two');
      },
    };
    const three = {
      start: async () => {
        await pause();
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
      start: async () => {
        await pause();
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
      start: async () => {
        await pause();
      },
      stop: async () => {
        await pause();
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
      start: async () => {
        await pause();
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
      start: async () => {
        await pause();
      },
      stop: async () => {
        await pause();
        stopped[0] = true;
      },
    };
    const two = {
      start: async () => {
        await pause();
      },
      stop: async () => {
        await pause();
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
      stop: async () => {
        await pause();
        stopSequence.push('one');
      },
    };
    const two = {
      start: async () => {
        await pause();
      },
      stop: async () => {
        await pause();
        stopSequence.push('two');
      },
    };
    const three = {
      start: async () => {
        await pause();
      },
      stop: async () => {
        await pause();
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
      start: async () => {
        await pause();
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
