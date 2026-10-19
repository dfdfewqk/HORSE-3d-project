# HORSE RANCH V16.5 — Walk contact / cyclic IK candidate

## Immutable baseline
- Base repository `dfdfewqk/HORSE-3d-project`, parent commit `33c121c4505d1c8ed6f17d82a1f0078e9a522ec5` (V16.4).
- This update adds only `v16-5-walk-preview/`. V15/V16.3/V16.4, existing GLB, 19 original joint IDs, 24,314 body vertices, 440 belly-correction vertices, existing materials, and Gallop/Idle clips remain intact.
- Reference user recording: `화면 녹화 중 2026-10-19 124905.mp4`; previous discussion observed forelimb flexion, hindlimb recovery, apparent toe contact, and torso support issues. No new phase-aligned quantitative video fitting was performed for this patch.

## Actual implementation changes
1. Shorter *development-estimate* step parameters (fore .265, hind .290 model units) with separately timed swing-lift envelopes and fore carpus/fetlock, hind stifle/hock priors. Values are NOT measured anatomical data.
2. Foot target trajectory defined with smooth stance acceleration/deceleration and swing return; flat touchdown and terminal toe breakover are *targets* only.
3. Final 3-axis Torso pose converts world foot goals into Torso-local IK targets. The original X-hinge 19-bone rig cannot solve independent lateral articulation.
4. Regularized damped least-squares IK with backtracking, angle range constraints, position/orientation terms and cyclic forward/backward passes replaces repeated unconstrained Jacobian steps.
5. Periodic first-derivative bridge near 159→0 to avoid V16.4's forced identical endpoint angles; the actual seam error is still measured.
6. **Fail-soft gait protection**: if a leg's IK outcome is nonfinite, has seam >18°, world target residual > .13 model units, or exceeds V16.4 residual by >45% plus .008, retain that leg's V16.4 joint channels. Show `fallbackLegs` to the user. This does NOT certify the resulting combination visually and may still need coordinated torso/leg tuning.
7. Expose rig chain translations, distal offsets, rest quaternions and sole membership in `__horseV165.rigInspection`. This is an inspection hook: it does NOT assert that the original Blender axes were validated.
8. Maintain earlier HairKey base reset and Walk-only secondary motion. Previous Gallop-specific hair code remains unchanged.
9. Add direct A/B Walk V16.4/V16.5 switch without changing camera or speed setting, plus V16.3/V16.4/V16.5 matched normalized 160-frame CPU-audit charts.

## Verifiable tests actually executed for V16.5 source
- JavaScript syntax/metadata/inline-page dependency checks (post-build): required.
- Four-hoof phase values across 640 synthetic trajectory samples: finite, with 8 toe-off/touchdown boundaries gap at epsilon=1e-5 frame of roughly 1.94e-14 model units.
- 160 synthetic Torso quaternion norm and inverse-local-space transformation round trips: finite, norm error ~1.1e-16 and round-trip error ~2.5e-16.
- A 4-leg synthetic FK fixture executed V16.5 cyclic IK over 160 frames. After periodic first-derivative correction, the right-hind cycle seam was ~2.58°, vs ~50.58° before the bridge in that fixture.
- **Synthetic tests are not tests against the actual saved horse mesh or armature.** Synthetic hind and fore legs still had many limit events and some high residuals; the warning/fallback gate is therefore intentional, not a solved joint biomechanics claim.

## REQUIRED real-model gate (not automatically proven by Pages build)
Open `?audit` in a real browser and compare all three versions at the same normalized frames. Collect:
- Each fore/hind contact vertex, front vertex, back vertex trajectory and sole penetration.
- Body-mesh skin stretches in fore/hind regions, V16.3 vs V16.4 vs V16.5.
- IK world-space contact residual, joint-limit hits, hoof orientation error and cycle-seam results; pay special attention to `fallbackLegs`.
- Cycle-relative stance slip `maxTravelCorrectedStanceSlip` is a *virtual treadmill proxy*, not actual world hoof sliding; no physical locomotion travel or contact force is simulated.
- GPU playback in Chrome on Windows and matched side-view frame review of the user reference MP4.
- Mode regression: Idle, Gallop Cruise, Fast, Sprint must be visually unchanged.

Any missing real-model measurement stays NOT VERIFIED, not PASS. If V16.5 makes skin contact/deformation or foreleg limits worse than V16.4, return to the V16.4 viewer and fix the independent V16.5 candidate; do NOT overwrite earlier versions.

## Research anchor (qualitative)
- Hodson et al., forelimb walk joint-angle timing: https://pubmed.ncbi.nlm.nih.gov/10952376/
- Hodson et al., hindlimb stifle/hock relationships: https://pubmed.ncbi.nlm.nih.gov/11191608/
- Head/withers/pelvis and footfall coupling: https://pubmed.ncbi.nlm.nih.gov/36359178/

## Pages URLs (available ONLY after confirming successful Actions build)
- Candidate: https://dfdfewqk.github.io/HORSE-3d-project/v16-5-walk-preview/
- 3-version comparison CPU audit: https://dfdfewqk.github.io/HORSE-3d-project/v16-5-walk-preview/?audit
- Developer frame/camera comparison: https://dfdfewqk.github.io/HORSE-3d-project/v16-5-walk-preview/?debug

## Completion criteria
No GitHub Pages success message or JavaScript parser pass is evidence of natural animation. Release remains a **candidate**, until actual GLB audit, contact/IK regression, synchronized video comparison and native Chrome GPU visual test pass. No deletion or Blender rig replacement is permitted without user authorization.
