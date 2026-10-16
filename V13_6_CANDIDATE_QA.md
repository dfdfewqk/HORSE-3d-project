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
