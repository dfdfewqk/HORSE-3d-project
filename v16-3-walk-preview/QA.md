# HORSE RANCH V16.3 — Walk integration candidate / evidence and limitations

## Immutable baseline
- Repository: dfdfewqk/HORSE-3d-project
- Parent main: c9835b55d9bce4e341b91025ffcaa104dd46e304 (V16.2)
- All previous HTML, GLB, 19-skin joints, 24,314 body vertices, 440 belly correction, materials and original Gallop clips remain unchanged.
- Files added only to `v16-3-walk-preview/`; earlier versions remain addressable.

## Problem-to-change map
- P01/P04 limb pose: adjust IK orientation weighting (stronger distal, reduced proximal), prior and continuity regularization. The forelimb joint-limit issue is **not yet proved solved**.
- P02 hoof: enforce continuity of planned hoof pitch through breakover and swing. Independent Hoof bone still missing.
- P03 phase transitions: replace constant-speed stance to zero-derivative cubic/quadratic endpoint ramps; swing remains quintic. Ensure planned Y/Z/pitch meet at touchdown and toe-off.
- P05 body: reduce exaggerated independently driven yaw/roll/pitch; use the final torso pose for IK as in V16.2, but 3D IK approximation remains.
- P06/P07: no new scapula/pelvis/spine bone added; anatomical articulation remains limited by the original 19 joints.
- P08/P09: retain V16.2 head/neck candidate and Walk-only secondary motion, no unsupported claims of research-measured angles.
- P10 speed: viewer 7 km/h is still a nominal selection. No verified world displacement calibration.

## Executed checks in this session
1. GitHub baseline at V16.2 head checked.
2. Newly authored JavaScript module syntax and HTML inline JS parse checked — PASS.
3. Isolated trajectory module run for all four limbs, 160 samples — finite and cyclic.
4. Boundary checks at touchdown and toe-off using phase epsilon 1e-6 — position, height, and pitch gaps ~1e-11 or less.
5. Planned per-frame Z step Fore maximum ~0.01004 model units; Hind ~0.01027.
6. No new original GLB/animation blobs or old repo files modified (must reconfirm by git diff after commit).

## Critical not-yet-executed checks
- V16.3 full 160-frame skinning results from actual `?audit` in browser, including toe/heel and deformation.
- New target residuals, forelimb joint-limit hits, and pitch error from the full GLB rig.
- Real-foot contact with ground and body world locomotion (forces NOT simulated).
- Real reference-video frame-aligned comparisons and visual QA.
- Native Chrome WebGL/GPU playback on user's Windows machine.
- Validate all five UI modes and Walk-only hair vertex updates visually.

## References (qualitative)
- Hodson et al. (2000), forelimb walk: https://pubmed.ncbi.nlm.nih.gov/10952376/
- Hodson et al. (2001), hindlimb walk: https://pubmed.ncbi.nlm.nih.gov/11191608/
- Head, withers and pelvic footfall timing: https://pubmed.ncbi.nlm.nih.gov/36359178/

## Working URLs (after verified Pages deployment)
- Preview: https://dfdfewqk.github.io/HORSE-3d-project/v16-3-walk-preview/
- Audit: https://dfdfewqk.github.io/HORSE-3d-project/v16-3-walk-preview/?audit
- Debug: https://dfdfewqk.github.io/HORSE-3d-project/v16-3-walk-preview/?debug

## Acceptance criteria
Do not claim V16.3 is a realistic finished Walk unless full GLB audit, matched reference-footfall pose review, joint-limit comparison, toe/heel contact, and visual Chrome playback pass. Revert only candidate code on failure; preserve original baseline.

## V16.3 follow-up audit improvements
- Audit tracks separate toe/heel ground penetration, toe/heel vertical difference, per-foot IK positional/orientation errors and joint-limit events.
- The audit chart labels are corrected to V16.2/V16.3 and provides a one-click copyable JSON result for reproducible Chrome inspections.
- Browser initialization displays Walk-only secondary-hair and visual-debug initialization errors instead of silently omitting them.
- These diagnostic changes do not modify GLB, skin weights, Gallops, or the V16.3 Walk clip motion curves.
- Full 160-frame browser-run audit and source-video phase-matched inspection remain required for animation approval.
