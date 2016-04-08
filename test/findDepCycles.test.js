var expect = require('expect.js');

// use _sortedFindDepCycles for consistency
var findDepCycles = require('../lib/findDepCycles')._sortedFindDepCycles;

describe('FindDepCycles', function () {
  it('does not find a cycle with only one element', function () {
    expect(findDepCycles({ a: [] })).to.eql([]);
  });
  it('does not find a cycle with no deps', function () {
    expect(findDepCycles({ a: [], b: [], c: [], d: [] })).to.eql([]);
  });
  it('does not find a cycle based on key ordering', function () {
    expect(findDepCycles({ a: [], b: ['c'], c: ['a'] })).to.eql([]);
  });
  it('does not find a cycle in a line', function () {
    expect(findDepCycles({ a: ['b'], b: ['c'], c: ['d'], d: [] })).to.eql([]);
  });
  it('finds two-item cycle', function () {
    expect(findDepCycles({ a: ['b'], b: ['a'] })).to.eql([['a', 'b']]);
  });
  it('finds four-item cycle', function () {
    expect(findDepCycles({ a: ['b'], b: ['c'], c: ['d'], d: ['a'] })).to.eql([['a', 'b', 'c', 'd']]);
  });
  it('finds two-item cycle with extras', function () {
    expect(findDepCycles({ a: ['b'], b: ['a'], c: [], d: ['c'] })).to.eql([['a', 'b']]);
  });
  it('finds three-item cycle', function () {
    expect(findDepCycles({ a: ['b'], b: ['c'], c: ['a'] })).to.eql([['a', 'b', 'c']]);
  });
  it('finds butterfly cycle', function () {
    expect(findDepCycles({ a: ['b'], b: ['c', 'd'], c: ['a'], d: ['a'] })).to.eql([['a', 'b', 'c', 'd']]);
  });
  it('finds fully-connected cycle', function () {
    expect(findDepCycles({ a: ['b', 'c', 'd'], b: ['a', 'c', 'd'], c: ['a', 'b', 'd'], d: ['a', 'b', 'c'] })).to.eql([['a', 'b', 'c', 'd']]);
  });
  it('finds two separate cycles', function () {
    expect(findDepCycles({ a: ['b'], b: ['c'], c: ['a'], d: ['e'], e: ['f'], f: ['d'] })).to.eql([['a', 'b', 'c'], ['d', 'e', 'f']]);
  });
  it('finds wikipedia example cycles', function () {
    // https://en.wikipedia.org/wiki/Tarjan%27s_strongly_connected_components_algorithm
    expect(findDepCycles({ a: ['e'], b: ['a'], c: ['b', 'd'], d: ['c'], e: ['b'], f: ['e', 'b', 'g'], g: ['f', 'c'], h: ['f', 'd'] })).to.eql([['a', 'e', 'b'], ['c', 'd'], ['f', 'g']]);
  });
  it('finds no cycles for wikipedia DAG examples', function () {
    // https://en.wikipedia.org/wiki/Directed_acyclic_graph
    expect(findDepCycles({ a: ['c'], b: [], c: ['b', 'e', 'f'], d: ['b', 'g'], e: [], f: [], g: ['f'], h: ['c', 'g'] })).to.eql([]);
    expect(findDepCycles({ a: [], b: ['a'], c: ['a'], d: ['a'], e: ['b', 'c'], f: ['b', 'd'], g: ['c', 'd'], h: ['e', 'f', 'g'] })).to.eql([]);
  });
  it('finds no cycles for random example', function () {
    expect(findDepCycles({ a: ['b'], b: ['e'], c: ['b'], d: [], e: ['d'], f: ['e'], g: ['f'], h: ['d'], i: ['h'], j: ['f'], k: ['g', 'j'] })).to.eql([]);
  });
});
