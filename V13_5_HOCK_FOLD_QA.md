# HORSE RANCH V13.5 — Hock-fold candidate (2026-10-15)

## Status and base

**Candidate only; not activated on production main.** Production baseline `b1fbb006566d640aa169388658fcdf995571650f` (V13.4), original `legacy-v7.html` embedded GLB, 19 skin bones, 24,314 body mesh vertices and 160 Gallop samples over 0.72 s. Source V13.2 clip is `Gallop_V13_2_HIND_BOUNDED`.

## Findings

The user's image and V13.4 model suggest that the lower rear limb remains too straight while it is carried forward. Current V13.2 hind Hock *local animation track* ranges from 4.0° to 21.5° on the right and 4.0° to 22.0° on the left. At key swing samples around right-frame 100–130 the hock signal is at approximately 4.0° while Stifle local signal reaches ~52°. These are **track rotation values**, not anatomical horse joint-angle measurements.

The reciprocal apparatus mechanically couples stifle and hock flexion but does not impose identical angular excursions. High-speed racetrack studies corroborate distal fetlock and hoof behavior during stance; they do not provide validated hock swing-angle targets for this exact animal or rig.

References:
- UC Davis EAPL high-speed gait research and recordings: https://vorl.vetmed.ucdavis.edu/equine-gait-analysis
- Reciprocal apparatus: https://doi.org/10.1111/j.1439-0264.1983.tb01019.x
- Hind limb joint coordination: https://pubmed.ncbi.nlm.nih.gov/7774545/ (trot study; not Gallop angle reference)
- Racehorse fetlock during gallop: https://pubmed.ncbi.nlm.nih.gov/23742040/ (stance study; not swing-angle reference)

## Modified candidate

The clip `Gallop_V13_5_HOCK_FLEX` is derived from V13.2. **Only four local rotation tracks are changed:** HindL/HindR Stifle and Hock.

The correction is a smoothly joined swing window with phase `(frame - sideLag) mod 160`, sideLag R=0/L=22, frame window 65..155, `pulse = sin(pi*(phase-65)/90)^2`. Within this modeling window each Hock angle is reduced by `0.40 rad * pulse`, with coordinated Stifle angle reduced by `0.08 rad * pulse`. The negative Hock direction was confirmed against the actual rig geometry to fold the cannon/hoof forward and lift the foot; it is **not a published veterinary angle**. Retains hip, fetlock, body, front-leg channels, timing, mesh, skin, Rest Pose, and IBMs byte-for-byte. Existing clips remain selectable.

## Validation

Calculation includes the production V13.4 440-vertex selective abdominal skin weighting, actual embedded GLB mesh and 160 phase samples. Screening region: connected triangles with hind skin influence > 0.5, y < 0.95, z < -3.10; rest edge length 0.008–0.12; 2,932 edges.

| 160-frame sampled value | V13.4 base | V13.5 candidate |
| --- | ---: | ---: |
| Max edge stretch ratio in screened lower hind region | 1.421 | 1.322 |
| p99 of per-edge peak ratios | 1.260 | 1.255 |
| Edges > 1.5 | 0 | 0 |
| Right fetlock-proxy max height (model unit) | 0.315 | 0.336 |

The modified Hock local track has approx -18.9° to 21.5° right / -18.9° to 22° left; this does not equal anatomical Hock joint-angle excursion.

Chromium real GLB CPU skinning renderer was tested at consistent frames 85, 110, 125 of base/candidate after the existing 550 ms transition blend had finished (`inProgress = false`). Screen comparison showed real visual flexion of the distal hindlimb instead of a straight hanging lower segment. No JavaScript page errors, patched channel count = 4, JavaScript syntax check successful. Baseline clip is still intact.

## Remaining limitations and release gate

- No high-speed reference horse joint frames were directly extracted or metrically aligned. Morphology and actual hoof strike events are not experimentally measured; the 65..155 swing interval is a candidate based on existing foot proxy motion.
- No complete 160-frame multi-angle visual review, no GPU WebGL verification on the user's Windows PC, and no confirmation of physical ground contact.
- This remains the 19-bone preview, not native 456-bone Blender action.
- Do not claim realistic gallop completed. Do not activate this candidate in production until the full gait, side/rear/45-degree rendering and user review are satisfactory. Revert by leaving main unchanged if not.