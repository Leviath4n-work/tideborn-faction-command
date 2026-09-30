# Tideborn Faction Command

Tideborn Faction Command (TFC) is an all-in-one Torn faction leadership userscript built for faction management, war operations, chains, Organized Crimes, recruitment, armory/vault tracking, finance, analytics, and member leadership records.

## Install

### Tampermonkey

1. Install Tampermonkey in your browser.
2. Open the stable userscript URL:
   https://raw.githubusercontent.com/Leviath4n-work/tideborn-faction-command/main/tideborn-faction-command.user.js
3. Tampermonkey will offer to install Tideborn Faction Command.

Once installed, Tampermonkey uses the script's `@updateURL` and `@downloadURL` to check this repository for newer versions automatically.

### TornPDA

Add the same stable userscript URL to TornPDA:

https://raw.githubusercontent.com/Leviath4n-work/tideborn-faction-command/main/tideborn-faction-command.user.js

Keeping the filename stable means TornPDA can continue updating from the same source URL instead of requiring a new versioned file each release.

## Current version

**v0.15.2**

TFC also includes an update panel in **Settings → GitHub auto-update** where you can check the latest repository version manually.

## Main modules

- Command Center
- Members + leadership records
- Ranked War Command
- War payouts
- Chain Command
- Organized Crime Command
- Recruitment Command
- Armory + Vault Command
- Finance Command
- History + Analytics
- Settings + update status

## Data and API keys

TFC stores configuration, notes, cached faction intelligence, and leadership history locally in the userscript storage on your device. Torn API keys are not stored in this repository.

The script sends Torn API requests only to `api.torn.com`. Update checks are made only against this repository on `raw.githubusercontent.com`.

## Updating / publishing

The production files are intentionally stable:

- `tideborn-faction-command.user.js` – installable script
- `tideborn-faction-command.meta.js` – metadata used for lightweight update checks

For every release:

1. Bump both `@version` and `APP.version`.
2. Run `node scripts/build-meta.mjs`.
3. Run `node scripts/check-release.mjs`.
4. Commit to `main`.
5. Optionally tag the commit, for example `v0.15.1`, to create a GitHub Release automatically.

## Support

Use GitHub Issues for bugs, layout problems, and feature requests.
