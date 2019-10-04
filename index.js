const debug = require('debug')('electrician');
const Toposort = require('toposort-class');
const functionArguments = require('fn-args');

const startSequence = components => {
  const deps = new Toposort();
  const noDeps = [];
  for (const [name, component] of Object.entries(components)) {
    const signature = component.start && functionArguments(component.start);
    if (signature && signature.length > 0) {
      deps.add(name, signature);
    } else {
      noDeps.push(name);
    }
  }
  return [...new Set(deps.sort().reverse().concat(noDeps))];
};

const stopSequence = (components) => startSequence(components).reverse();

const startComponent = (ctx, component, id) => {
  const dependencies = []
    .concat(component.start && functionArguments(component.start))
    .map(name => ctx[name]);
  debug(`Resolving ${dependencies.length} dependencies for component ${id}`);
  try {
    return component.start(...dependencies);
  } catch (e) {
    e.message = `${id}: ${e.message}`;
    throw e;
  }
};

const stopComponent = async (component, id) => {
  debug(`Stopping component ${id}`);
  try {
    await component.stop();
  } catch (e) {
    e.message = `${id}: ${e.message}`;
    throw e;
  }
};

const system = components => {
  const ctx = {};

  const start = async () => {
    const sequence = startSequence(components);
    for (const key of sequence) {
      const component = components[key];
      debug(`Starting component ${key}`);
      if (!component) {
        throw new Error(`Unknown component: ${key}`);
      }
      if (component.start) {
        ctx[key] = await startComponent(ctx, component, key);
      }
    }
    return ctx;
  };

  const stop = async () => {
    const sequence = stopSequence(components);
    for (const key of sequence) {
      const component = components[key];
      if (component.stop) {
        await stopComponent(component, key);
      }
    }
  };

  return {
    start,
    stop,
  };
};

module.exports = {
  system,
};
