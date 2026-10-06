/**
 * Merge Dutifully env-cheerfully.json `auth.<service>` into a job's `auth`.
 * Job-level auth wins; env fills defaults. Legacy `elevenLabsApiKey` maps to elevenlabs.
 */

const isPlainObject = (value) => (
    value != null && typeof value === 'object' && !Array.isArray(value)
);

/**
 * Normalize legacy env aliases into `contents.auth`.
 * @param {Record<string, unknown>} contents
 * @returns {Record<string, unknown>}
 */
const normalizeContentsAuth = (contents = {}) => {
    const
        auth = isPlainObject(contents.auth) ? {...contents.auth} : {};

    if (contents.elevenLabsApiKey) {
        auth.elevenlabs = {
            ...(isPlainObject(auth.elevenlabs) ? auth.elevenlabs : {}),
            apiKey: contents.elevenLabsApiKey
        };
    }

    return auth;
};

/**
 * Apply service auth defaults onto a job config (mutates config).
 * @param {Record<string, unknown>} config job listing from cheerfully.json
 * @param {Record<string, unknown>} contents merged cheer + env + CLI
 * @param {string} [service] Cheerfully service id (defaults to contents.service)
 * @returns {Record<string, unknown>} config
 */
const applyServiceAuth = (config, contents = {}, service = contents.service) => {
    if (!config || typeof config !== 'object') {
        return config;
    }

    const
        authMap = normalizeContentsAuth(contents),
        fromEnv = service && isPlainObject(authMap[service]) ? {...authMap[service]} : {},
        fromJob = isPlainObject(config.auth) ? {...config.auth} : {},
        // Legacy ElevenLabs top-level apiKey on the job
        legacyJobKey = service === 'elevenlabs'
            && typeof config.apiKey === 'string'
            && config.apiKey
            && fromJob.apiKey == null
            ? {apiKey: config.apiKey}
            : {};

    const
        merged = {
            ...fromEnv,
            ...legacyJobKey,
            ...fromJob
        };

    if (isPlainObject(fromEnv.config) || isPlainObject(fromJob.config) || isPlainObject(legacyJobKey.config)) {
        merged.config = {
            ...(isPlainObject(fromEnv.config) ? fromEnv.config : {}),
            ...(isPlainObject(fromJob.config) ? fromJob.config : {})
        };

        if (isPlainObject(fromEnv.config?.credentials) || isPlainObject(fromJob.config?.credentials)) {
            merged.config.credentials = {
                ...(isPlainObject(fromEnv.config?.credentials) ? fromEnv.config.credentials : {}),
                ...(isPlainObject(fromJob.config?.credentials) ? fromJob.config.credentials : {})
            };
        }
    }

    if (Object.keys(merged).length) {
        config.auth = merged;
    }

    // Prefer auth container; drop legacy top-level apiKey once folded in.
    if (service === 'elevenlabs' && config.apiKey != null && config.auth?.apiKey) {
        delete config.apiKey;
    }

    return config;
};

module.exports = {
    normalizeContentsAuth,
    applyServiceAuth
};
