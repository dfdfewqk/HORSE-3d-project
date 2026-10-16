# V13.6 Hock Release — experimental candidate (2026-10-16)

Base production commit: d573079786b29d70d39a5ab52141e47885a33561. Production main is unchanged.
Status: **CODE/ANALYTIC TESTED ONLY. Not visually validated. Do NOT merge or deploy to main yet.**

## Cause observed
The deployed V13.5 hock curve has near-constant local Hock X rotation for about 22 consecutive samples on each hind leg. V13.2 bounded the base Hock to about 4 degrees at late swing, and V13.5 subtracted about 18 degrees with a broad flat envelope. Stifle and Hip still move, but Hock rotation itself remains almost static.

## Candidate change
`gallop-v13-6.js` builds `Gallop_V13_6_HOCK_RELEASE_CANDIDATE` from the preserved V13.5 clip, replacing only right and left Hind_Hock rotation tracks. Original Stifle peaks found from V13.2 source: right sample 103, left sample 127. The original V13.5 recovery envelope remains. The Hock correction is scaled by a smooth release term `1 - 0.35 * smoothstep(0,24,cyclicDistance(sample,peak))`. This never increases V13.5 maximum Hock bend and makes later swing re-extension progressive. Original Hip, Stifle, Fetlock, forelegs, torso, Walk/Trot/Canter, GLB, skin weights, bind/rest pose are untouched. These are local-rig visual tuning values, not anatomical angles.

## Tests performed
- Recalculated 160 V13.2 samples for each hind limb and applied V13.5 versus candidate curve math.
- Longest near-static Hock run (frame-to-frame angle difference below 0.05 degrees): right V13.5 22 -> candidate 6 samples; left V13.5 22 -> candidate 5 samples.
- Peak new-versus-V13.5 Hock difference approx 5.96 degrees right and 5.49 degrees left; no larger peak bend than V13.5.
- Peak local Hock frame-to-frame angular step: R 1.47 -> 1.52 degrees, L 1.53 -> 1.54 degrees. This is **not** a ground-contact or mesh quality metric.
- Local Node syntax check and sandboxed simulated animation object test passed: exactly 2 Hock channels replaced; remaining channel references unchanged; 160 finite normalized quaternions; original clips preserved; animation selector triggered.

## Unverified — release gate
- 160-frame **actual deployed GLB** skin stretch ratios, mesh penetration, and hoof paths for new candidate.
- Side/rear/45-degree actual mesh screenshots at matching timestamps versus V13.4 and V13.5.
- Actual foot contact/slide and 0.25x/1x perceived quality.
- Windows GPU/WebGL rendering and user acceptance.

Do not claim this candidate solves the rear-leg complaint. Keep main on V13.5 unless these checks are completed and demonstrate improvement.

Research context: https://doi.org/10.1111/j.1439-0264.1983.tb01019.x ; https://vanat.ahc.umn.edu/gaits/transGallop.html ; https://pubmed.ncbi.nlm.nih.gov/23742040/ . The distal hindlimb 2014 study is stance-focused, not swing-angle calibration.

## Actual embedded GLB 160-frame CPU-skin follow-up (2026-10-16)

**Source:** identical deployed `legacy-v7.html` GLB on main and candidate branch: 24,314 body positions, 19 skin joints. V13.4's exact 440-vertex abdomen-weight correction was applied before evaluation. V13.1 torso and unchanged limb keys were decoded, V13.2 bounded hind curves applied, and V13.5 / V13.6 additive local X-track formulas evaluated at all 160 sample timestamps. Skin positions were reconstructed with the original inverse bind matrices. No rig, GLB, skin or existing clip was altered.

**Selection for this follow-up:** 2,075 hind-dominant body vertices (hind influence >0.5, y<0.95, z<-3.10), 5,436 distinct valid body mesh triangle edges with rest length in [0.008, 0.12] model units, including both shared-geometry body primitives. This edge cohort is different from the 2,932-edge cohort described in V13.5 QA; do not compare its percentiles directly with that older cohort.

| CPU mesh metric on identical 5,436 edges | V13.4 | V13.5 main | V13.6 experiment |
|---|---:|---:|---:|
| Maximum edge-length stretch ratio across 160 frames | 1.42118 | 1.32234 | 1.32234 |
| 99th percentile of per-edge maximum | 1.22837 | 1.21806 | 1.21806 |
| Edges exceeding 1.5x | 0 | 0 | 0 |

For reference, the maximum 1.42118 / 1.32234 ratios reproduce the prior GLB test's approximate 1.4212 / 1.3223 values. This is CPU-derived deformation evidence, **not** a rendered visual acceptance test.

**Distal rear-hoof proxy:** A genuine GLB skin vertex heavily influenced by each Hind_Fetlock (>0.8), selected as the lowest rest-position vertex in the rear area (R vertex index 890, L index 3696; both rest y approx -0.00247). It is a **skin-vertex proxy**, not a dynamically derived hoof-ground contact point.

| Computed quantity | V13.5 | V13.6 |
|---|---:|---:|
| Right rear proxy y range | -0.0118 to 0.1678 | -0.0118 to 0.1594 |
| Left rear proxy y range | -0.0116 to 0.1753 | -0.0116 to 0.1696 |
| Max frame-matched right proxy 3D deviation from V13.5 | reference | 0.05011 (frame 125) |
| Max frame-matched left proxy 3D deviation from V13.5 | reference | 0.04610 (frame 147) |
| Largest negative proxy-height difference vs V13.5 | reference | R -0.02615, L -0.02357 |

The V13.6 candidate **does not improve maximum mesh stretching** under this measure, and it lowers proxy clearance in part of swing. A shorter nearly static Hock-angle interval does **not** establish superior naturalness; the lower swing clearance may be undesirable. Absolute ground plane, true ground contact, hoof collision/sliding, skin self-intersections, perceptual realism and native Windows GPU/WebGL playback **remain unverified**. Neither a visual screenshot nor a high-speed real-horse frame-by-frame matching was produced in this follow-up.

**Decision: HOLD.** Keep `main` on V13.5, retain V13.6 only as experimental code, and do not promote until matched side/rear/45-degree visual inspection and true GLB frame playback indicate improvement without regressions. Subsequent revisions should analyze stifle-hock coupling and foot clearance together rather than simply increase angle amplitude.
