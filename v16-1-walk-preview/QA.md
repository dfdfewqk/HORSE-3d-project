# HORSE RANCH V16.1 — Walk-only candidate QA

## 기준 및 보존
- Base commit: `788ecdaa502267f37c346418d4b6aea6ce207455`.
- Original `legacy-v7.html`, V15, V16 and all Gallop scripts preserved.
- Original GLB, 19-joint skin, V13.4 440-vertex abdomen weight correction are required loader guards.
- All gait durations remain inherited from V15; no altered Gallop clips.

## Biomechanics sources (qualitative)
- Hodson, Clayton & Lanovaz (2000), forelimb walk: https://pubmed.ncbi.nlm.nih.gov/10952376/
- Hodson, Clayton & Lanovaz (2001), hindlimb walk: https://pubmed.ncbi.nlm.nih.gov/11191608/
- The four-beat sequence and limb coordination reflect qualitative reference analysis; the chosen stride widths, swing heights, joint limits and stance fractions are **development candidates**, not measured physiological reference values.

## V16.1 changes
1. Four-beat right hind → right fore → left hind → left fore target phasing.
2. Stance duty fore .66, hind .64; stride fore .225, hind .235 in model units.
3. Quintic C2 position and velocity-matched swing; vertical hoof lift with smooth boundary derivatives.
4. Position-constrained regularized IK with stance/swing joint priors and previous-frame continuity.
5. Final Torso pitch computed before IK instead of afterward; small continuous body/neck/head response.
6. Existing V15 HairKey response retained. Old V16 and all three V15 Gallops remain unchanged.
7. Development-only `?audit` compares actual GLB CPU-skinned V16 and V16.1 over 160 samples.

## Pre-commit validation
- JavaScript parser checks: PASS.
- Synthetic skeleton 160-frame IK and UI integration: PASS.
- Model-proxy targets: fore error under ~8 mm, hind under ~3 mm in the simplified test rig.
- Exact C2 segment seam velocity differences at numerical sampling precision.
- This is **not** proof of real skinned foot contact or visual realism.

## Browser validation pending
- Run https://dfdfewqk.github.io/HORSE-3d-project/v16-1-walk-preview/?audit .
- Inspect browser `window.__horseV161QA.result` only after the actual run completes.
- Compare real hoof vertical displacement, penetration proxy, limb mesh edge stretch, and cycle seams.
- Inspect actual Windows Chrome/WebGL at several camera angles and normal speed.
- No Hoof and Pelvis bones: heel-toe roll and physically correct weight transfer may remain limited.
- Do not declare the animation final until video review and numeric regression both pass.
