const test = require('node:test');
const assert = require('node:assert/strict');
const {applyServiceAuth, normalizeContentsAuth} = require('../src/helpers/applyServiceAuth.js');

test('normalizeContentsAuth maps elevenLabsApiKey', () => {
    const auth = normalizeContentsAuth({elevenLabsApiKey: 'k1'});

    assert.equal(auth.elevenlabs.apiKey, 'k1');
});

test('applyServiceAuth: env fills defaults; job auth wins', () => {
    const config = applyServiceAuth(
        {language: 'en', auth: {apiKey: 'job'}},
        {
            service: 'deepl',
            auth: {deepl: {apiKey: 'env', serverUrl: 'https://api-free.deepl.com'}}
        },
        'deepl'
    );

    assert.equal(config.auth.apiKey, 'job');
    assert.equal(config.auth.serverUrl, 'https://api-free.deepl.com');
});

test('applyServiceAuth: legacy elevenLabsApiKey injects for elevenlabs', () => {
    const config = applyServiceAuth(
        {files: {}},
        {service: 'elevenlabs', elevenLabsApiKey: 'from-env'},
        'elevenlabs'
    );

    assert.equal(config.auth.apiKey, 'from-env');
});

test('applyServiceAuth: folds legacy job apiKey into auth and removes top-level', () => {
    const config = applyServiceAuth(
        {apiKey: 'legacy-job', files: {}},
        {service: 'elevenlabs'},
        'elevenlabs'
    );

    assert.equal(config.auth.apiKey, 'legacy-job');
    assert.equal(config.apiKey, undefined);
});

test('applyServiceAuth: job auth beats elevenLabsApiKey', () => {
    const config = applyServiceAuth(
        {auth: {apiKey: 'job'}},
        {service: 'elevenlabs', elevenLabsApiKey: 'env'},
        'elevenlabs'
    );

    assert.equal(config.auth.apiKey, 'job');
});
