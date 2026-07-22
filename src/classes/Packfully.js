const
    Cheer = require('./Cheer'),
    Packfully = class Packfully extends Cheer {
        beforeSend (archive) {
            const
                {src} = this.config;

            if (src) {
                archive.directory(src, false);
            }
            super.beforeSend(archive);
        }
    };

module.exports = Packfully;
