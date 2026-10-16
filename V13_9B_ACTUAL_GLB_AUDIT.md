# HORSE RANCH V13.9b — actual GLB 160-frame QA (2026-10-16)

**EXPERIMENT ONLY. Do NOT merge into main or auto-deploy.**

GLB source `legacy-v7.html` Git blob `15c13fba654510967997614be8c8d61ae386a832` (8,689,100 bytes).
Real 19-joint model, 24,314 main body vertices; V13.4 belly correction **440 vertices** retained. Source V12→V13.9 animation builders were executed against the actual GLB, and 160 CPU skinned poses per clip (640 total) were independently reconstructed with complete column-major 4x4 transforms, hierarchy, and inverse bind matrices. All computed data were checked for nonfinite values. The prior output of all-zero edge stretch was INVALID because an incomplete rotation matrix polluted the calculation.

Fixed cohorts: original body triangle edges 0.008–0.12 units. Both vertices skin-dominated by respective limb group (>0.5) with y < 0.95; Hind z < -3.1, Fore z > -2.8. **Hind 2,932 edges; Fore 3,107**. Do NOT compare these p99s with the V13.7 wider cohort.

| Metric | V13.5 | V13.7b | V13.8 | V13.9 |
|---|---:|---:|---:|---:|
| Hind max edge ratio | 1.32234 | 1.32230 | 1.32230 | 1.32230 |
| Hind p99 per-edge maximum | 1.23885 | 1.23880 | 1.23881 | 1.23881 |
| Hind edges >1.50 | 0 | 0 | 0 | 0 |
| Fore max edge ratio | 1.69887 | 1.69887 | 1.69887 | 1.69887 |
| Fore p99 per-edge maximum | 1.46962 | 1.46962 | 1.46963 | 1.46963 |
| Fore edges >1.50 | 20 | 20 | 20 | 20 |

Single *distal proxy* vertex min Y (not physical ground contact):

| Vertex | V13.5 | V13.7b | V13.8 | V13.9 |
|---|---:|---:|---:|---:|
| HindR 890 | -.01176 | -.00770 | -.01893 | -.00943 |
| HindL 3696 | -.01165 | -.01694 | -.02498 | -.01195 |
| ForeR 984 | +.00140 | -.00334 | -.00239 | +.00001 |
| ForeL 3790 | +.00070 | +.00406 | +.00470 | +.00484 |

`qa-skin-v13-9.js` supplies a **manual, incremental** 160-frame audit from the real loaded viewer model; reads only, never modifies original GLB, clips, selection, skins, or rig. The separately executed GLB analysis above produced the table. On-page browser/GPU verification **still needs to be performed**.

**Release gate: HOLD.** The V13.9 torso-Y-only change does not worsen the tested skin stretch but also does not repair the 20 >1.5x fore edges. True multi-vertex hoof soles, contact timing, collision/sliding, propulsion, 0.25×/1× multi-angle videos, real user-device GPU and original Blender 456-bone Action remain unverified. No claim of natural Gallop acceptance is justified yet.
