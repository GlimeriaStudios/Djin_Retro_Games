# Grayline coastal art pass

## Scope and rollback

This is the existing Grayline game, not Sunset Rumble. The unrelated prototype was retired with a redirect to the original Grayline publication. Its source history was retained. The art-only baseline is `dc56f6952816a6baf096cd4d3cbd4156c4c7cbe5`.

Engine: vendored Three.js r160, plain ES modules, with the existing Vinext/Vite/Cloudflare shell. No new dependencies or downloaded assets. Existing controls, handling, camera springs/framing, collisions, AI, weapon behaviour, timing, scoring, track layouts, networking, music, tilt and HUD flow are unchanged. The original orange/cyan/pink/lime player hues and vehicle silhouettes remain.

`node scripts/check-art-scope.mjs` verifies all 22 other original game files byte-for-byte (normalizing Windows text line endings), and verifies that `render.js` differs only by six appearance hooks. Original `art.js`, including models and all CombatFX emitters/lifetimes, is unchanged.

## Files and implementation

| File | Responsibility |
| --- | --- |
| `public/game/art-config.js` | Central colours, material overrides, wear amounts, light/shadow settings, nature and post controls |
| `public/game/art-style.js` | Permanent material application, lighting and final render routing |
| `public/game/art-textures.js` | Seeded tileable FBM, cracks, irregular stains and abstract weathered signage |
| `public/game/art-shaders.js` | Shared triplanar wear, low mud, upper dust, rust/chip masks, wall streaks, road lighting normals |
| `public/game/art-nature.js` | Shore-distance texture, animated foam/glints, painterly nature, eight instanced island palms |
| `public/game/art-post.js` | HDR render target and one composite pass; emissive bloom, protected focus band, selective grade, 24 Hz grain and vignette |
| `public/game/art-metrics.js` | Optional passive measurements via `?art-stats`; no input, camera or simulation manipulation |
| `public/game/render.js` | Six appearance integration hooks only |
| `scripts/check-art-scope.mjs` | Gameplay preservation acceptance check |

Man-made materials use rough Standard materials and world-coordinate wear. Vehicle roofs receive strong wear protection; glass has a separate low-dirt override. Asphalt receives dark cracks and stains; gravel retains its original aggregate texture and clear surface distinction. Existing tyre trails are retinted rather than duplicated. Existing building/poster meshes receive procedural abstract signs; directional chevrons and vehicle identifiers are preserved.

The low 15-degree sun, violet ground ambient, warm fill and restrained Fresnel rim separate vehicles from the road. A separate `artSmoothNormal` attribute smooths road lighting across coincident vertices; it does not change positions, topology, the original normals, or collision. Only the new material reads it. This avoids the old road's triangle bands becoming conspicuous under low lighting.

Natural surfaces are excluded from grunge. Existing islands, sand and distant rocks get painterly colours; palms use two instanced draw calls outside the roadway, with no new collision. Ocean colour uses a distance field around existing islands/building foundations, moving foam and hash glints. It still receives long scene shadows.

Existing effects retain their geometry, emission rules and timing. The pass recolours fire, sparks, trails, smoke, mine lights, oil and pickup rings. Existing fire particles fade toward charcoal as their existing opacity falls. Pickups retain their original weapon silhouettes, with cyan markers. Non-emissive Standard lighting is capped at the bloom threshold; only emissive output and intentionally luminous FX exceed it. The DOM HUD is never rendered into the post target.

## Staged delivery and tuning

The coastal look is always active. Following the user's updated direction, the F9 shortcut, global enable flag and old-look restoration path have been removed. Each visual stage remains a separate Git commit for review and rollback. Edit the central art config then reload to tune; no gameplay code needs editing. The earlier before/after screenshots and A/B performance data document the comparison made before removing the toggle.

Tune these five values first:

1. `grunge.road = 0.6`: asphalt crack/stain strength.
2. `grunge.vehicle = 0.42`: vehicle side wear; `roofProtection` retains the top-down colour read.
3. `rim.vehicle = 0.34`: warm silhouette separation.
4. `lighting.ambient = 2.05`: shaded readability versus sunset contrast.
5. `post.contrast = 1.055`: final scene contrast; HUD remains unchanged.

`surfaceOverrides` supports individual materials, keyed by their existing colour identifiers. `palette`, `nature`, `fx` and `signage` contain the other artist controls. Algorithmic constants such as noise interpolation and matrix transforms remain with their implementation.

## Validation and performance

The baseline and art pass were run in the actual game through Quick Drive. Normal keyboard input exercised acceleration to 97 km/h, steering, recovery (100 to 80 HP), rocket pickup (two charges), firing (one remaining), collisions, incoming-rocket warnings, elimination, scoring and automatic next-round return. Multiple complete rounds ran. No scripted locomotion, camera override, time acceleration or spectator replacement was used.

The existing 81 tests pass. The scope acceptance check passes. Production build passes; its existing Vinext route-classification informational note remains. Browser checks found no new warnings/errors.

Measured on this desktop's in-app browser at **1269 × 1404, pixel ratio 1**, using alternating original/coastal rendering in real races. After two seconds of warmup, each sample covers 300 actual rendered frames. Raw evidence is in `art-style/performance.json`.

| Look | Sampled frames | Mean FPS | Median frame interval | Mean sample p95 interval | Median CPU render submission |
| --- | ---: | ---: | ---: | ---: | ---: |
| Original | 2,700 | 56.62 | 17.61 ms | 23.16 ms | 6.10 ms |
| Coastal | 4,800 | 56.69 | 17.62 ms | 21.81 ms | 6.72 ms |

Frame rate is effectively unchanged at the measured browser cadence; this is not evidence of a speedup. These are live-race A/B samples, not an identical-frame GPU benchmark. CPU timing measures render submission, not GPU completion. A subsequent 1600 × 900 run also stayed near 56–57 FPS, including the full automatic lens adjustment; see `performance-landscape.json`. After the final road-lighting refinement, 1,500 original frames averaged 56.62 FPS and 6,900 coastal frames averaged 56.55 FPS (under 0.2% difference, within live-race variation); see `performance-final.json`.

## Screenshots and remaining limits

`art-style/before/` and `art-style/after/` contain the initial audit, paired normal gameplay (`default-gameplay.png`), round-completion and workshop overview captures. A/B screenshots are consecutive real frames, so cars, particles and the timer may advance slightly. Workshop overview images are explicitly editor views, not gameplay demonstrations. The overview and default-gameplay pairs show the final smooth road lighting.

The actual game has a personal spring chase camera. Its automatic adjustment reaches 14 (recorded FOV approximately 46 degrees), which tightens the lens; it is not a manually selectable shared-camera zoom-out. This behaviour is preserved. Other racers can be off-screen by design. The maximum automatic adjustment was measured during natural race progression, but an exact matched screenshot at that transient maximum was not captured; the round-completion pair must not be interpreted as that maximum. All four hues were visually checked together at the starting grid and in the overview, but a controlled half-second identification study mid-explosion has not been performed.

Physical-phone GPU performance and sensor interaction have not been re-tested on hardware. The existing tilt/input code is untouched. Browsers without floating-point render-target support use an 8-bit post target; bloom may be absent, while the grade and other processing remain. No claim is made that desktop timing establishes every phone's frame rate.

Cuts: alternate dusk/night presets (the game has one lighting setup), new exhaust emitters, new explosion smoke/debris systems and replacing pickups with crates. Those would add risk or change existing effect behaviour/silhouettes. Existing rock/vehicle/building shapes are preserved. Grunge edge wear is procedural, not baked curvature. Water uses a static shoreline field and decorative foam, not fluid simulation.
