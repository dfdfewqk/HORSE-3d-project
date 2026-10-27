# V17.1 contact implementation — experimental candidate

The original GLB, mesh, weights and 19-bone hierarchy are unchanged. Four separate phase/duty/speed/lift profiles feed a continuous foot trajectory. Damped, limited joint IK uses the actual skinned sole minimum and longitudinal foot centre. Body correction and limb IK iterate up to three times. Temporal smoothing is followed by contact reprojection. This is a sagittal kinematic animation solver, not a dynamics simulator.

`contact-model.js` is the shared phase/trajectory/sampling contract. `gait-cycle.js` builds clips; `contact-clips.json` holds fingerprint-checked results for the existing model. `viewer-bridge.js` samples these clips after legacy secondary-motion wrappers and applies live stance anchors. It blends advancing source and destination poses. Live IK bounds joint change to 18 radians/second using the previous rendered pose, carries the actual release height into swing, and settles transitional touchdown over 100 ms. When angular-rate bounds make ground clearance infeasible, up to three body-lift/support reprojection passes run; the body correction decays over 150 ms and is reapplied before the next IK solve. A transition can therefore have a short landing interval before its new support schedule is fully established. No independent hoof roll or toe-pivot articulation was added.

## Reproduction

Install Playwright and Chromium, then run:

```
node v17-1-preview/contact-tests.cjs
node v17-1-preview/automated-qa.cjs
RUN_GEOMETRY_AUDIT=1 STRICT_GEOMETRY=1 node v17-1-preview/automated-qa.cjs
```

`CHROME_PATH` can select a local Chromium. Browser QA starts a local server automatically. `SITE_URL` selects an already-running instance. Strict geometry is expected to fail the skin requirement described below; a successful runtime check is not full acceptance.

To regenerate cached clips, serve the repository root and run `SITE_URL=http://127.0.0.1:8765/v17-1-preview/ node v17-1-preview/rebuild-contact-clips.cjs`. The rebuild bypasses cached data. Re-run geometry and transition checks after any solver, policy, model or cache changes.

## Measured cyclic clips

Actual model CPU skinning, 640 phases per mode. Ground penetration uses all sole cohort vertices; stance displacement is the range over an entire contact after subtracting virtual ground motion. Values below concern cyclic clips, not transitions or a physical moving-world simulation.

| Mode | Max penetration mm | Max stance displacement mm | Max stance vertical error mm | Max tested skin-edge ratio |
|---|---:|---:|---:|---:|
| Walk | 0 | 0.099 | 2.319 | 1.476 |
| Cruise | 0 | 0.453 | 2.474 | 1.551 |
| Fast | 0 | 0.712 | 2.734 | 1.611 |
| Sprint | 0 | 0.738 | 2.767 | 1.664 |

Skin sampling includes nondegenerate mesh edges incident to vertices influenced by the leg chains. It is not a continuum strain measure or proof about every rendered mesh. The 1.20 maximum is **not met** and the maximum is worse than the retained V16.7 source clips (which themselves fail 1.20). Contact accuracy alone must not certify the result. Merely adding a hoof bone will not resolve proximal skin deformation: weight redistribution, joint-centre review and/or corrective deformation need separate implementation and validation. This work does not prove that the target is impossible with the existing rig.

Each gallop has one connected suspension interval; walk has none. Adjacent rotation samples at 1/640 cycle differ by at most 1.105 degrees. These timings and virtual ground speeds are game-animation choices, not measured racing telemetry.

Do not merge or publish as a fully accepted gait until skin and transition gates pass. The original source assets and unrelated UI remain protected.

## Browser transition result

All 12 directed mode pairs at four starting phases (48 cases), sampled for 60 frames at 60 Hz: start discontinuity < 0.001 mm, maximum penetration 0 mm, maximum joint step 17.189 degrees. Browser UI selection, speed control, idle and eight camera/mode screenshots were checked. The runtime gate passes; full geometry acceptance remains failed because of skin strain. The transition test does not certify per-contact slip or skin strain during blends. Raw results are in `measured-browser-qa.json`; cyclic measurements are in `measured-cyclic-qa.json`.
