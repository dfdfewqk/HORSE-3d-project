# HORSE RANCH V16.2 — Full-body Walk candidate / QA

## Provenance and protected baseline
- Base commit `b6487f0908aff105d9b69e2abc969c71289ac617` (V16.1).
- Original embedded synthetic 19-bone GLB remains unchanged, as do the 24,314 primary body vertices, older Walk clips, saved belly weight correction (440 verts), and Gallop Cruise/Fast/Sprint.
- New files are restricted to `v16-2-walk-preview/`.
- No new Blender source armature, physical forces, or separately articulated pelvis/spine/hoof rig exists in this candidate.

## Referenced equine walk research
- Forelimb sagittal kinematics and GRFs: Hodson et al. (2000), https://pubmed.ncbi.nlm.nih.gov/10952376/
  Carpal flexion can peak around 76% of the forelimb stride, with different timings at other joints.
- Hindlimb sagittal kinematics and GRFs: Hodson et al. (2001), https://pubmed.ncbi.nlm.nih.gov/11191608/
  Hip protraction/retraction and stifle–tarsal flexion are coordinated rather than synchronous.
- Head/withers/pelvis footfall timing study: https://pubmed.ncbi.nlm.nih.gov/36359178/
- Walking sequence diagram: https://www.sevenhillstraining.com/post/the-walk-an-introduction-to-biomechanics-part-1
- These provide qualitative design constraints; candidate rig rotations are not scientific measurements.

## What changed (Walk only)
1. Four-beat lateral sequence RH-RF-LH-LF and separate .635 hind/.650 fore stance fractions.
2. Softer breakover + vertical swing phases; heel-toe *target* pitch tracked but only synthetic fetlock rotation available.
3. Separate fore/hind phase-oriented joint priors; 2D regularized IK solves position + soft distal orientation.
4. Small 3-axis Torso response computed first, then solved leg IK against that final torso pose.
5. Neck/head and Walk-only HairKey secondary response; no Gallop hair changes.
6. Debug controls via `?debug`; full-body CPU skin auditing via `?audit`.

## Actual GLB rig-space test (160 samples)
- 19 skin joints, 24,314 body mesh vertices, sole scan passed; median model floor Y = -0.001619.
- ForeR max target residual ~9.08mm; ForeL ~9.09mm.
- HindR/HindL max target residual ~6.14mm.
- Max forehoof orientation residual ~13.73 degrees, hind ~4.03 degrees.
- Fore joint-limit hits: 27 samples per limb; hind: 0. These are **remaining limitations**, not passes.
- A wider fore fetlock angle alternative was rejected: max fore target error rose to ~11.3mm while joint limit hits did not decrease.
- This is a direct test of the real GLB rig and sole geometry with a simplified static Torso source. It is **not** a full Chrome/WebGL screen test of the final clip.
- No actual ground reaction forces, photographic joint-point fit or realistic hoof-roll recovery has been demonstrated.

## User-facing preview
- https://dfdfewqk.github.io/HORSE-3d-project/v16-2-walk-preview/
- CPU skin baseline comparison `?audit` (must execute to obtain real skin stretch/penetration numbers).
- Development-only frame/camera controls `?debug` (side, reverse side, front, back, quarter; 160 frame positions).
- `window.__horseV162Check()`, `window.__horseV162QA.result`, `window.__horseV162VisualQA` in browser parent/iframe contexts.

## Remaining validation before calling this natural/complete
- Open the real Windows Chrome page, inspect all 5 modes.
- Execute `?audit` to test 160 frames of actual GLB skin deformation and height/penetration proxies.
- Compare aligned side-view real Walk footage at touchdown, loading, breakover, swing and loop boundary.
- Confirm actual GPU uploads of secondary hair. Browser failures must be fixed before approving.
- The 19-bone model lacks independent scapula, pelvis, segmented spine and hoof bones: true equivalent motion needs an authorized rig augmentation. Existing GLB must not be replaced without approval.
- The UI speed label is nominal; it is **not** calibrated to world displacement.
