/* eslint-disable no-sync */
/* global console, process, require */
const
    LipSync = require('./classes/LipSync'),
    Translate = require('./classes/Translate'),
    parsers = {
        allosaurus: LipSync,
        amazontranslate: Translate,
        classfully: require('./classes/Classfully'),
        deepl: Translate,
        elevenlabs: require('./classes/ElevenLabs'),
        ffmpeg: require('./classes/FFMPEG'),
        googletranslate: Translate,
        microsofttranslate: Translate,
        packfully: require('./classes/Packfully'),
        polly: require('./classes/Polly'),
        rasterize: require('./classes/Rasterize'),
        rhubarb: LipSync,
        sharp: require('./classes/Sharp'),
        stackfully: require('./classes/Stackfully'),
        transcription: require('./classes/Transcription'),
        // Concrete only — umbrellas (translate / lipsync / voiceover) resolve first.
        translate: Translate
    },
    getJSON = require('./helpers/getJSON'),
    {normalizeOnly, filterJobsById} = require('./helpers/filterJobs'),
    {isUmbrella, resolveProviderService} = require('./helpers/resolveProviderService'),
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

            let
                cheerfullyService = service,
                jobConfig = config;

            if (isUmbrella(service)) {
                try {
                    const
                        resolved = resolveProviderService(service, config);

                    cheerfullyService = resolved.cheerfullyService;
                    jobConfig = resolved.job;
                } catch (e) {
                    console.warn(e.message);
                    continue;
                }
            }

            const
                Parser = parsers[cheerfullyService];

            if (!Parser) {
                console.warn(`No Dutifully parser for Cheerfully service "${cheerfullyService}".`);
                continue;
            }

            const
                contentsForJob = {
                    ...contents,
                    service: cheerfullyService
                },
                serviceHandler = new Parser({config: jobConfig, contents: contentsForJob});

            try {
                await serviceHandler.prepare({...contentsForJob, ...jobConfig});
            } catch (e) {
                console.warn(e.message);
                continue;
            }

            try {
                await serviceHandler.send({
                    instanceId: `${id}-${cheerfullyService}${length > 1 ? `-${index}` : ''}`
                });
            } catch (e) {
                console.warn(`Error running "${cheerfullyService}" (${index}): ${e.message || e}`);
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
