// Builds the static site: compiles src/*.js(x) into app.js and stamps a version
// into index.html, styles and the service worker. Run: node build.js
// (Same build as Khatfa and Draft Night.)
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
let Babel;
try { Babel = require('@babel/standalone'); } catch (e) { console.error('Run "npm install" first.'); process.exit(1); }

const src = path.join(__dirname, 'src');
const parts = fs.readdirSync(src).filter((f) => /\.(js|jsx)$/.test(f) && !f.includes('template')).sort();
const code = parts.map((f) => '/* ---- ' + f + ' ---- */\n' + fs.readFileSync(path.join(src, f), 'utf8')).join('\n');
// Your own sound files: sounds/<event>.(mp3|m4a|wav|ogg), e.g. sounds/correct.mp3 (see sounds/README.md).
const soundDir = path.join(__dirname, 'sounds');
const SOUND_EXT = ['.mp3', '.m4a', '.wav', '.ogg'];
const soundFiles = {};
if (fs.existsSync(soundDir)) fs.readdirSync(soundDir).sort().forEach((f) => { const ext = path.extname(f).toLowerCase(); if (SOUND_EXT.includes(ext)) { const k = path.basename(f, ext).toLowerCase(); if (!soundFiles[k]) soundFiles[k] = 'sounds/' + f; } });
const out = Babel.transform(code, { presets: [['react', { runtime: 'classic' }]], compact: false, comments: false }).code;
const css = fs.readFileSync(path.join(src, 'styles.css'), 'utf8');
// The clue bank: src/bank/*.js joined (in name order) into bank.js, a separate data file.
const bankDir = path.join(src, 'bank');
const bankFiles = fs.readdirSync(bankDir).filter((f) => f.endsWith('.js')).sort();
const bank = bankFiles.map((f) => '/* ---- bank/' + f + ' ---- */\n' + fs.readFileSync(path.join(bankDir, f), 'utf8')).join('\n');
const version = crypto.createHash('sha1').update(out + css + bank + JSON.stringify(soundFiles)).digest('hex').slice(0, 10);

fs.writeFileSync(path.join(__dirname, 'app.js'), '/* Jeopardy-Board ' + version + ' — built from src/ by build.js. Edit src/, not this file. */\n"use strict";\n(function(){\nconst APP_VERSION = ' + JSON.stringify(version) + ';\nconst SOUND_FILES = ' + JSON.stringify(soundFiles) + ';\n' + out + '\n})();\n');
fs.writeFileSync(path.join(__dirname, 'bank.js'), '/* Jeopardy-Board clue bank ' + version + ' — built from src/bank/ by build.js. Edit src/bank/, not this file. */\n' + bank + '\n');
fs.writeFileSync(path.join(__dirname, 'styles.css'), '/* Jeopardy-Board ' + version + ' — built from src/styles.css */\n' + css);
fs.writeFileSync(path.join(__dirname, 'index.html'), fs.readFileSync(path.join(src, 'index.template.html'), 'utf8').replace(/__VERSION__/g, version));
const mediaFiles = Object.values(soundFiles).map((f) => './' + f);
fs.writeFileSync(path.join(__dirname, 'sw.js'), fs.readFileSync(path.join(src, 'sw.template.js'), 'utf8').replace(/__VERSION__/g, version).replace('__MEDIA__', JSON.stringify(mediaFiles)));
fs.writeFileSync(path.join(__dirname, 'version.json'), JSON.stringify({ version, builtAt: new Date().toISOString() }) + '\n');
console.log('Built Jeopardy-Board ' + version + ' from ' + parts.join(', ') + ' + ' + bankFiles.length + ' bank files');
