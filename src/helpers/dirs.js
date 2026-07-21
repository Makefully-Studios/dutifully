const
    fs = require('fs').promises,
    path = require('path'),
    ensureDir = async (dir) => {
        if (dir) {
            await fs.mkdir(dir, {recursive: true});
        }
    },
    ensureParentDir = async (filePath) => {
        if (filePath) {
            await ensureDir(path.dirname(filePath));
        }
    },
    readdirOrEmpty = async (dir) => {
        try {
            return await fs.readdir(dir);
        } catch (e) {
            if (e?.code === 'ENOENT') {
                return [];
            }

            throw e;
        }
    };

module.exports = {
    ensureDir,
    ensureParentDir,
    readdirOrEmpty
};
