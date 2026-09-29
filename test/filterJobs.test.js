/**
 * filterJobs — run with: npm test
 */
const
    assert = require('assert'),
    {normalizeOnly, filterJobsById} = require('../src/helpers/filterJobs.js');

// normalizeOnly
assert.strictEqual(normalizeOnly(undefined), null);
assert.strictEqual(normalizeOnly(null), null);
assert.strictEqual(normalizeOnly(false), null);

assert.deepStrictEqual(normalizeOnly('heroes,ui,fx'), ['heroes', 'ui', 'fx']);
assert.deepStrictEqual(normalizeOnly(' heroes , ui '), ['heroes', 'ui']);
assert.deepStrictEqual(normalizeOnly(['heroes', 'ui']), ['heroes', 'ui']);
assert.deepStrictEqual(normalizeOnly([' heroes ', '', 'ui']), ['heroes', 'ui']);

assert.throws(() => normalizeOnly(true), /requires one or more job ids/);
assert.throws(() => normalizeOnly(''), /requires one or more job ids/);
assert.throws(() => normalizeOnly('  ,  '), /requires one or more job ids/);
assert.throws(() => normalizeOnly([]), /requires one or more job ids/);
assert.throws(() => normalizeOnly(42), /Invalid `only` value/);

// filterJobsById — no filter
{
    const
        configs = [{id: 'a'}, {id: 'b'}, {}],
        result = filterJobsById(configs, null);

    assert.deepStrictEqual(result.jobs, configs);
    assert.deepStrictEqual(result.indices, [0, 1, 2]);
}

// filterJobsById — selection order follows `only`, not array order
{
    const
        configs = [
            {id: 'heroes', src: './heroes/'},
            {id: 'ui', src: './ui/'},
            {id: 'fx', src: './fx/'}
        ],
        result = filterJobsById(configs, ['fx', 'heroes']);

    assert.deepStrictEqual(result.indices, [2, 0]);
    assert.strictEqual(result.jobs[0].id, 'fx');
    assert.strictEqual(result.jobs[1].id, 'heroes');
}

// unknown id
assert.throws(
    () => filterJobsById([{id: 'heroes'}, {id: 'ui'}], ['fx']),
    /Unknown job id "fx".*Known ids: heroes, ui/
);

// unknown id when no jobs have ids
assert.throws(
    () => filterJobsById([{}, {}], ['heroes']),
    /Unknown job id "heroes".*Known ids: \(none\)/
);

// duplicate ids when filtering
assert.throws(
    () => filterJobsById([{id: 'heroes'}, {id: 'heroes'}], ['heroes']),
    /Duplicate job id "heroes" at indices 0 and 1/
);

// jobs without id are skipped by the index; still selectable others
{
    const
        configs = [{src: 'a'}, {id: 'ui', src: 'b'}],
        result = filterJobsById(configs, ['ui']);

    assert.deepStrictEqual(result.indices, [1]);
    assert.strictEqual(result.jobs[0].id, 'ui');
}

console.log('filterJobs.test.js: ok');
