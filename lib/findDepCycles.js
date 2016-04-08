var _ = require('lodash');

var MAX_SAFE_INTEGER = 9007199254740991;

// based on https://en.wikipedia.org/wiki/Tarjan%27s_strongly_connected_components_algorithm
function findDepCyclesByKeys(keys, depMap) {
  var stack = [];
  var cycles = [];
  var stackPos = {};
  var process;

  function findLowlink(pos, deps) {
    return _.reduce(_.map(deps, process), function (x, y) {
      return (x > y) ? y : x;
    }, pos);
  }

  process = function (name) {
    var cycle;
    if (stackPos[name]) return stackPos[name];

    var pos = stackPos[name] = stack.push(name);
    var lowlink = findLowlink(pos, depMap[name]);
    if (lowlink >= pos) {
      cycle = _.slice(stack, pos - 1);
      if (cycle.length > 1) cycles.push(cycle);
      stack = _.slice(stack, 0, pos - 1);
      _.assign(stackPos, _.zipObject(cycle, _.map(cycle, function () { return MAX_SAFE_INTEGER; })));
    }

    return lowlink;
  };

  findLowlink(0, keys);

  return cycles;
}

module.exports = function findDepCycles(depMap) {
  return findDepCyclesByKeys(_.keys(depMap), depMap);
};

module.exports._sortedFindDepCycles = function (depMap) {
  return findDepCyclesByKeys(_.sortBy(_.keys(depMap)), depMap);
};
