/**
 * Select a subset of cheerfully.json job listings by optional job `id`.
 */

/**
 * @param {unknown} only
 * @returns {string[]|null} null means no filter; non-empty array means filter
 * @throws {Error} when `only` is present but yields no ids (e.g. bare `-only`)
 */
const normalizeOnly = (only) => {
    if (only === undefined || only === null || only === false) {
        return null;
    }

    if (only === true) {
        throw new Error('`-only` requires one or more job ids (e.g. -only heroes,ui).');
    }

    let raw;

    if (typeof only === 'string') {
        raw = only.split(',');
    } else if (Array.isArray(only)) {
        raw = only;
    } else {
        throw new Error(`Invalid \`only\` value: expected string or string[], got ${typeof only}.`);
    }

    const
        ids = raw
            .map((id) => String(id ?? '').trim())
            .filter((id) => id.length > 0);

    if (!ids.length) {
        throw new Error('`-only` requires one or more job ids (e.g. -only heroes,ui).');
    }

    return ids;
};

/**
 * Build a map from job id → original array index. Hard-errors on duplicate ids.
 *
 * @param {object[]} configs
 * @returns {Map<string, number>}
 */
const indexJobsById = (configs) => {
    const
        byId = new Map();

    for (let i = 0; i < configs.length; i++) {
        const
            job = configs[i],
            jobId = job?.id;

        if (jobId === undefined || jobId === null || jobId === '') {
            continue;
        }

        const
            key = String(jobId);

        if (byId.has(key)) {
            throw new Error(
                `Duplicate job id "${key}" at indices ${byId.get(key)} and ${i}. Job ids must be unique within a service.`
            );
        }

        byId.set(key, i);
    }

    return byId;
};

/**
 * @param {object[]} configs
 * @param {string[]|null} onlyIds from normalizeOnly
 * @returns {{jobs: object[], indices: number[]}}
 */
const filterJobsById = (configs, onlyIds) => {
    if (!onlyIds) {
        return {
            jobs: configs,
            indices: configs.map((_, i) => i)
        };
    }

    const
        byId = indexJobsById(configs),
        known = [...byId.keys()].sort(),
        jobs = [],
        indices = [];

    for (const wanted of onlyIds) {
        if (!byId.has(wanted)) {
            const
                knownList = known.length ? known.join(', ') : '(none)';

            throw new Error(
                `Unknown job id "${wanted}". Known ids: ${knownList}.`
            );
        }

        const
            index = byId.get(wanted);

        jobs.push(configs[index]);
        indices.push(index);
    }

    return {jobs, indices};
};

module.exports = {
    normalizeOnly,
    filterJobsById,
    indexJobsById
};
