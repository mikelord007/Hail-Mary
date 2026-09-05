# Hail Mary — An Interstellar Walkabout

A playable, first-person Three.js fan game inspired by the **movie version** of the Project Hail Mary spacecraft.

## Play

Double-click **index.html** and open it in Chrome or Edge. Click **ENTER THE SHIP**. Everything needed to play is inside that file; it works offline, without a build step or server.

Use a desktop keyboard and mouse. If the browser cannot capture the mouse, hold the left mouse button and drag to look, or use the arrow keys. Enable browser hardware acceleration if WebGL is unavailable.

| Control | Action |
| --- | --- |
| W A S D | Walk |
| Shift | Run |
| Mouse / arrows | Look |
| Space | Jump |
| E | Inspect an object or enter the ladder |
| W / S on ladder | Climb up / down; step off automatically at either end |
| G | Deploy / retract the centrifuge |
| C | Switch between interior and exterior |
| Drag / scroll outside | Orbit / zoom the exterior camera |
| M | Ship map and room guide |
| Escape / Menu | Pause, controls, mouse sensitivity, and audio |

## Explore

The science laboratory is the central hub. Walk forward to the flight deck, aft to crew quarters, left to engineering, or right to the wellbeing room. The orange ladder in the laboratory reaches the upper observation unit.

There are sample instruments, a crew manifest, engineering diagnostics, an observation log, and a wellbeing log to inspect. The four-part mission checklist asks you to analyze a sample, climb to observation, establish centrifugal gravity, and discover all six rooms. Exploration remains available after completion.

Mission discoveries, completed objectives, gravity configuration, and preferences save to local storage when the browser permits it. Your position resets to the lab on reload. File-based and localhost saves are separate browser origins.

## Centrifuge

The exterior sequence turns the habitat through 90 degrees, separates the two assemblies, pays out four cables, and spins up the ship. The camera can orbit the entire assembly. Press C at any time to return inside; the sequence continues while you explore.

At full deployment, the habitat reference point is 25 metres from the axis. At 5.98 RPM, `a = (RPM × 2π / 60)² × radius ≈ 9.8 m/s²`, approximately Earth gravity. Jump acceleration responds to the displayed gravity. The interior stays in a co-rotating frame and the viewport sky rotates. Magnetic-boot assistance keeps exploration manageable during transition.

The centrifuge is a scripted kinematic animation, not a rigid-body cable solver. Transition timing is accelerated for play. It does not simulate cable elasticity, mass transfer, relativistic propulsion, Coriolis forces, or full free-floating zero gravity.

## Design references

The modular, industrial spacecraft and differentiated interiors draw on the **movie**, rather than the novel's stacked capsule layout:

- [Phil Lord and Chris Miller discuss the ship's production design — BFI](https://www.bfi.org.uk/interviews/phil-lord-chris-miller-project-hail-mary)
- [Official movie spacecraft and centrifuge model — LEGO](https://www.lego.com/en-us/product/project-hail-mary-11389)
- [The film's spacecraft visual effects — Industrial Light & Magic](https://www.ilm.com/vfx/project-hail-mary/)

This is an original, stylized fan interpretation, **not an exact reconstruction of the film set or an official game**. Room dimensions, connections, gameplay, textures, and ship geometry were created for this build. No movie footage, soundtrack, or extracted production assets are included. Project Hail Mary belongs to its respective rights holders.

## Source and verification

### Visual upgrade — 1.1

- 1024-pixel brushed-metal, quilted-liner, woven-fabric, and thermal-foil surface maps, with roughness and bump detail.
- Rounded equipment edges, smoother tanks and fittings, sharper instrument displays, and a 2048-pixel viewport sky.
- Environment reflections, a cached local shadow map, ambient occlusion, and a subtle light glow.
- Keyboards, throttle levers, pressure gauges, hand valves, pipe elbows, medical equipment, seat restraints, individual plant leaves, and a telescope.
- Exterior structural trusses, insulation panels, cable reels, RCS clusters, antennae, radiator cells, and ribbed engine bells.
- **Menu → Graphics quality → High / Balanced**. Balanced retains all modeled detail and surface maps while disabling shadows and ambient occlusion and limiting render resolution.

All assets are generated locally; no network textures or model downloads are required. This remains a stylized procedural game rather than a photorealistic production-asset recreation.

Editable source is in `source/`. With Node.js installed, run `npm install` and `npm run build` from this folder to rebuild `index.html`.

Run `npm test` with Chrome installed for the offline browser playthrough. Screenshots and the test report are written to `.test-artifacts/`.

The build was tested in Chrome with real keyboard/browser inputs: movement through every unit, instrument interaction, both ladder directions, hull collisions, centrifuge deployment and retraction, exterior return, map access, and saved mission progress. The 1 g calculation was checked independently. See `verification.json` for the test result.

Three.js is distributed under its MIT license; see `THREE-LICENSE.txt`.
