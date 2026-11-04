const
    Cheer = require('./Cheer'),
    Metadata = class Metadata extends Cheer {
        constructor (data) {
            const
                {mediaFiles = [], ...rest} = data;

            super({
                ...rest,
                contents: {
                    ...rest.contents,
                    service: 'metadata'
                }
            });
            this.mediaFiles = mediaFiles;
        }

        beforeSend (archive) {
            const
                {src} = this.config;

            if (this.mediaFiles.length) {
                this.mediaFiles.forEach(({path: filePath, name}) => {
                    archive.file(filePath, {name});
                });
            } else if (src) {
                archive.directory(src, false);
            }

            super.beforeSend(archive);
        }
    };

module.exports = Metadata;
