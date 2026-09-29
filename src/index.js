/* eslint-disable no-sync */
/* global console, process, require */
const
    LipSync = require('./classes/LipSync'),
    parsers = {
        allosaurus: LipSync,
        classfully: require('./classes/Classfully'),
        elevenlabs: require('./classes/ElevenLabs'),
        ffmpeg: require('./classes/FFMPEG'),
        packfully: require('./classes/Packfully'),
        polly: require('./classes/Polly'),
        rasterize: require('./classes/Rasterize'),
        rhubarb: LipSync,
        sharp: require('./classes/Sharp'),
        stackfully: require('./classes/Stackfully'),
        transcription: require('./classes/Transcription'),
        translate: require('./classes/Translate')
    },
    getJSON = require('./helpers/getJSON'),
    {normalizeOnly, filterJobsById} = require('./helpers/filterJobs'),
    send = async function (contents) {
        const
            {id, service} = contents,
            configs = Array.isArray(contents[service]) ? contents[service] : [contents[service]],
            onlyIds = normalizeOnly(contents.only),
            {jobs, indices} = filterJobsById(configs, onlyIds),
            {length} = configs;

        for (let i = 0; i < jobs.length; i++) {
            const
                config = jobs[i],
                index = indices[i];

            if (!config) {
                console.warn(`Empty configuration for "${service}" service.`);
                continue;
            }

            const
                serviceHandler = new parsers[service]({config, contents});

            try {
                await serviceHandler.prepare({...contents, ...config});
            } catch (e) {
                console.warn(e.message);
                continue;
            }

            try {
                await serviceHandler.send({
                    instanceId: `${id}-${service}${length > 1 ? `-${index}` : ''}`
                });
            } catch (e) {
                console.warn(`Error running "${service}" (${index}): ${e.message || e}`);
            }
        }
    };

const cheer = async (cmdArgs) => {
    const
        package = await getJSON('./package.json') ?? {},
        config = await getJSON('./cheerfully.json') ?? {},
        env = await getJSON('./env-cheerfully.json') ?? {};

    await send({
        id: `${package.name}-${package.version}`,
        package,
        ...config,
        ...env,
        ...cmdArgs
    });
};

cheer.say = require('./say');

module.exports = cheer;
