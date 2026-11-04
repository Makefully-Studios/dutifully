const
    Cheer = require('./Cheer'),
    Metadata = require('./Metadata'),
    Transcript = require('./Transcript'),
    fs = require('fs').promises,
    getFileData = require('../helpers/getFileData'),
    {ensureDir, readdirOrEmpty} = require('../helpers/dirs'),
    id3 = require('node-id3').Promise,
    isoLanguageMap = {
        'en-US': 'eng',
        'es-ES': 'spa'
    },
    matches = (file, types) => types.reduce((prev, current) => prev || (file.slice(-(current.length + 1)) === `.${current}`), false),
    getMP3s = async ({encodedBy = '', output = './', fileTypes = [], transcripts}) => {
        const
            all = (await readdirOrEmpty(output))
                .filter((file) => (file.indexOf('.') !== 0) && (fileTypes.length === 0 || matches(file, fileTypes)));

        if (transcripts) {
            const
                keys = Object.keys(transcripts),
                list = keys.map((id) => `${id}.mp3`),
                missing = [],
                present = [];

            // need to check for presence _and_ whether lyrics match.
            for (let i = 0; i < list.length; i++) {
                const
                    file = list[i];

                if (all.indexOf(file) === -1) {
                    missing.push(file)
                } else { // not actually missing, so let's check the artist and lyrics.
                    const
                        fileHash = (await getFileData(`${output}${file}`, 'mp3')).getHash({
                            hashKey: 'GenerationHash'
                        });

                    // We'll assume the original file should be kept if it doesn't include a generation hash.
                    if (fileHash && fileHash !== transcripts[keys[i]].getHash({
                        seed: encodedBy
                    })) {
                        missing.push(file);
                    } else {
                        present.push(file);
                    }
                }
            }

            return {
                missing,
                present,
                unlisted: all.filter((id) => list.indexOf(id) === -1),
                all
            };
        }

        return {
            all
        };
    },
    captionText = (caption) => (Array.isArray(caption) ? caption : [caption])
        .map((cap) => cap?.caption ?? cap ?? null)
        .filter((cap) => cap !== null)
        .join(' '),
    clamp = (text, max) => {
        if (text.length <= max) {
            return text;
        } else {
            const
                arr = text.substring(0, max).split(' ');

            if (arr.length > 1) {
                arr.length -= 1; // remove last word which may be partial.
                return `${arr.join(' ')}...`;
            } else {
                return arr[0];
            }
        }
    },
    appendMP3Meta = async ({album, captions, generated = false, language, output, voice}) => {
        if (output) {
            await ensureDir(output);
        }

        const
            ids = Object.keys(captions);

        for (let i = 0; i < ids.length; i++) {
            const
                id = ids[i],
                text = captionText(captions[id]),
                tags = {
                    album,
                    title: clamp(text, 40),
                    unsynchronisedLyrics: {
                        language: isoLanguageMap[language] ?? 'eng',
                        text
                    }
                };

            await id3.update(tags, `${output}${id}.mp3`);

            if (generated) {
                console.log(`Voice generated for "${id}".`);
            } else {
                console.log(`Voice meta data updated for "${id}".`);
            }
        }
    },
    mapReduction = (map, list) => list.reduce((obj, file) => {
        const
            id = file.substring(0, file.length - 4);

        obj[id] = map[id];
        return obj;
    }, {}),
    TextToSpeech = class extends Cheer {
        constructor (data) {
            const
                {album, encodedBy} = data;

            super(data);
            this.album = album;
            this.encodedBy = encodedBy;
        }

        async prepare (data) {
            await this.replaceConfigPathWithJSON('script', 'files');

            // create standardized transcripts and an accompanying hash for each.
            const
                {files, voice} = this.config,
                standardizedFiles = {},
                transcripts = {};
            
            Object.keys(files).forEach((key) => {
                const
                    transcript = new Transcript(files[key], {voice});

                standardizedFiles[key] = transcript.toJSON();
                transcripts[key] = transcript;
            });
            this.config.files = standardizedFiles;
            this.transcripts = transcripts;

            // Server-side metadata stamping (Cheerfully updateMediaMeta).
            this.config.album = this.album;
            this.config.generationHashes = Object.keys(transcripts).reduce((map, id) => {
                map[id] = transcripts[id].getHash({
                    seed: this.encodedBy ?? ''
                });
                return map;
            }, {});

            return super.prepare(data);
        }

        async checkDifference () {
            const
                {album, config, encodedBy = '', transcripts} = this,
                {output, files = {}, language, updateAllMetaData = false} = config;

            if (output) {
                await ensureDir(output);
            }

            const
                {missing, present, unlisted} = await getMP3s({
                    encodedBy,
                    fileTypes: ['mp3'],
                    output,
                    transcripts
                });
    
            config.files = mapReduction(files, missing);
    
            for (let i = 0; i < unlisted.length; i++) {
                await fs.rm(`${output}${unlisted[i]}`);
                console.log(`Removed "${unlisted[i]}"`);
            }
    
            if (updateAllMetaData && present.length) {
                await this.updatePresentMeta({
                    album,
                    captions: mapReduction(files, present),
                    language,
                    output,
                    present
                });
            }
    
            if (missing.length === 0) {
                throw Error('All voice-over files already exist.');
            }

            this.updateList = missing;
        }

        /**
         * Retag existing VO via Cheerfully `metadata` service (mp3 / webm).
         * Falls back to local ID3 writes if the metadata chore fails.
         */
        async updatePresentMeta ({album, captions, language, output, present}) {
            const
                {contents} = this,
                tagFiles = {},
                mediaFiles = present.map((filename) => {
                    const
                        id = filename.substring(0, filename.lastIndexOf('.')),
                        text = captionText(captions[id]);

                    tagFiles[filename] = {
                        album,
                        title: clamp(text, 40),
                        lyrics: text,
                        language
                    };

                    return {
                        path: `${output}${filename}`,
                        name: filename
                    };
                });

            try {
                const
                    job = new Metadata({
                        config: {files: tagFiles},
                        contents: {
                            ...contents,
                            service: 'metadata',
                            output,
                            extract: true
                        },
                        mediaFiles
                    });

                await job.send({instanceId: `${contents.id || 'tts'}-metadata`});
                present.forEach((filename) => {
                    console.log(`Voice meta data updated for "${filename.substring(0, filename.lastIndexOf('.'))}".`);
                });
            } catch (e) {
                console.warn(`metadata service failed (${e.message || e}); falling back to local MP3 ID3 writes.`);
                await appendMP3Meta({
                    album,
                    captions,
                    language,
                    output
                });
            }
        }

        async afterExport (...args) {
            const
                {config, updateList} = this,
                {files, output} = config,
                list = updateList ?? Object.keys(files).map((id) => `${id}.mp3`),
                missing = [];

            for (let i = 0; i < list.length; i++) {
                const
                    filename = list[i],
                    fullPath = `${output}${filename}`;

                try {
                    await fs.access(fullPath);
                } catch (e) {
                    missing.push(filename);
                }
            }

            if (missing.length) {
                let detail = '';

                try {
                    const
                        log = JSON.parse(await fs.readFile(`${output}log.json`, 'utf8'));

                    if (log?.errors?.length) {
                        detail = ` Server errors: ${log.errors.join('; ')}`;
                    }
                } catch (e) { /* no log.json */ }

                throw new Error(
                    `Voice export missing ${missing.length === 1 ? `"${missing[0]}"` : `${missing.length} files (${missing.join(', ')})`}.${detail}`
                );
            }

            // Album / title / lyrics / GenerationHash are stamped server-side via updateMediaMeta.
            list.forEach((filename) => {
                console.log(`Voice generated for "${filename.substring(0, filename.lastIndexOf('.'))}".`);
            });
            super.afterExport(...args);
        }
    };

module.exports = TextToSpeech;