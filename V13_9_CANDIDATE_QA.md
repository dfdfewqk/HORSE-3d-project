# HORSE RANCH V13.9 — actual GLB proxy-informed body support candidate (2026-10-16)

**Experimental only — NOT READY FOR MAIN / DEPLOY.**
Based on V13.8 be1ca764c82394aa3804ec0f5ba8b6d7b9e1cfe2; main stays V13.5 `d573079786b29d70d39a5ab52141e47885a33561`.

## Actual model
Read the original `legacy-v7.html` Git blob `15c13fba654510967997614be8c8d61ae386a832`, decoded the embedded **8,689,100-byte GLB** with JSON+BIN: 19 skinned bones, 24,314 body vertices, 40,506 body triangles, 49 native keys each for Neck/Head/Tail; no Pelvis or Hoof bones. Evaluated all 160 samples of four previously identified weighted distal skin vertices using source V13.1/13.2 curves, V13.5 fold, V13.7b warp, V13.8 additive response, inverse-bind matrices and exactly **440 V13.4 corrected abdomen vertices**.

| Skin vertex near hoof (GLB model Y) | V13.5 min | V13.7b min | V13.8 min | V13.9 min |
|---|---:|---:|---:|---:|
| HindR 890 | -0.01176 | -0.00770 | -0.01893 | -0.00943 |
| HindL 3696 | -0.01165 | -0.01694 | -0.02498 | -0.01195 |
| ForeR 984 | +0.00140 | -0.00334 | -0.00239 | +0.00001 |
| ForeL 3790 | +0.00070 | +0.00406 | +0.00470 | +0.00484 |

These are **single skin-point minima, NOT measured hoof sole contact, stance, penetration, root-speed compensation or collision**. Their agreement with desired heights does not demonstrate naturalness.

## Actual patch
`gallop-v13-9.js` makes a new clip from V13.8, changing **only Torso Y translation** with bounded, smooth cyclic support lift `.006*pulse(frame,12,14)+.011*pulse(frame,33,14)`; tested max ~0.01351 GLB units. Remaining 18 animation channels retain their objects, preserving all limb, neck, head and tail motion and all prior clips. Requires 19-joint expected source, V13.7b warp amplitude 1 and 440 preserved belly-weight vertices. `index.html` loads the new clip after all prior scripts.

## Local tests
- Node JS syntax / inline HTML script parsing: PASS.
- Node VM synthetic 19-joint validation with actual original joint names and 49-key neck/head/tail: PASS, exactly 1 changed/18 reused tracks, stable source and Walk, finite correction.
- Reject improper source warp and non-440 belly-weight state: PASS.
- The original GLB's **four proxy trajectories** were evaluated across 160 frames with real skin/bind data (table).
- **Full triangle-edge skin/stretch 160-frame comparison: NOT PASSED.** An attempted independent edge evaluator produced invalid zero values and was discarded. The earlier V13.5 fore cohort max ~1.69887 and 20 edges above 1.5x are NOT resolved or verified in V13.9.

## Remaining required tests / blockers
No actual matched V13.9 WebGL GPU render, no 0.25x/1x multi-view user video, no verified full GLB skin stretching or skin-intersection pass, no multipoint foot sole stance/collision/sliding and root translation fitting, no supported claim of improved hind joint fold/propulsion, no high-speed 10-video measured reference set, and no native Blender 456-bone Action restoration. Existing 19-joint GLB remains unchanged.

**Release decision: HOLD.** Need accurate 160-frame same-cohort mesh stretch and multi-foot sole contact tests; rendered V13.5/V13.8/V13.9 side-by-side in real browser and user feedback before merge or deployment.
