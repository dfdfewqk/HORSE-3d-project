# HORSE RANCH V16.4 — world-frame Walk candidate / verification report

## Provenance and scope
- Parent baseline: `00b06d5ec3410ab1a26c82d942728d3e3095090f` (V16.3).
- Changes are confined to the new `v16-4-walk-preview/` directory.
- Legacy GLB, saved 19-joint rig, original 24,314 body vertices, 440 belly correction vertices, materials, original UI, idle pose, and Gallop Cruise/Fast/Sprint sources are not edited by this release.
- Walk V16.4 is an **experimental candidate**, not a verified natural equine walk.

## Corrected faults and physical constraints
1. **P01/P02:** Independent timing curves for fore carpus and distal fore fetlock; hind stifle/hock coordination approximated by separate curves. The angle curves remain fitted development priors, *not* measured anatomical angles.
2. **P03:** Reworked touchdown hoof pitch to a flat target and smooth terminal breakover, with phase-continuous y/z/pitch. The real contact vertex, front and back vertices are retained from the original V16 scanner.
3. **P04:** World-space hoof goal is converted into the inverse of the final normalized 3-axis Torso quaternion, then passed to the constrained sagittal IK. Earlier versions approximated 3D body rotation with two first-order offsets. The 19-bone rig still has no lateral IK DOF; max lateral error is **explicitly reported**, not silently discarded.
4. **P05:** Subtle body support response and neck/head phase modulation; independent scapula/pelvis/spine bones still do not exist.
5. **P06:** The HairKey overlay is recomputed after the original V15 base update even on the same animation timestamp to avoid a stale additive overlay after scrubbing; it is Walk V16.4-only.
6. **QA integrity:** V16.3's QA used `config.toeVertex` and `config.heelVertex`, while the actual `__horseV16Targets.collect` scanner exposes `frontVertex` and `backVertex`. The V16.4 QA uses the correct field names and rejects invalid vertex indices. This is essential to avoid invalid measurements.
7. **Loop:** A bounded 12-frame cyclic seam correction is applied around the 159-to-0 frame transition. Its benefit/possible local contact-target tradeoff must be checked on the real GLB.

## Literature anchors
- Hodson, Clayton and Lanovaz (2000), equine forelimb walk kinematics, DOI 10.2746/042516400777032237, https://pubmed.ncbi.nlm.nih.gov/10952376/
  The reported carpal, fetlock and elbow swing-flexion peak timings differ.
- Hodson, Clayton and Lanovaz (2001), equine hindlimb walk kinematics, DOI 10.2746/042516401776767485, https://pubmed.ncbi.nlm.nih.gov/11191608/
  Hip protraction/retraction and coordinated stifle/tarsus flexion describe phases, not directly transferable bone-local degrees.

## Checks EXECUTED on exact new JS sources
- JavaScript parser checks: PASS for all new scripts and the viewer's inline script.
- Four-foot planned hoof states for 160 frames each (640 states): all finite.
- Contact continuity at eight touchdown/breakover boundaries: maximum direct two-sided discrepancy ~3.58e-12 model units at an epsilon of 0.0001 frame.
- 160 torso quaternion normalization samples: maximum norm deviation ~1.11e-16.
- 160 inverse-rotation round trips through the V16.4 3D torso: maximal tested difference ~2.54e-16 model units.
- A **synthetic mock-rig fixture** was used to exercise 4x160 IK solves and cyclic closure; four tested cyclic angle seams evaluated to 0 degrees after correction. This tests code integration, NOT correctness on the horse GLB.
- The synthetic fixture exhibits large target errors and joint-limit hits and is not suitable for assessing whether the horse's gait improved; do not treat it as a biomechanical PASS.

## Checks NOT EXECUTED / release gates
- Full actual GLB `?audit` 160-frame V16.3/V16.4 skinning comparison in a browser. This includes real toe/back vertices, hoof-ground penetration, skin stretches and joint-limit counts.
- Native Chrome GPU playback, all five UI modes, actual original-gallop animation identity and secondary hair GPU buffer verification.
- Video phase alignment with the uploaded `화면 녹화 중 2026-10-19 122502.mp4` and actual world locomotion calibration.
- Cannot prove V16.4 exceeds V16.3 naturalness without these tests.
- Acceptance requires no NaNs or initialization errors, no nonperiodic posture jumps, non-worsening forelimb error/limit-hit metrics against V16.3, acceptable toe/heel ground distances, no skin distortion, and human visual frame-by-frame inspection.

## Access after Pages build succeeds
- Viewer: https://dfdfewqk.github.io/HORSE-3d-project/v16-4-walk-preview/
- GLB audit: https://dfdfewqk.github.io/HORSE-3d-project/v16-4-walk-preview/?audit
- Manual frame/camera check: https://dfdfewqk.github.io/HORSE-3d-project/v16-4-walk-preview/?debug
- If the real GLB metrics fail, keep V16.3 as the recommended version and adjust only the V16.4 candidate. Do not overwrite previous releases.

## Explicit limitations
- 19 hinge joints; no independent Hoof / scapula / pelvis / segmented spine joints.
- Sagittal IK uses a three-axis body transformation for target projection but cannot solve lateral bone articulation. Its reported world-space residual is an approximation from a rigid distal point, not a contact-force measurement.
- All locomotion speed displayed in the original viewer is nominal and not physically calibrated.
- No claim of actual biomechanics validation, measured ground reaction force, native Windows validation, or restored Blender armature.
