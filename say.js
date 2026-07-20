#!/usr/bin/env node

const
    say = require('./src/say'),
    text = process.argv.slice(2).join(' ').trim();

if (!text) {
    console.error('Usage: say "Hello world"');
    process.exit(1);
}

say(text).catch((err) => {
    console.error(err.message ?? err);
    process.exit(1);
});
