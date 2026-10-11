# Grayline: appearance-only coastal wear pass

Updated direction: apply the look permanently in separate visual-stage commits. The initial comparison toggle described in this audit was removed after validation at the user's request; further work preserves gameplay and uses Git milestones for rollback.

Baseline: `dc56f69`, branch `art/retro-harbor`. Grayline was not replaced by Sunset Rumble: that prototype lives in a separate repository/publication and is being retired with a redirect. Preserve this baseline's gameplay exactly.

## Audit

Vendored Three.js r160, plain ES modules in `public/game`, MeshToonMaterial, WebGLRenderer with ACES/sRGB and a single shadowed sun plus hemisphere ambient. Vinext/Vite/Cloudflare shell and room service. Run `node scripts/serve-game.mjs` (existing port 4173); build `npm run build`; regression suite `node scripts/test-local.mjs` (81/81 baseline).

`render.js`: renderer/lights, road and buildings, original car meshes, camera and dynamic meshes. `art.js`: toon ramp, vehicle details, scenery, weapon models and CombatFX. Existing CanvasTextures contain road noise, gravel, liveries and posters. No post stack. DOM HUD is separate from WebGL. Camera is the existing personal chase camera, not the shared camera described in the brief. Its framing and motion will remain byte-for-byte unchanged.

Protected: sim.js, vehicle.js, terrain.js, chase.js, road-camera.js, aerial-camera.js, app.js, input, tilt, networking, music, track JSON, UI markup/style. No replacement car meshes, track geometry, or gameplay effects.

## Milestones / files

1. `art-config.js`, `art-style.js`; narrow hooks in `render.js`: central configuration, old/new F9 toggle, lighting and material-only rim. Preserve orange/cyan/pink/lime identities.
2. Shared procedural world-coordinate grunge shader and deterministic texture in `art-style.js`: asphalt cracks/tar, worn paint, side mud/top dust, rust. Material replacement is reversible; dynamic material opacity remains owned by the existing effects.
3. Nature shader in `art-style.js`: existing island/rock palette and ocean glints/foam. Optional island foliage only if time/performance permit. No geometry/layout changes to existing objects.
4. `art-post.js`: small Three.js render-target post pass, high-threshold bloom, protected racer focus region, selective grade, 24 Hz grain/vignette. Existing FX palette restyle only. No new effect lifetimes/emitters.
5. `docs/art-style.md`, screenshots before/after, existing tests/build, normal-controls full round, old/new A/B performance and readability.

Commit each milestone independently. If budget tight, omit additional props, alternate times of day and exhaust. Any unmet validation is reported rather than assumed.

## Baseline evidence

Normal Quick Drive on High Dock works. Initial HUD observations 54–57 FPS on the current 1269 × 1404 browser viewport; these are observations, not a controlled benchmark. Before screenshot saved under `before/gameplay.png`. Use same viewport and settings for A/B measurements. The maximum race zoom is automatic (rival separation/eliminations), not an exposed manual camera control; capture it through normal race progression without forcing camera state.
