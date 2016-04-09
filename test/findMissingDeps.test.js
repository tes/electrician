var expect = require('expect.js');
var _ = require('lodash');

var findMissingDeps = require('../lib/findMissingDeps');
var makeComponentMap = require('./components').makeComponentMap;

function find(depMap) {
  return _.sortBy(findMissingDeps(makeComponentMap(depMap)));
}

describe('findMissingDeps', function () {
  it('finds no phantom missing deps', function () {
    expect(find({})).to.eql([]);
  });
  it('finds one missing dep', function () {
    expect(find({ a: ['b'] })).to.eql(['b']);
  });
  it('finds two missing dep for the same component', function () {
    expect(find({ a: ['b', 'c'] })).to.eql(['b', 'c']);
  });
  it('finds two missing dep for different components', function () {
    expect(find({ a: ['b'], c: ['d'] })).to.eql(['b', 'd']);
  });
  it('dedupes missing deps', function () {
    expect(find({ a: ['b'], c: ['b'] })).to.eql(['b']);
  });
  it('finds no missing deps when not missing', function () {
    expect(find({ a: ['b'], b: [] })).to.eql([]);
  });
  it('finds none for fully-connected system', function () {
    expect(find({ a: ['b', 'c', 'd'], b: ['a', 'c', 'd'], c: ['a', 'b', 'd'], d: ['a', 'b', 'c'] })).to.eql([]);
  });
  it('finds none for wikipedia example cycles', function () {
    // https://en.wikipedia.org/wiki/Tarjan%27s_strongly_connected_components_algorithm
    expect(find({ a: ['e'], b: ['a'], c: ['b', 'd'], d: ['c'], e: ['b'], f: ['e', 'b', 'g'], g: ['f', 'c'], h: ['f', 'd'] })).to.eql([]);
  });
  it('finds some for wikipedia example cycles with extra', function () {
    // https://en.wikipedia.org/wiki/Tarjan%27s_strongly_connected_components_algorithm
    expect(find({ a: ['e'], b: ['a', 'i'], c: ['b', 'd', 'j'], d: ['c'], e: ['b'], f: ['e', 'b', 'g', 'j'], g: ['f', 'c', 'k'], h: ['f', 'd'] })).to.eql(['i', 'j', 'k']);
  });
  it('finds none for wikipedia DAG examples', function () {
    // https://en.wikipedia.org/wiki/Directed_acyclic_graph
    expect(find({ a: ['c'], b: [], c: ['b', 'e', 'f'], d: ['b', 'g'], e: [], f: [], g: ['f'], h: ['c', 'g'] })).to.eql([]);
    expect(find({ a: [], b: ['a'], c: ['a'], d: ['a'], e: ['b', 'c'], f: ['b', 'd'], g: ['c', 'd'], h: ['e', 'f', 'g'] })).to.eql([]);
  });
  it('finds some for wikipedia DAG examples with extra', function () {
    // https://en.wikipedia.org/wiki/Directed_acyclic_graph
    expect(find({ a: ['c'], b: [], c: ['b', 'e', 'f', 'i'], d: ['b', 'g'], e: ['j'], f: [], g: ['f', 'j'], h: ['c', 'g', 'k'] })).to.eql(['i', 'j', 'k']);
    expect(find({ a: [], b: ['a', 'j'], c: ['a', 'i'], d: ['a'], e: ['b', 'c'], f: ['b', 'd', 'i', 'k'], g: ['c', 'd'], h: ['e', 'f', 'g'] })).to.eql(['i', 'j', 'k']);
  });
});
