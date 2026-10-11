# GRAYLINE — Combat Rally

Start with this file, then read **CLAUDE.md** for the full development handoff.

Live game: https://grayline-rally.adam489451.chatgpt.site/game/
Handoff baseline: version 17, 2026-10-11, commit a6d26758a26e9818c445d2dfd6f7c0f2664207fd.
The ZIP is a source snapshot, not automatic synchronization with the owner's machine.

## Fastest start: no dependency installation

Install Node.js 22.13+ (Node 22 LTS recommended). In this folder:

```sh
node scripts/serve-game.mjs
```

Open http://127.0.0.1:4173/game/ and click QUICK DRIVE.
This serves the complete 3D game, bots, art, music and Track Workshop. Online rooms
and voice require the full app server below. Opening index.html as file:// will not work.

## Full app and multiplayer development

Node.js 22.13+ and npm are required. The checked-in lockfile pins dependencies.
No Codex, Claude plugin, paid service or Cloudflare account is needed for local work.

```sh
npm run install:ci
node node_modules/wrangler/bin/wrangler.js d1 migrations apply DB --local --config wrangler.local.jsonc --persist-to .wrangler/state
npm run dev
```

Open http://127.0.0.1:5173/game/ . Create a room in one tab and join it in another.
Wrangler asks to apply migrations: approve for your LOCAL database. Do not use --remote.
The placeholder D1 ID is intentionally local-only and matches vite.config.ts.
Run all migrations in drizzle/; do not copy another developer's .wrangler database.
For a build: `npm run build`. `npm start` runs the built Worker locally.
The project defaults to the portable execution profile on a clean extraction.

## Tests

```sh
node scripts/test-local.mjs
node node_modules/typescript/bin/tsc --noEmit
node --test tests/network.test.mjs
npm run build
```

The network test requires the full server on port 5173 and creates/closes a QA room.
TEST_ORIGIN can target your own test server. Do not load-test the public game.
Browser harnesses in tests/*-browser.html are optional QA tools; they expect imports
from ./game/ and can be copied temporarily into public/ for local testing. Remove
those temporary copies before publishing. Physical gamepad, microphone and actual
international multiplayer behaviour require real-device testing.

## Architecture

Plain JavaScript ES modules + vendored Three.js 0.160.1 run the game in public/game/.
Vinext/Vite + React serve the landing page and Cloudflare Worker room API.
D1 stores rooms, seats and signalling; WebRTC carries gameplay when reachable.
There are no external art or recording downloads required to play. UI font loading
uses Google Fonts, with local fallbacks. Third-party licenses are retained.

Camera follows your car, anticipates road bends/slopes, and adds bounded aerial motion.
Zoom responds to nearest rival distance and eliminations. Vehicle handling is arcade
2.5D with planar tire forces, terrain alignment, shell sway and collision spin.
The retro toon cars and roadside art are original, inspired by classic combat racers.

## Controls and rules

WASD/arrows drive; Space brakes; F/Enter fires; R recovers for 20 HP.
Touch uses independent LEFT/RIGHT, GAS, HANDBRAKE, FIRE and REV buttons.
Quick Drive fills three seats with bots; online rooms allow four people.
First to six points; round winner earns two. Last survivor wins, or surviving leader
at 55 seconds. Falling, zero HP or trailing 68 m for three seconds eliminates a car.
MUSIC and SOUND are independent. Voice is opt-in from the online room panel.

## Track editing

One stable active track: foundry-loop. DEFAULT_TRACK lives in public/game/sim.js.
The Track Workshop edits/imports/exports authored points, terrain and pickups.
Saved local layouts remain in that browser's grayline-track-v1 storage entry.
They are not part of the source ZIP: export your layout JSON and send it separately.
Online rooms use the host's layout. Never overwrite authored layouts during art work.

## Deployment and secrets

The owner's live deployment uses Sites; .openai/hosting.json keeps its project identity.
This is not a credential. The ZIP does not grant deployment rights. Send reviewed
patches/branches to the owner, or configure a separate hosting project and database.
A static host alone supports Quick Drive; rooms need the /api/room Worker/D1 service.
Microphones require HTTPS except on localhost.

Optional TURN integration uses server-only TURN_KEY_ID and TURN_KEY_API_TOKEN secrets.
Neither is bundled; TURN was not configured in production at this handoff. Without it,
restrictive networks fall back to slow HTTPS/D1 relay. Reported Bangladesh relay lag
was 500-600 ms. Do not promise that a tunnel or CDN can remove that latency.
No host migration: keep the host tab open and foreground.

## Reference direction

- Mashed: close combat, short survival rounds and weapon pickups.
- Road Rash II: retro roadside graphics and strong colour separation.
- Carmageddon: aggressive original armored car silhouettes.
- Original synthesized C-minor funk; public-domain Beethoven Fifth motif, no sampled recording.

Source references: https://manuals.sega.com/genesismini/pdf/ROAD_RASH_II.pdf
and https://www.mobygames.com/game/367/carmageddon/promo/group-29408/image-280742/
Three.js license: public/game/vendor/three.LICENSE.
