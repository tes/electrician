var _ = require('lodash');

function findMissingDeps(components) {
  return _.uniq(_.reduce(components, function (result, component) {
    return result.concat(_.reduce(component.dependencies || [], function (innerResult, dep) {
      return components[dep] ? innerResult : innerResult.concat(dep);
    }, []));
  }, []));
}
module.exports = findMissingDeps;
