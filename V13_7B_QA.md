# HORSE RANCH V13.7b — lower-acceleration hind warp trial (2026-10-16)

**Experimental branch only. Do not merge or deploy.** This experiment forks V13.7 commit `fe690c10d5f3540ec9a12c7ba2436ce410209efd`. `main` remains on V13.5. The earlier `V13_7_CANDIDATE_QA.md` numbers apply **only to the previous V13.7 (hind warp=4)** and **must not be reused** as V13.7b GLB measurements.

## Actual change
- Only `gallop-v13-7.js`: switch the per-limb monotone time-warp sinusoid amplitude for **both complete hind chains** (Hip/Stifle/Hock/Fetlock) from **4** to **1** 160-sample step. Fore chains already used 1 and remain unchanged; the phase target proxies and 0.72 s duration remain unchanged.
- Torso motion, old V13.5 source, mesh, bind pose, V13.4 belly correction, original gaits and all prior branches remain untouched.
- Distal skin-vertex minima are only height proxies, **not verified hoof-contact timestamps**. The names/phase targets in code are design estimates.

## Independent numerical analysis (actual decoded V13.1/V13.2 packed curves + V13.5 stifle/hock correction)
The following are **joint X-angle derivatives per sample**, not skin, real-world anatomical angles or visual smoothness. Each row uses the same 160-sample source chain; numbers in degrees/sample and degrees/sample².

| Channel / measure | V13.5 baseline | original V13.7 warp=4 | V13.7b warp=1 |
|---|---:|---:|---:|
| Right hock maximum angular step | 1.469 | 1.687 | 1.521 |
| Right hock maximum angular-step change | 0.303 | 0.367 | 0.297 |
| Left hock maximum angular step | 1.528 | 1.758 | 1.583 |
| Left hock maximum angular-step change | 0.332 | 0.397 | 0.342 |

The previous amplitude 4 candidate increased peak hock angular-step change by roughly 20% over the V13.5 source; amplitude 1 reduces the modeled spike but still moves curve phases. These are code-derived numbers, not proof of less hoof sliding or more natural running.

## Tests completed
- `node --check gallop-v13-7.js`: passed in local sandbox.
- Local Node VM mock integration: passed. 16 channels rewritten, 3 reused; 160 finite, normalized rotation quaternion samples on each rotation channel; old Walk and V13.5 channel objects intact; selector event exactly once.
- The phase warp derivative remains positive: `1 - (2π/160)·1·cos(phase)` >= 0.9607, so sample ordering remains monotone.

## Release blockers / tests NOT completed
- **No actual 160-frame CPU GLB skinning was rerun for V13.7b**. No new edge-stretch, foot trajectory, ground penetration, or sliding numbers can be claimed. Prior V13.7 CPU results cannot be carried over.
- No actual Windows GPU/WebGL visual check at 0.25×/1×, multiple viewpoints, repeated cycles or side-by-side V13.5 comparison.
- No ten-video measured reference set, physical foot-contact segmentation, ground plane/collision constraint, or native Blender 456-bone rig recovery.
- No proof that overall propulsion, front absolute stretch, or hind-foot recovery stiffness has been resolved.

**Disposition:** Keep experimental; return to actual GLB CPU skin and user-facing render comparison before considering this a usable improvement. No main deployment or automatic site changes.
