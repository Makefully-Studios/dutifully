const
    TextToSpeech = require('./TextToSpeech');

module.exports = class ElevenLabs extends TextToSpeech {
    constructor (data) {
        const
            {id} = data.contents;

        data.album = id;
        data.encodedBy = 'ElevenLabs';
        // Auth (env auth.elevenlabs / elevenLabsApiKey / job.auth) is applied in Cheer.
        super(data);
    }
};
