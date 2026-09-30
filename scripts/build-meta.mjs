import fs from 'node:fs';

const userPath = 'tideborn-faction-command.user.js';
const metaPath = 'tideborn-faction-command.meta.js';
const source = fs.readFileSync(userPath, 'utf8');
const endMarker = '// ==/UserScript==';
const end = source.indexOf(endMarker);
if (end < 0) throw new Error('Userscript metadata block not found');
const meta = source.slice(0, end + endMarker.length) + '\n';
fs.writeFileSync(metaPath, meta);
console.log(`Generated ${metaPath}`);
