# GRAYLINE developer handoff

Read README.md first. This is the actual playable browser game, not an Unreal project.
The handoff baseline is published version 17, source commit
`a6d26758a26e9818c445d2dfd6f7c0f2664207fd` (2026-10-11).
Additional handoff setup files accompany that baseline. See HANDOFF-MANIFEST.json
in the distributed ZIP for exact file hashes. This ZIP is a snapshot, not a live sync.

## User intent and non-negotiable behaviour

- Mashed-inspired four-player browser combat racing. Original code/art/audio.
- Keep personal spring chase: each browser follows its own car only, never the pack.
- Camera has subtle helicopter/operator wander, delayed banking and occasional bumps.
- Read road turns ahead; downhill makes the angle more horizontal, uphill steeper.
- Zoom also makes the angle more horizontal to preserve forward road visibility.
- Extra zoom when nearest active opponent is >=50 m away, release at <=45 m.
  Each of the first two eliminations adds zoom. Smooth transitions; reset each round.
- Reduced Motion disables the added aerial shake/roll, not useful terrain framing.
- Keep authored layouts editable. Stable active track ID: `foundry-loop`.
  Preserve imported/local workshop edits; do not replace them with procedural layouts.
- Retro Road Rash II-inspired roadside colour/graphics, stylized toon shading,
  and original aggressive Carmageddon-inspired armored vehicle silhouettes.
  Do not import either game's models, textures, logos or recordings.
- Mobile: separate left/right buttons; gas on right, handbrake above, fire and reverse.
  Independent pointer ownership permits simultaneous steer, gas and fire.
- Preserve four-player rooms, opt-in voice, pickups and the synthesized music.
- Do not call the handling a full racing simulator: it is arcade 2.5D with force-based
  planar tire behaviour, terrain alignment and falling. No full rigid-body suspension.

## Code map

`public/game/` is plain ES modules, no frontend bundling needed for Quick Drive.

| File | Responsibility |
| --- | --- |
| app.js | Main loop, mode changes, input, HUD, networking orchestration, workshop |
| sim.js | Track definition, match/round lifecycle, bots, collisions, weapons, snapshots |
| vehicle.js | Tire forces, steering, longitudinal/lateral momentum, spin |
| terrain.js | Authored elevation/width/bank interpolation, obstacles, road alignment |
| render.js | Three.js scene, car shells/wheels, effects, camera composition |
| chase.js | Personal position/yaw springs and raceZoom |
| road-camera.js | Smoothed slope pitch and bounded turn anticipation |
| aerial-camera.js | Bounded airborne/operator offsets; no simulation effects |
| art.js | Toon materials, four car variants, scenery, pickups and combat FX |
| peer.js / prediction.js / network-motion.js | WebRTC, local replay, remote interpolation |
| voice.js | Separate opt-in WebRTC audio mesh |
| music.js | Original synthesized 96 BPM C-minor funk and public-domain Fifth motif |
| touch.js / style.css / index.html | Input ownership and responsive game UI |
| app/api/room/route.ts | D1 room API, seats, signalling, HTTPS fallback |
| lib/turn.ts | Server-only short-lived Cloudflare TURN credentials |
| db/ / drizzle/ | Database schema and migrations |

## Networking reality

Host-authoritative star, up to four seats (bots fill vacancies), inputs about 30 Hz,
snapshots about 20 Hz. Guest prediction replays unacknowledged inputs. Other cars
use an adaptive interpolation buffer and bounded extrapolation. Host must remain
foreground; no host migration or anti-cheat server. Voice is a separate full mesh.
HTTPS/D1 fallback works but is slow. User measured RELAY 500-600 ms to Bangladesh.
Cloudflare hosting alone does not solve international latency. TURN support is wired
but production TURN credentials have NOT been configured or verified at this snapshot.
Do not claim that cross-country lag is fixed. Test two actual networks when available.

Set server-only `TURN_KEY_ID` and `TURN_KEY_API_TOKEN` through the hosting provider's
secret mechanism, never in public/game or committed files. Client receives temporary
ICE credentials only. No credentials are included in this handoff.

## Game rules and audio

First to 6 points; survivor gets 2. Round timeout 55 seconds; surviving leader wins.
100 HP, falling and left-behind elimination; 68 m / 3 seconds after an 8-second grace.
Pickups: COMET rockets, SNAPJAW mines, INKSPILL oil, AFTERBURN boost.
Recovery costs 20 HP. Music starts on user interaction; independent from sound/voice.
Music layers drums, guitar and piano; Fifth motif first at 80 s, recurring every 60 s.
No existing Beethoven recording or remix was sampled.

## Safe collaboration

Create a local Git repo/feature branch after extracting. Keep patches focused and send
the owner a patch or a shared Git branch. The ZIP grants source access, not access to
the owner's Sites deployment account. Do not publish over the live site by guessing
credentials. `.openai/hosting.json` identifies the owner site but contains no secret.
For independent hosting, create your own project and D1 database; preserve API paths
and use HTTPS for microphone/WebRTC. Local auth shim is development-only.

Before changes, inspect the relevant tests. Verify camera, collision, reset, touch
ownership, weapons and round completion after affected changes. Test rooms separately.
No user data/room database, node_modules, cache, Git history or credentials are bundled.
Do not run a blanket dependency upgrade; the lockfile is part of reproducibility.

## Suggested next focused work

1. Playtest downhill/crest/reverse and tight turns, particularly zoomed mobile framing.
2. Refine original car silhouettes and retro weapon/readability details without
   changing collision footprint (approximately 2.15 x 4.3 m).
3. Configure TURN once owner supplies secrets; measure DIRECT/TURN vs HTTPS fallback.
4. Coordinate with the owner before editing the same files; ongoing local art work
   may continue after this snapshot. Merge rather than overwrite authored changes.

Latest included continuation: October 11 retro weapon hazard bands, rocket fins, oil warning panel, boost details, car hood vents/grilles and bruiser spare wheel. File hashes in the ZIP describe these additions beyond the version-17 baseline.
