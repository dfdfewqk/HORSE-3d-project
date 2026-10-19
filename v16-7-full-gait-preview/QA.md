# HORSE RANCH V16.7 — Full-gait candidate / verification ledger

**Base:** `339592a111f0377bf51e84f7631f4c3a6c236ff4` (V16.6), source recording `화면 녹화 중 2026-10-19 140400.mp4` (14.03 s at 30 FPS). Source GitHub URL: https://github.com/dfdfewqk/HORSE-3d-project

## Scope / non-negotiable preservation
- All source files go only to `v16-7-full-gait-preview/`. Previous V15–V16.6 folders, `legacy-v7.html` (original GLB), saved material bindings, 440-vertex abdomen correction, stationary pose, and original three V15 Gallop clips remain unchanged.
- Four experimental clips are ADDED (not substituted or mutated): `Walk_V16_7_FOOTFALL`, `Gallop_V16_7_CRUISE`, `Gallop_V16_7_FAST`, `Gallop_V16_7_SPRINT`.
- Original viewer still exposes precisely five selections: still, Walk, Gallop Cruise, Gallop Fast, Gallop Sprint. New scripts reroute the four moving selections to candidate clips. Preview toolbar supports individual comparison to source clips.

## Before/after changes
| Mode | Earlier source | V16.7 difference |
|---|---|---|
| Walk | Walk_V16_6_LEGS_REBUILT | Four-beat RH/RF/LH/LF; independent peak timings for carpus, fetlock, stifle, hock; restrained vertical/torso reaction |
| Cruise | Gallop_V15_CRUISE | 4-beat transverse RH/LH/RF/LF with asymmetric touchdown, medium swing flexion / lead forelimb; limited flight target |
| Fast | Gallop_V15_FAST | Shifted strike intervals, shorter support, greater protraction and limb recovery than Cruise, stronger body response |
| Sprint | Gallop_V15_SPRINT | Distinct higher-frequency, higher-amplitude body/limb candidate, shorter proposed support intervals, with leading forelimb last before aerial interval |

The new engine uses 160-frame cyclical joint templates blended with source channels, clamped to existing local X-hinge ranges. Torso, neck, head and tail are updated separately from the source animation. HairKey and original skinning remain from prior systems. **These are animation-design priors, not actual equine physical force or ground contact simulation.**

## Research foundations
- University of Minnesota transverse gallop (single suspension, lead forelimb last):
  https://vanat.ahc.umn.edu/gaits/transGallop.html
- Full gallop mechanics: https://pmc.ncbi.nlm.nih.gov/articles/PMC2696142/
- Measured walk forelimb joint phases: https://pubmed.ncbi.nlm.nih.gov/10952376/
- Measured walk hindlimb and GRF relationships: https://pubmed.ncbi.nlm.nih.gov/11191608/
- Eadweard Muybridge side-on frame sequence (1887, public domain): https://www.nga.gov/artworks/167050-plate-number-632-bouquet-galloping-saddled

## Tests actually performed BEFORE this commit (NOT REAL GLB)
- Syntax parsing for gait-builder, gait-runtime, gait-audit, gait-visual and HTML inline script: PASS.
- 19-channel synthetic fixture for all four new clips (4 × 160 = 640 frame samples): PASS.
- Each clip changes all fourteen limb rotation channels across all four legs, compared to its earlier source: PASS on synthetic fixture.
- Synthetic angular maximum steps: Walk ~2.22°, Cruise ~2.36°, Fast ~3.14°, Sprint ~3.76° per frame. These values must NOT be reported as actual-horse rig results.
- Synthetic angular 159→0 seams: Walk ~0.31°, Cruise ~0.93°, Fast ~1.21°, Sprint ~1.62°.
- Synthetic 19-joint/24,314-vertex skin influence mock and four-clip initialization: PASS, with old clip object identity preserved.
- 50 injected dependency paths listed in viewer, existing paths must be resolved in repository tree before release.

## Run-on-real-GLB tests exposed but NOT YET EXECUTED
Open `?audit` and run the added 8-clip ×160 CPU skinning test = 1,280 frame samples, of which 640 are V16.7 candidates:
- Compare Walk V16.6 versus V16.7, V15 Cruise/Fast/Sprint versus corresponding V16.7 candidates.
- Reconstruct skinning using original joint indices, weights, inverse-bind matrices and pose matrices.
- Track actual original selected sole contact, toe and heel vertices (and visually check ground) for all four modes.
- Compute max ground penetration, in-place horizontal displacement, virtual stride-corrected stance deviation, fore/hind edge stretching (all matched cohort edges; cohort sizes 3107 / 2932), 8 clip samples and 4×160 candidate frames.
- Source GLB has only 19 joints. Its distal joints do not solve actual 3D hoof attitude, world-space anchoring, true weight shift/forces, or full Blender armature.
- Real Windows Chrome GPU frame-by-frame playback, face/neck/mane/tail temporal lag, game-to-study motion comparison and seamless mode crossfade are **NOT VERIFIED**.

## Mandatory interpretation of results
- PASS for syntax and for *mock* channel generation DOES NOT imply natural equine movement.
- PASS for CPU vertex integrity does not demonstrate measured contact force, no-slip or foot anatomy. Same-camera, same-phase human visual review is required.
- Fail or report NOT VERIFIED if any old Gallop clip, stationary pose, 440-vertex correction, prior project path or GLB changes. This release adds only a new folder.
- Mode switches keep approximately the previous normalized phase; actual transition blend/crossfade is not yet implemented. Do not imply this issue is solved.
- No silent fallback of candidate limbs to old data. The browser displays raw joint statistics and audit issues.
- Rerun after installing in real Windows Chrome and verify before claiming final completion.

## Candidate endpoints (only after successful GitHub Pages deploy)
- https://dfdfewqk.github.io/HORSE-3d-project/v16-7-full-gait-preview/
- https://dfdfewqk.github.io/HORSE-3d-project/v16-7-full-gait-preview/?audit
- https://dfdfewqk.github.io/HORSE-3d-project/v16-7-full-gait-preview/?debug

**Final release state:** experimental candidate, pending actual GLB and visual validation. Do not call finished/natural until those gates are met.
