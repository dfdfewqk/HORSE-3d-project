# HORSE RANCH 3D — FOUR GAITS (V14)

This branch is the minimal, isolated four-motion demonstration.

Playable motions, in order: **Walk** (based on `Walk_V13_1_GROUNDED`, torso bob damped without retiming the limb order), **Gallop Cruise**, **Gallop Fast**, and **Gallop Sprint**. Each run mode is a distinct clip; speed transitions preserve the legacy V13.1 pose-blending handler.

Exactly four files live here:
- `index.html`: directly openable four-button speed preview
- `legacy-v7.html`: original embedded GLB viewer (blob retained unchanged)
- `four-gaits.js`: packed internal compatibility pipeline, V14 run clips and a final four-clip runtime cleanup layer
- `README.md`: this file

The bundled compatibility pipeline is necessary to reproduce the preserved 440-vertex abdominal weight fix and the V13.9-based gait; its intermediate animations are removed from the runtime list after building. **Only four selectable animations remain.**

The original model and development files remain safely in `v14-speed-gait-lab-candidate` and earlier branches, and `main` stays V13.5. This branch is a candidate, not production, no Pages settings changed.

Limits: no verified physical hoof contact, WebGL multi-angle visual approval or original 456-bone Blender restoration. Speed boundaries (36/50/60 km/h), walk torso bounce reduction and playback calibration are trial parameters.
