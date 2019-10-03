let startCounter;
let stopCounter;

const initialState = () => ({
  started: false,
  stopped: false,
  startSequence: 0,
  stopSequence: 0,
});

const resetCounters = () => {
  startCounter = 1;
  stopCounter = 1;
};

const Component = () => {
  const state = initialState();

  return {
    state,
    start: next => {
      state.started = true;
      state.startSequence = startCounter;
      startCounter += 1;
      next(null, state);
    },
    stop: next => {
      state.stopped = true;
      state.stopSequence = stopCounter;
      stopCounter += 1;
      next(null, state);
    },
  };
};

const DepComponent = (dependency1) => {
  const state = initialState();
  return {
    state,
    dependsOn: dependency1,
    start: (dependency, next) => {
      state.started = true;
      state.startSequence = startCounter;
      startCounter += 1;
      next(null, state);
    },
    stop: next => {
      state.stopped = true;
      state.stopSequence = stopCounter;
      stopCounter += 1;
      next(null, state);
    },
  };
};

module.exports = {
  Component,
  DepComponent,
  resetCounters,
};
