/**
 * Client-side mirror of Cheerfully server/helpers/jobExports.js
 * Keep catalog subsets in sync with the canonical Cheerfully module.
 */

const LYRIC_FORMATS = ['json', 'lrc', 'mp3', 'sami', 'smi', 'srt', 'vtt', 'tsv', 'xml', 'dat', 'webm'];
const TRANSCRIPTION_FORMATS = ['json', 'lrc', 'mp3', 'sami', 'smi', 'srt', 'vtt', 'webm'];
const PACKFULLY_FORMATS = ['texturepacker', 'json-array', 'createjs', 'spine', 'css', 'starling', 'unity', 'godot'];
const TRANSLATE_FORMATS = ['json', 'i18n', 'catalog', 'po', 'xliff', 'properties', 'yml', 'yaml', 'strings', 'xml', 'csv', 'tsv'];
/** Extensions that satisfy the `webm` embed export (same Matroska container). */
const WEB_M_SOURCE_EXTS = ['webm', 'weba'];

const EXPORT_CATALOG = {
    transcription: {
        keys: ['format', 'exportFormat', 'exports', 'f'],
        formats: TRANSCRIPTION_FORMATS,
        constraints: {
            mp3: {sourceExt: 'mp3'},
            webm: {sourceExt: WEB_M_SOURCE_EXTS}
        }
    },
    rhubarb: {
        keys: ['exportFormat', 'exports', 'f'],
        formats: LYRIC_FORMATS,
        constraints: {
            mp3: {sourceExt: 'mp3'},
            webm: {sourceExt: WEB_M_SOURCE_EXTS}
        }
    },
    allosaurus: {
        keys: ['exportFormat', 'exports', 'f'],
        formats: LYRIC_FORMATS,
        constraints: {
            mp3: {sourceExt: 'mp3'},
            webm: {sourceExt: WEB_M_SOURCE_EXTS}
        }
    },
    translate: {
        keys: ['format', 'exports'],
        formats: TRANSLATE_FORMATS
    },
    amazontranslate: {
        keys: ['format', 'exports'],
        formats: TRANSLATE_FORMATS
    },
    deepl: {
        keys: ['format', 'exports'],
        formats: TRANSLATE_FORMATS
    },
    googletranslate: {
        keys: ['format', 'exports'],
        formats: TRANSLATE_FORMATS
    },
    microsofttranslate: {
        keys: ['format', 'exports'],
        formats: TRANSLATE_FORMATS
    },
    packfully: {
        keys: ['format', 'exports', 'exportFormat'],
        formats: PACKFULLY_FORMATS
    }
};

const normalizeFormatId = (format) => {
    const
        id = String(format).toLowerCase().replace(/^\./, '');

    if (id === 'jpeg') {
        return 'jpg';
    }

    return id;
};

const normalizeExt = (ext) => String(ext || '').toLowerCase().replace(/^\./, '');

const isWebMExt = (ext) => WEB_M_SOURCE_EXTS.includes(normalizeExt(ext));

const embedArchiveExt = (exportFormat, sourceExt) => {
    if (exportFormat === 'webm' && isWebMExt(sourceExt)) {
        return normalizeExt(sourceExt);
    }

    return exportFormat;
};

const sourceExtAllowed = (ruleExt, sourceExt) => {
    if (!ruleExt || !sourceExt) {
        return true;
    }

    const
        allowed = Array.isArray(ruleExt) ? ruleExt : [ruleExt],
        src = normalizeExt(sourceExt);

    return allowed.map(normalizeExt).includes(src);
};

const extractRawValue = (job = {}, keys = []) => {
    for (let i = 0; i < keys.length; i++) {
        const
            key = keys[i];

        if (job[key] !== undefined) {
            return job[key];
        }

        if (job.options?.[key] !== undefined) {
            return job.options[key];
        }
    }

    return undefined;
};

const applyConstraints = (formats, constraints = {}, {sourceExt} = {}) => formats.filter((format) => {
    const
        rule = constraints[format];

    if (!rule) {
        return true;
    }

    if (rule.sourceExt && sourceExt && !sourceExtAllowed(rule.sourceExt, sourceExt)) {
        return false;
    }

    return true;
});

const resolveJobExports = (job = {}, serviceId, {sourceExt, defaultFormats} = {}) => {
    const
        catalog = EXPORT_CATALOG[serviceId];

    if (!catalog) {
        throw new Error(`Unknown export service "${serviceId}"`);
    }

    const
        raw = extractRawValue(job, catalog.keys);

    if (raw === undefined) {
        const
            fallback = defaultFormats?.length
                ? defaultFormats.map(normalizeFormatId)
                : [catalog.formats[0]];

        return applyConstraints([...new Set(fallback)], catalog.constraints, {sourceExt});
    }

    if (raw === null || raw === '') {
        return applyConstraints([...catalog.formats], catalog.constraints, {sourceExt});
    }

    const
        list = (Array.isArray(raw) ? raw : [raw])
            .map(normalizeFormatId)
            .filter(Boolean),
        seen = new Set(),
        out = [];

    list.forEach((format) => {
        if (!catalog.formats.includes(format)) {
            return;
        }

        if (!seen.has(format)) {
            seen.add(format);
            out.push(format);
        }
    });

    const
        constrained = applyConstraints(out.length ? out : [catalog.formats[0]], catalog.constraints, {sourceExt});

    return constrained.length ? constrained : applyConstraints([catalog.formats[0]], catalog.constraints, {sourceExt});
};

module.exports = {
    EXPORT_CATALOG,
    WEB_M_SOURCE_EXTS,
    isWebMExt,
    embedArchiveExt,
    resolveJobExports
};
