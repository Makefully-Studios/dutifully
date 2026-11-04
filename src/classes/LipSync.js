const
    Cheer = require('./Cheer'),
    fs = require('fs').promises,
    getJSON = require('../helpers/getJSON'),
    {resolveJobExports, isWebMExt} = require('../helpers/jobExports'),
    {ensureDir, ensureParentDir, readdirOrEmpty} = require('../helpers/dirs'),
    id3 = require('node-id3').Promise,
    getFileData = require('../helpers/getFileData'),
    fileExt = (file) => {
        const
            i = file.lastIndexOf('.');

        return i >= 0 ? file.slice(i + 1).toLowerCase() : '';
    },
    filter = (fileType, file) => {
        if (file.indexOf('.') === 0) {
            return false;
        }

        const
            ext = fileExt(file);

        if (fileType === 'webm') {
            return isWebMExt(ext);
        }

        return ext === fileType;
    },
    AUDIO_SRC_EXTS = ['mp3', 'webm', 'weba'],
    stripExt = (file) => file.replace(/\.[^.]+$/, ''),
    combine = async (path, fileType) => {
        const
            files = (await readdirOrEmpty(path)).filter(filter.bind(null, fileType)),
            list = [];
        
        for (let i = 0; i < files.length; i++) {
            const
                file = files[i],
                ext = fileExt(file);

            if (fileType === 'mp3') {
                const
                    {synchronisedLyrics} = await id3.read(`${path}${file}`);

                if (synchronisedLyrics) {
                    const
                        index = synchronisedLyrics.map(({shortText}) => shortText).indexOf('lipsync');

                    if (index >= 0) {
                        list.push(stripExt(file));
                    }
                }
            } else if (fileType === 'webm' || isWebMExt(ext)) {
                try {
                    const
                        webm = await getFileData(`${path}${file}`, ext);

                    if (webm.hasTimedTrack('lipsync')) {
                        list.push(stripExt(file));
                    }
                } catch (e) {
                    // ignore unreadable webm/weba
                }
            } else {
                list.push(stripExt(file));
            }
        }

        return list;
    },
    sortKeys = (obj) => Object.keys(obj).sort().reduce((s, key) => {
        s[key] = obj[key];
        return s;
    }, {}),
    mapReduction = (map, list) => list.reduce((obj, file) => {
        const
            id = stripExt(file);

        obj[id] = map[id];
        return obj;
    }, {}),
    LipSync = class LipSync extends Cheer {
        async prepare (data) {
            this.differenceOnly = false;
            this.updateList = null;
            await this.replaceConfigPathWithJSON('script', 'files');
            return super.prepare(data);
        }

        async checkDifference () {
            const
                {config, service} = this,
                {files = {}, options = {}, output, src, exports: configExports} = config,
                exportFormats = resolveJobExports({
                    exports: configExports,
                    options
                }, service, {defaultFormats: ['json']}),
                usesJsonAggregate = exportFormats.includes('json'),
                file = 'mouthCues.json';

            if (output) {
                await ensureDir(output);
            }

            const
                raw = usesJsonAggregate ? await getJSON(`${output}${file}`) ?? {} : null,
                formatLists = {},
                loadFormatList = async (formatId) => {
                    if (formatId === 'json') {
                        return raw ? Object.keys(raw) : [];
                    }

                    formatLists[formatId] = formatLists[formatId] ?? await combine(output, formatId);
                    return formatLists[formatId];
                },
                markDone = (id) => {
                    if (raw) {
                        delete raw[id];
                    }

                    exportFormats.forEach((formatId) => {
                        if (formatId === 'json') {
                            return;
                        }

                        const
                            list = formatLists[formatId];

                        if (!list) {
                            return;
                        }

                        const
                            index = list.indexOf(id);

                        if (index >= 0) {
                            list.splice(index, 1);
                        }
                    });
                },
                isCurrent = async (id) => {
                    for (let i = 0; i < exportFormats.length; i++) {
                        const
                            formatId = exportFormats[i],
                            list = await loadFormatList(formatId);

                        if (list.indexOf(id) < 0) {
                            return false;
                        }
                    }

                    markDone(id);
                    return true;
                },
                mergeLipSync = async (newLipSync = false) => {
                    const
                        staleIds = new Set();

                    if (raw) {
                        Object.keys(raw).forEach((key) => staleIds.add(key));
                    }

                    exportFormats.forEach((formatId) => {
                        if (formatId === 'json') {
                            return;
                        }

                        (formatLists[formatId] || []).forEach((key) => staleIds.add(key));
                    });

                    for (const key of staleIds) {
                        if (raw) {
                            delete raw[key];
                        }

                        for (let i = 0; i < exportFormats.length; i++) {
                            const
                                formatId = exportFormats[i];

                            if (formatId !== 'json') {
                                await fs.rm(`${output}${key}.${formatId}`, {force: true});

                                if (formatId === 'webm') {
                                    await fs.rm(`${output}${key}.weba`, {force: true});
                                }
                            }
                        }

                        console.log(`Removed "${key}"`);
                    }

                    if (raw) {
                        await ensureParentDir(`${output}${file}`);
                        await fs.writeFile(`${output}${file}`, JSON.stringify(sortKeys({
                            ...raw,
                            ...newLipSync ? await getJSON(`${output}${file}`) ?? {} : {}
                        }), null, 4));
                    }

                    return staleIds.size;
                },
                list = [];

            for (const ext of AUDIO_SRC_EXTS) {
                for (const fileName of (await readdirOrEmpty(src)).filter(filter.bind(null, ext))) {
                    const
                        id = stripExt(fileName);

                    if (!(await isCurrent(id))) {
                        list.push(fileName);
                    }
                }
            }

            if (exportFormats.length === 1) {
                config.options = {
                    ...options,
                    exportFormat: exportFormats[0]
                };
                delete config.exports;
            } else {
                config.exports = exportFormats;
                config.options = {
                    ...options,
                    exportFormat: undefined,
                    f: undefined
                };
            }

            this.differenceOnly = true;
            this.exportFormats = exportFormats;

            if (list.length === 0) {
                if (await mergeLipSync()) {
                    throw Error('Old lip-sync removed, but no new ones required generation.');
                } else {
                    throw Error('Lip-sync already up to date.');
                }
            }
            this.updateList = list;
            config.files = mapReduction(files, list);
            this.mergeLipSync = mergeLipSync;
        }

        beforeSend (archive) {
            const
                {src} = this.config;

            if (this.differenceOnly) {
                this.updateList.forEach((file) => archive.file(`${src}${file}`, {
                    name: file
                }));
            } else {
                archive.directory(src, false);
            }
            super.beforeSend(archive);
        }

        afterExport (...args) {
            if (this.mergeLipSync) {
                this.mergeLipSync(true);
            }
            super.afterExport(...args)
        }
    };

module.exports = LipSync;
