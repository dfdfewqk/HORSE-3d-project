# HORSE RANCH V16.6 — visibly animated legs corrective diagnostic

## Reported user problem
"목은 움직이는데 다리는 그대로야" (neck moves but legs look the same).

## Confirmed source-code fault
V16.5 `walk-motion.js` replaces complete leg channels with earlier V16.4 channels whenever `cycleSeamDeg>18`, `maxWorldTargetError>.13`, or target error exceeds V16.4's by 45% + .008. Neck/head channels are always generated separately, so the user could see new neck/head animation even when the legs were unchanged. The exact fallback list for the user's browser run remains UNKNOWN without that run's report.

## V16.6 correction (new directory only)
- Preserve all previous releases and immutable original GLB. V16.6 adds only a single candidate clip `Walk_V16_6_LEGS_REBUILT`.
- The 14 existing X-hinge joint channels, six forelimb and eight hindlimb, are regenerated deterministically over 160 sampled frames. No previous-version joint-channel fallback is silently applied.
- The 4-beat touchdown order is RH -> RF -> LH -> LF, each 0.25 cycle apart.
- Smootherstep phase keypoints give shoulder/knee/fetlock and hip/stifle/hock/fetlock separate curves, guided by published horse gait timing. These curves are *model-level estimates*, not literal measured joint rotations.
- The V16.5 original joint angle is blended toward the safe bounded keypoint target (.72 blending, or .82 if V16.5 previously recorded this leg as fallback). This is a cautious visible-motion demonstration; it is **not** an inverse-kinematics proof of ground contact.
- Torso, neck, head, tail, old HairKey, V15 and V16.5 source clip, all three Gallop modes and original stationary pose are not modified by this release.
- A/B viewer compares V16.5 and V16.6 directly without switching cameras or changing scene geometry.

## New model-level diagnostic (browser only)
- For 14 regenerated joint channels, report max and RMS angular change from V16.5, within-cycle angular range, and maximum 1-frame joint step.
- Resolve each controlled joint through actual 19-entity GLB skin joints; read JOINTS_0 and WEIGHTS_0 and count body mesh vertices with >.12 combined influence for that joint.
- Display per-leg max angular change, mean RMS change and number of skin-connected joints.
- If 4 legs do not get distinct source channel motion, do not finish initialization as 'ready'.
- If any leg joint has zero linked vertices or a large per-frame step, surface a user-visible warning. Source code and GPU/Chrome rendering are distinct checks; the browser-based skin-weight check **does not prove the final displayed hoof positions**.

## Tests performed before commit
- New track builder syntax: PASS.
- Mock 19-channel rig with 14 leg tracks, 160 frames: 4 legs show nonzero independent motion. Mock proves source generator only and is NOT actual original GLB.
- Viewer HTML syntax and dependency list verified.
- The runtime performs the real GLB linkage test only when visited in the user's browser. It does NOT falsely label that unperformed test PASS.

## Known limitations; priority for next iteration
1. Current original WEB GLB has 19 hinge-style joints, not the 456 original Blender bones. Shoulder/hip models and distal joints cannot fully reproduce realistic 3D support/swing forces.
2. V16.6 focuses on fixing a demonstrably stationary-looking leg-track regression. Contact, no-slip, hoof pitch, CPU skinning and visual biomechanical correctness remain **unverified** and need frame-aligned testing on the true GLB and footage.
3. The original 160-frame Walk and nominal speed are not calibrated physical movement. The model remains stationary in global space, so in-place hoof movement cannot demonstrate true non-slipping world contact.
4. If the candidate looks worse, revert by opening V16.5 (the prior version remains untouched), not by silently keeping previous animation under the V16.6 label.

## Supporting biomechanics (qualitative)
Hodson, Clayton, Lanovaz (2000), https://pubmed.ncbi.nlm.nih.gov/10952376/ : the distal forelimb flexion peaks at different swing phases (carpus 76%, fetlock 81%, elbow 84%).
Hodson, Clayton, Lanovaz (2001), https://pubmed.ncbi.nlm.nih.gov/11191608/ : coordinated hindlimb stifle/tarsus motion.
These are timings, not direct universal joint-local rotations.

## QA protocol
1. Open V16.6, note any error/warning from the real GLB joint/skin connectivity test.
2. Click '이전 Walk V16.5' and '새 Walk V16.6' with the same camera position and speed; confirm visible front/hind joint differences.
3. Confirm the right front and left front move 0.5 stride apart, same for hind; 4 contacts RH/RF/LH/LF.
4. Record same 160 frame camera angles and examine toe crossing, knee inversion, hock collapse, excessive knee bend, torso phase and belly mesh stretching.
5. Check Idle, Gallop Cruise/Fast/Sprint unchanged. If not, fail and keep V16.5.
6. Use older full CPU skin/contact audit for V16.3/4/5 as background only; this release's simple metrics are **not** equivalent to a V16.6 full GLB CPU skinning audit.

## Deployed pages only after successful GitHub Actions
https://dfdfewqk.github.io/HORSE-3d-project/v16-6-walk-preview/
