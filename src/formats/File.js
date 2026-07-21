const
    fs = require('fs').promises,
    {ensureParentDir} = require('../helpers/dirs'),
    File = class {
        constructor ({fileType}) {
            this.data = null;
            this.fileType = fileType;
        }

        async load (path) {
            this.path = path;
            return null;
        }

        getHash () {
            return null; // does not support hashes.
        }

        async save () { // return a promise
            await ensureParentDir(this.path);
            return fs.writeFile(`${this.path}`, this.data ?? '');
        }

        toString () {
            return '';
        }
    }

module.exports = File;