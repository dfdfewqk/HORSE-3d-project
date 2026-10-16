# HORSE RANCH V13.7 — Integrated Gallop candidate QA (2026-10-16)

Status: **EXPERIMENT ONLY — HOLD main at V13.5.** Candidate based on the intact production commit d573079786b29d70d39a5ab52141e47885a33561. Do not merge on numeric-only evidence.

## Observed baseline
The 19-joint preview's real embedded GLB has 24,314 body vertices. Four weighted distal hoof-proxy skin vertices (not measured physical hoof-ground contact points) are: HindR=890, HindL=3696, ForeR=984, ForeL=3790. Correcting the fore joint-to-channel mapping to the actual V13.1 NAMES index order yields V13.5 lowest-proxy phases R hind 15, L hind 37, R fore 59, L fore 83 of 160. This is left-lead (R hind, L hind, R fore, L fore) ordering. Initial testing with an incorrect fore-channel lookup was discarded and is NOT a valid forefoot result. The native Blender ~456-bone rig was not accessed or recreated.

## Candidate implementation
`gallop-v13-7.js` adds `Gallop_V13_7_INTEGRATED_CANDIDATE` without mutating the original GLB, mesh, skin, bind matrices, or any pre-existing animation. Exactly 16 animation channels are rewritten: eight hind limb joint rotations, six fore limb joint rotations, Torso translation and Torso rotation. A *per-limb monotone time warp* moves the existing full-chain motion curves together, rather than modifying the Hock in isolation. The left-lead modeled proxy minima target phases [9,34,59,83] (R hind, L hind, R fore, L fore), preserving order. Stance-region time warps are conservative: amplitude four samples for each hind limb, one for each fore limb. Torso response adds at most a few thousandths of a GLB unit in Y and no more than 0.37 degrees of additional local X rotation. 0.72 s/160 samples are unchanged. These numbers are animation design tunings, not experimentally measured horse timing or anatomical angles.

## Tests completed
- Local `node --check` syntax test passed; sandbox VM test passed: 16 tracks changed, 3 channel objects reused, 160 finite normalized rotation quaternions, animation selector change dispatched once and original Walk clip preserved.
- CPU skinning from the **actual embedded GLB**, across all 160 steps; applied exactly the existing V13.4 440-vertex V12 abdomen correction, original joint translations and inverse-bind matrices.
- Consistent selection: 5,436 hind-region mesh triangle edges, 5,521 fore-region edges. These are different cohorts; compare baseline/candidate only **within** the same cohort.
- No skin, mesh, rest/bind or original gait files changed in the candidate.

| CPU metric (same edge cohort) | V13.5 main | V13.7 tuned candidate |
|---|---:|---:|
| Hind maximum triangle-edge stretch | 1.32234 | 1.32230 |
| Hind 99th percentile per-edge maximum | 1.21806 | 1.21806 |
| Hind edges over 1.50x | 0 | 0 |
| Fore maximum triangle-edge stretch | 1.69887 | 1.69887 |
| Fore 99th percentile per-edge maximum | 1.41992 | 1.41396 |
| Fore edges over 1.50x | 20 | 20 |

The fore maximum **remains problematic in absolute terms**, even though it has not increased; do not characterize the fore skin as fixed.

**Foot-proxy motion** (derived from one weighted skin vertex per limb, **not** proven contact): V13.5 minimum sample phases HR15, HL37, FR59, FL83; tuned candidate HR11, HL35, FR59, FL82. For the band within 0.025 GLB units of each foot's own minimum height, static in-place Z-span is V13.5 HR 0.5264, HL 0.5571, FR 0.3934, FL 0.4051; V13.7 HR 0.6070, HL 0.5559, FR 0.3802, FL 0.4073. The increased right-hind Z-span is a caution; for an in-place running loop these *cannot by themselves* be interpreted as real world foot sliding without compensating whole-body travel and establishing actual contact.

The **initial aggressive** V13.7 phase-remap experiment (fore slow amplitude 9, target phases [0,30,62,94]) **failed**: fore p99 1.47634 vs 1.41992 and edges >1.5x 39 vs 20; worse LH fore low-band movement. Rejected. The tuned, smaller adjustment above is the committed experiment.

## Remaining release blockers
- No directly measured set of 10 synchronized real-horse reference videos; observed left lead and proposed phase targets are not proof of physiological fidelity.
- No native Windows GPU/WebGL or verified Chromium render of the **new candidate**; no matched V13.5/V13.7 side/rear/45-degree frames at 0.25x/1x and across multiple cycles.
- No proven stance intervals, modeled root-motion speed, ground plane / hoof collision and skin self-intersection analysis.
- No proof that modest phase/torso changes solve user's major complaint about propulsion, hind flexion, or naturalness. The V13.5 Hock recovery-shape limitation is not independently resolved here.
- No native Blender 456-bone Action recovery.

**Release decision: DO NOT merge into main or deploy.** Subsequent work must inspect real rendered footage, improve foot plant/proxy contact under consistent ground/root-motion assumptions, verify the fore absolute stretch issue, and re-test 160-frame metrics. Preserve both V13.5 production and V13.6 candidate.

Reference context:
- https://vanat.ahc.umn.edu/gaits/transGallop.html (right lead vs left lead, footfalls, trunk rocking)
- https://fr.copernicus.org/articles/24/151/2021/ (horse gait definitions)
- https://pubmed.ncbi.nlm.nih.gov/31444280/ (ground reaction force data; not direct curve calibration)
