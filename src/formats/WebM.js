const
    File = require('./File');

let musicMetadataPromise = null;

const loadMusicMetadata = () => {
    if (!musicMetadataPromise) {
        musicMetadataPromise = import('music-metadata');
    }

    return musicMetadataPromise;
};

const trackName = (track) => track?.name || track?.codecName || '';

module.exports = class WebM extends File {
    async load (path) {
        await super.load(path);
        const
            mm = await loadMusicMetadata(),
            metadata = await mm.parseFile(path);

        this.data = metadata;
        this.common = metadata.common || {};
        this.native = metadata.native || {};
        this.format = metadata.format || {};
        return this.data;
    }

    /**
     * Read CAPTION_HASH / GENERATION_HASH (or Capti* aliases) from Matroska native tags.
     */
    getHash ({hashKey = 'CaptionHash'} = {}) {
        const
            wanted = new Set([
                hashKey,
                hashKey.toUpperCase(),
                hashKey.replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase(),
                String(hashKey).replace(/\s+/g, '_').toUpperCase()
            ]),
            matroska = this.native.matroska || this.native.Matroska || [];

        for (let i = 0; i < matroska.length; i++) {
            const
                {id, value} = matroska[i] || {};

            if (wanted.has(id) || wanted.has(String(id || '').toUpperCase())) {
                return value;
            }
        }

        // Fallback: common / format tags
        if (hashKey === 'CaptionHash' || hashKey === 'CAPTION_HASH') {
            return this.common.comment?.[0] ?? null;
        }

        return null;
    }

    addHash () {
        throw new Error('WebM hashes must be written via Cheerfully metadata service (read-only on Dutifully).');
    }

    async save () {
        throw new Error('WebM.save is not supported on Dutifully; use Cheerfully metadata service.');
    }

    hasTimedTrack (name) {
        const
            tracks = this.format.trackInfo || [];

        return tracks.some((track) => {
            const
                n = trackName(track).toLowerCase();

            return n === String(name).toLowerCase();
        });
    }

    toString () {
        if (this.common.lyrics) {
            const
                lyrics = this.common.lyrics;

            if (typeof lyrics === 'string') {
                return lyrics;
            }

            if (Array.isArray(lyrics)) {
                return lyrics.map((entry) => entry?.text ?? entry).join(' ');
            }
        }

        return this.common.title || '';
    }
};
