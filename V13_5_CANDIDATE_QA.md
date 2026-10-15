# V13.5 Hind Swing Candidate — NOT DEPLOYED (2026-10-15)

## Existing V13.4 reference
Production main remains `b1fbb006566d640aa169388658fcdf995571650f`. V13.4 skin-weight correction remains unchanged.
The source rig is a **synthetic 19-bone preview**, not the original Blender 456-bone Action.

## Work performed
Compared V13.4 Gallop V13.2 hind joint tracks at 160 time samples with kinematics references:
- https://vorl.vetmed.ucdavis.edu/equine-gait-analysis
- https://pubmed.ncbi.nlm.nih.gov/23742040/
- https://pubmed.ncbi.nlm.nih.gov/31444280/
- https://doi.org/10.1111/j.1439-0264.1983.tb01019.x

Direct frame extraction from UC Davis YouTube references **did not succeed**. These sources inform qualitative biomechanics; they **do not provide measured target angles** for this candidate.

Local alternatives increasing swing clearance or changing joint angles increased local edge distortion or gave an insufficient visual improvement. Rejected.

This candidate only retimes the swing interval of Hip, Stifle, Hock, Fetlock for both hind legs. The swing time phase is advanced by a bounded 12/160-frame envelope; ground-contact phase and other tracks remain untouched.

## Results
Tests against actual V13.4 embedded GLB, 160 sample frames:
- Hind-region edges screened: 2,890 (skin influence >0.5, y<0.95, z<-3.10, edge length 0.008–0.12).
- V13.4 max: 1.8293, p99: 1.3085, >1.5: 11 edges.
- Candidate max: 1.8293, p99: 1.3085, >1.5: 11 edges.
- Real Chromium CPU fallback rendering at paused frames 20,70,120 completed without JavaScript errors.
- Gallop V13.5, Gallop V13.2, Walk V13.1, Trot and Canter passed clip switching at 4 frames each.
- Forelimb/torso and other clips remain byte-for-byte unmodified in new animation clip.

## Explicit limitations and stop
The candidate does **not** demonstrate a convincing improvement in gallop naturalness or prove correct real hoof contact. Its angular-acceleration roughness is slightly worse for some hind joints. GPU and user-device motion appearance unverified. Hence it is **not included in index.html, and should not be deployed to main** until a verified high-speed reference and full continuous motion comparison support it.
