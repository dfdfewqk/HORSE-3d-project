# HORSE RANCH V16 — Walk-only candidate QA

## Baseline
- Source commit: 1acbb7c4e77cc6b892f3581d49190d65729a0c0e.
- V15 preview, GLB, all V15 Gallop clips and original assets unchanged.
- New standalone v16-walk-preview/ directory; imports original V14 and V15 scripts.
- Guards: original 19-joint GLB; 24,314 body vertices; protected V13.4 440 abdomen vertices; 5 visible motions.

## Walk-only implementation
1. Real GLB sole vertex search by weighted fetlock membership and local position, with toe/heel/center samples.
2. Four-beat lateral Walk; provisional 65% stance duty factor, independent front/hind stride and lift targets.
3. Constrained sagittal-plane IK (Shoulder/Knee/Fetlock; Hip/Stifle/Hock/Fetlock), baked 160 frames.
4. Walk-only torso/neck/head/tail small response; V15 HairKey walk mode reused.
5. Existing V15 Cruise/Fast/Sprint animation channel objects reused unchanged.

## Run and audit
- Normal preview: https://dfdfewqk.github.io/HORSE-3d-project/v16-walk-preview/
- CPU comparison: https://dfdfewqk.github.io/HORSE-3d-project/v16-walk-preview/?audit
- Browser outer context: window.__horseV16Check() and window.__horseV16QA.result
- Check actual four hoof stance positions, roll, crossing, skin edge dilation, waveform seam and front/rear/side camera.

## Status / limitations
- Syntax, synthetic 19-joint IK, five-choice UI and callback compatibility verified in local tests.
- Synthetic skeleton solver errors are NOT measured actual GLB contact errors.
- Real GPU Chrome Windows playback, actual hoof contact and complete skin comparison are unverified until the audit is run.
- No original 456-bone Blender armature, no dedicated Hoof/Pelvis joints, no force/weight solver.
- In-place walking has planted visual hoof moving backward relative to stationary torso, not constant world Z.

## Sources
- https://pubmed.ncbi.nlm.nih.gov/10952376/
- https://pubmed.ncbi.nlm.nih.gov/11191608/
- https://pmc.ncbi.nlm.nih.gov/articles/PMC10451235/
