const
    getFileData = require("./getFileData"),
    {readdirOrEmpty} = require("./dirs"),
    {isWebMExt} = require("./jobExports"),
    fileExt = (file) => {
        const
            i = file.lastIndexOf('.');

        return i >= 0 ? file.slice(i + 1).toLowerCase() : '';
    },
    matchesType = (fileType, file) => {
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
    filter = (fileType, file) => {
        if (!matchesType(fileType, file)) {
            return false;
        }

        // Parallel event exports are `{id}.events.{format}` — not caption tracks.
        const
            ext = fileExt(file),
            base = file.slice(0, -(ext.length + 1));

        return !base.endsWith('.events');
    };

module.exports = async (path, fileType) => {

    // "captions.json" is a proprietary format that includes all captions.
    if (fileType.toLowerCase() === 'json') {
        const
            file = await getFileData(`${path}captions.json`, 'json'),
            {data: json = {}} = file;

        return {
            captions: Object.keys(json ?? {}).reduce((obj, key) => {
                // Guard against any legacy/mistaken event keys in captions.json.
                if (key.endsWith('.events')) {
                    return obj;
                }

                obj[key] = json[key].map(({content}) => content).join(' ');
                return obj;
            }, {}),
            file,
            files: null
        };
    } else { // Otherwise we pull all the files and construct a key/value object.
        const
            files = (await readdirOrEmpty(path)).filter(filter.bind(null, fileType)),
            captions = {},
            fileMap = {};
            
        for (let i = 0; i < files.length; i++) {
            const
                filename = files[i],
                ext = fileExt(filename),
                file = await getFileData(`${path}${filename}`, ext),
                key = filename.substring(0, filename.length - ext.length - 1);
                
            captions[key] = file.toString();
            fileMap[key] = file;
        }

        return {
            captions,
            file: null,
            files: fileMap
        };
    }
};
