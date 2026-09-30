import fs from 'node:fs';

const userPath = 'tideborn-faction-command.user.js';
const metaPath = 'tideborn-faction-command.meta.js';
const user = fs.readFileSync(userPath, 'utf8');
const meta = fs.readFileSync(metaPath, 'utf8');

function versionOf(text, label) {
  const m = text.match(/^\s*\/\/\s*@version\s+([^\s]+)\s*$/mi);
  if (!m) throw new Error(`${label}: @version missing`);
  return m[1];
}

const userVersion = versionOf(user, 'userscript');
const metaVersion = versionOf(meta, 'meta');
const app = user.match(/version:\s*['"]([^'"]+)['"]/);
if (!app) throw new Error('APP.version missing');
if (userVersion !== metaVersion) throw new Error(`Version mismatch: user=${userVersion}, meta=${metaVersion}`);
if (userVersion !== app[1]) throw new Error(`Version mismatch: @version=${userVersion}, APP.version=${app[1]}`);

const required = [
  '@updateURL    https://raw.githubusercontent.com/Leviath4n-work/tideborn-faction-command/main/tideborn-faction-command.meta.js',
  '@downloadURL  https://raw.githubusercontent.com/Leviath4n-work/tideborn-faction-command/main/tideborn-faction-command.user.js',
];
for (const line of required) {
  if (!user.includes(line)) throw new Error(`Missing metadata: ${line}`);
  if (!meta.includes(line)) throw new Error(`Meta file missing: ${line}`);
}
if (!meta.trimEnd().endsWith('// ==/UserScript==')) throw new Error('Meta file must contain metadata only');
console.log(`Release check passed for v${userVersion}`);
