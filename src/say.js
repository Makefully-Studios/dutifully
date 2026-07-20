/* eslint-disable no-sync */
/* global console, process, require */
const
    fs = require('fs'),
    fsp = require('fs').promises,
    path = require('path'),
    {createHash} = require('crypto'),
    {AudioContext} = require('node-web-audio-api'),
    ElevenLabs = require('./classes/ElevenLabs'),
    getJSON = require('./helpers/getJSON'),
    CACHE_DIR = '.cache/tts',
    resolveVoiceId = (voice) => {
        if (!voice) {
            return null;
        }

        if (typeof voice === 'string') {
            return voice;
        }

        return voice.default ?? Object.values(voice)[0] ?? null;
    },
    cacheKey = ({voice, text}) => createHash('sha256')
        .update(JSON.stringify({
            version: 1,
            voice,
            text
        }))
        .digest('hex'),
    playMp3 = async (file) => {
        const
            audioContext = new AudioContext(),
            data = await fsp.readFile(file),
            arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength),
            buffer = await audioContext.decodeAudioData(arrayBuffer),
            source = audioContext.createBufferSource();

        source.buffer = buffer;
        source.connect(audioContext.destination);

        await new Promise((resolve, reject) => {
            source.onended = resolve;
            try {
                source.start();
            } catch (e) {
                reject(e);
            }
        });

        await audioContext.close();
    },
    generate = async ({text, voice, key, contents, elevenlabsConfig}) => {
        const
            output = `${CACHE_DIR}/`,
            config = {
                ...elevenlabsConfig,
                files: {
                    [key]: text
                },
                path: '',
                voice,
                output
            },
            handler = new ElevenLabs({
                config,
                contents: {
                    ...contents,
                    service: 'elevenlabs'
                }
            });

        delete config.script;

        await handler.prepare({
            difference: false,
            extract: true
        });
        await handler.send({
            instanceId: `${contents.id}-say`
        });

        return path.join(CACHE_DIR, `${key}.mp3`);
    };

module.exports = async (textOrArgs = {}) => {
    const
        isString = typeof textOrArgs === 'string',
        cmdArgs = isString ? {} : (textOrArgs ?? {}),
        text = (isString ? textOrArgs : (cmdArgs.text ?? '')).trim();

    if (!text) {
        throw new Error('Usage: say "Hello world"');
    }

    const
        packageJson = await getJSON('./package.json') ?? {},
        cheerfully = await getJSON('./cheerfully.json') ?? {},
        env = await getJSON('./env-cheerfully.json') ?? {},
        contents = {
            id: `${packageJson.name ?? 'cheerfully'}-${packageJson.version ?? '0'}`,
            package: packageJson,
            ...cheerfully,
            ...env,
            ...cmdArgs
        },
        elevenlabsConfig = Array.isArray(contents.elevenlabs)
            ? (contents.elevenlabs[0] ?? {})
            : (contents.elevenlabs ?? {}),
        voice = elevenlabsConfig.voice,
        voiceId = resolveVoiceId(voice);

    if (!voiceId) {
        throw new Error('No ElevenLabs voice configured. Set elevenlabs[0].voice in cheerfully.json.');
    }

    if (!contents.server || !contents.accessToken) {
        throw new Error('Missing server/accessToken. Set them in env-cheerfully.json.');
    }

    await fsp.mkdir(CACHE_DIR, {recursive: true});

    const
        key = cacheKey({
            voice: voiceId,
            text
        }),
        mp3File = path.join(CACHE_DIR, `${key}.mp3`);

    if (!fs.existsSync(mp3File)) {
        console.log('Generating speech...');
        await generate({
            text,
            voice,
            key,
            contents,
            elevenlabsConfig
        });
    }

    await playMp3(mp3File);
};
