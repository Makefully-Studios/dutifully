/**
 * resolveProviderService — run with: npm test
 */
const
    assert = require('assert'),
    {
        isUmbrella,
        resolveProviderService
    } = require('../src/helpers/resolveProviderService.js');

assert.strictEqual(isUmbrella('translate'), true);
assert.strictEqual(isUmbrella('lipsync'), true);
assert.strictEqual(isUmbrella('voiceover'), true);
assert.strictEqual(isUmbrella('deepl'), false);

{
    const
        r = resolveProviderService('translate', {script: './a.json'});

    assert.strictEqual(r.cheerfullyService, 'amazontranslate');
    assert.strictEqual(r.provider, 'amazon');
    assert.strictEqual(r.job.provider, undefined);
    assert.strictEqual(r.job.script, './a.json');
}

{
    const
        r = resolveProviderService('translate', {provider: 'deepl', format: 'catalog'});

    assert.strictEqual(r.cheerfullyService, 'deepl');
    assert.ok(!('provider' in r.job));
}

{
    const
        r = resolveProviderService('translate', {provider: 'Google'});

    assert.strictEqual(r.cheerfullyService, 'googletranslate');
}

{
    const
        r = resolveProviderService('lipsync', {});

    assert.strictEqual(r.cheerfullyService, 'rhubarb');
}

{
    const
        r = resolveProviderService('voiceover', {provider: 'polly'});

    assert.strictEqual(r.cheerfullyService, 'polly');
}

{
    const
        r = resolveProviderService('voiceover', {});

    assert.strictEqual(r.cheerfullyService, 'elevenlabs');
}

assert.throws(
    () => resolveProviderService('translate', {provider: 'nllb'}),
    /Unknown provider/
);

{
    const
        r = resolveProviderService('deepl', {provider: 'ignored', format: 'json'});

    assert.strictEqual(r.cheerfullyService, 'deepl');
    assert.strictEqual(r.provider, null);
    assert.ok(!('provider' in r.job));
}

console.log('resolveProviderService.test.js ok');
