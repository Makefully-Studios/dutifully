/**
 * Map Dutifully umbrella services + provider → Cheerfully concrete service ids.
 */

const
    UMBRELLAS = {
        translate: {
            defaultProvider: 'amazon',
            providers: {
                amazon: 'amazontranslate',
                amazontranslate: 'amazontranslate',
                deepl: 'deepl',
                google: 'googletranslate',
                googletranslate: 'googletranslate',
                microsoft: 'microsofttranslate',
                microsofttranslate: 'microsofttranslate'
            }
        },
        lipsync: {
            defaultProvider: 'rhubarb',
            providers: {
                rhubarb: 'rhubarb',
                allosaurus: 'allosaurus'
            }
        },
        voiceover: {
            defaultProvider: 'elevenlabs',
            providers: {
                polly: 'polly',
                elevenlabs: 'elevenlabs'
            }
        }
    },
    isUmbrella = (service) => Boolean(UMBRELLAS[service]),
    /**
     * @returns {{ cheerfullyService: string, provider: string, job: object }}
     */
    resolveProviderService = (umbrella, job = {}) => {
        const
            table = UMBRELLAS[umbrella];

        if (!table) {
            const
                cleaned = {...job};

            delete cleaned.provider;

            return {
                cheerfullyService: umbrella,
                provider: null,
                job: cleaned
            };
        }

        const
            raw = job.provider == null || job.provider === ''
                ? table.defaultProvider
                : String(job.provider).toLowerCase().trim(),
            cheerfullyService = table.providers[raw];

        if (!cheerfullyService) {
            const
                allowed = [...new Set(Object.keys(table.providers))].sort().join(', ');

            throw new Error(
                `Unknown provider "${job.provider}" for "${umbrella}". Use one of: ${allowed}.`
            );
        }

        const
            cleaned = {...job};

        delete cleaned.provider;

        return {
            cheerfullyService,
            provider: raw,
            job: cleaned
        };
    };

module.exports = {
    UMBRELLAS,
    isUmbrella,
    resolveProviderService
};
