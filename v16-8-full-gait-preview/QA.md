# HORSE RANCH V16.8 — P0 bridge + P1/P2 Walk contact-fit staging

**Baseline:** `main` at `e7aa72cc8611c708721a6a4468de951f3a4d2137`. This branch is an isolated test environment, **not a natural-walk release**. Do not deploy or merge automatically.

## Files / actual changes
- `index.html`: original legacy iframe, 50 original scripts and two new V16.8 scripts, 5 top/lower modes, a manual P1/P2 test button and side-by-side diagnostic output.
- `viewer-bridge.js`: uses legacy `clipIndex` as the only source of truth, adds 180ms experimental pose blending, preserves phase, synchronizes mode, compare, speed, play and Idle. **P0 fix:** updates the real DOM option value before switching to an old source clip; assigning an index not present in an HTML select's options can clear its value and select the wrong clip.
- `walk-contact-fit.js`: new **experimental Walk-only** real skinned vertex optimization (2026-10-20: added actual skin-edge penalty inside every joint-angle trial, not just post-hoc quality check). Processes four hoof contact/toe/heel triplets, 14 original X-hinge limb rotations, cyclic gait targets; reconstructs all 19 joint transforms + inverse bind matrices. It runs **160 full-mesh CPU skin evaluations** for candidate and baseline. Skin cohort expected from V16.7 runtime: fore 3107, hind 2932 edges.
- It does NOT alter the embedded GLB, source animations, mesh materials, HairKey, Idle/Gallop, 440-vertex correction or pre-V16.8 files. It does NOT append or automatically play the experimental candidate. P3/P4 remain unchanged.

## 2026-10-19 verification results

| Verification | Status | Exact extent |
|---|---|---|
| Repo original `main` HEAD before work | PASS | `e7aa72cc...` checked through GitHub |
| New JavaScript and HTML inline syntax | PASS | JS parser |
| P0 previous/new modes & Idle, actual option-value restriction | PASS (MOCK ONLY) | Simulated select rejects values without an option; tested Walk old/new, Cruise old, Idle; selected index and normalized phase 0.5 match |
| Embed decoded from original 11.6MB HTML | PASS | Source 19 skin joints, 24,314 body vertices, original native GLB source |
| Four authentic contact/toe/heel vertex triplets | PASS | Actual GLB source B-Rep/skin buffer accessor decoded |
| Original raw GLB source Walk proxy 160 frames | COMPLETED, NUMERIC FAIL | **Raw `Walk_PREVIEW` clip** was aliased to `Walk_V16_7_FOOTFALL` strictly to test algorithm with real skinned GLB geometry; this is **not the actual generated V16.7 candidate** |
| Chrome actual V16.8 multi-script playback | NOT VERIFIED | Real Chromium UI/GLB rendering not executed |
| 160-frame P1/P2 using actual V16.7 runtime & corrected mesh | NOT VERIFIED | Requires in-browser `Walk 실제 스킨 접지 보정 및 160프레임 검사` |
| 1280-frame eight-clip V16.7 audit | NOT VERIFIED in this update | Existing UI `?audit` available; was not run |
| P3 secondary body/neck/hair coupling | UNRESOLVED | Not changed |
| P4 individual gallops/true continuous inter-gait support | UNRESOLVED | Not changed |

## Real original-GLB geometry calibration
- Unmodified GLB scanned Y ground approximately **-0.001619m**.
- Fore feet: **0.14182m** toe-to-heel longitudinal extent (sole markers). Hind feet: **0.15021m**.
- Raw GLB per-mesh skin-edge cohorts calculated in the isolated decode: **3175 front / 2934 rear**, **not** the 3107/2932 established by the fully corrected V16.7 QA. Do **not** mix these setups or infer full-runtime equivalence. In the actual runtime, protect the known 440-vertex correction and audit it before accepting results.

## Original GLB raw Walk proxy A/B (NOT real V16.7 runtime)
| Metric | Raw Walk source | Chosen P1/P2 tuning candidate | Decision |
|---|---:|---:|---|
| Maximum hoof penetration | 22.19 mm | 8.88 mm | Improved, still FAIL (limit 5mm) |
| Maximum full skinned edge elongation | 1.447x | 1.342x | Improved, still FAIL (limit 1.20x) |
| Maximum stance contact height error | — | 31.09 mm | FAIL (limit 12mm) |
| Largest virtual-stride-corrected consecutive stance Z step | — | 52.39 mm | FAIL (limit 15mm) |
| Cyclic seam rotation | — | 3.48 deg | This metric alone does not validate motion |

An initial poorly weighted candidate worsened penetration to ~31.00mm; rejected.
A separate 4-deg per-frame step constraint reduced penetration to 7.85mm but worsened edge stretching to 1.460x and seam to 13.94deg; **rejected, not shipped**.
The committed contact-fit is the earlier conservative candidate which improved penetration **and** skin stretching. It still fails the hard limits; do **not** promote, auto-play or render as a finished horse walk.

## Hard evaluation gates
1. Same original 19 joints, unchanged V15–V16.7, 440 original abdomen corrections, original still pose and gallops.
2. Full-runtime CPU audit of sole contact + toe/heel, swing clearance, virtual treadmill-relative stance shift (not true world travel), max edge stretching and cycles; **never** equate IK-center error to ground contact.
3. For each candidate fail if penetration exceeds **5mm**, stance vertical error exceeds **12mm**, virtual stride-corrected consecutive stance step exceeds **15mm**, skin edge elongation exceeds **1.20x**, cycle seam exceeds **12deg**, or any candidate regresses >1mm penetration / 0.02x skin stretch from baseline. Limits are engineering diagnostic thresholds, **not veterinary validation**.
4. When real Chrome and recorded-video side-by-side evidence is unavailable, report **NOT VERIFIED**. Do not merge or deploy as finished.

Research context (not a direct validation of our rig): hoof breakover during equine walking typically occupies the last portion of stance. https://pmc.ncbi.nlm.nih.gov/articles/PMC7259550/ . Actual force-plate and kinematic events cannot be derived simply from the preview GLB.

## 2026-10-20 — P1/P2 substantive update (not a gait release)

**What changed in existing V16.8 files, without modifying any original clip or GLB**

- `walk-contact-fit.js`: during *each* candidate joint-angle evaluation, rebuild joint world transforms + inverse-bind skin transforms; measure original GLB contact/toe/heel vertices and **96 corrected skinned triangle edges around the affected leg**. Penalize excessive skin stretching alongside penetration, contact height/stride error, joint-angle displacement, and temporal discontinuity. Full-mesh final audit remains **all** 3,107/2,932 region edges, not just 96 samples.
- Added per-frame finding of worst hoof penetration (frame + leg), worst total skin stretch, worst stance error, actual toe/heel penetration, swing clearance, and lateral stance displacement. Hard regression gate rejects penetration >1mm or skin extension >0.02 above same-fixture source.
- `index.html`: existing Walk QA button now prints source-versus-candidate measurements and the failure frames, with explicit no-auto-apply warning.
- Runtime provenance check ensures actual V16.7 `addedClips===4`; exploratory tests use an explicit `isolated-proxy` marker. State resets old candidates when a retry fails.

**Real source model calibration (independent inspection):** decoded the **actual embedded GLB** from `legacy-v7.html`, reapplied the exact V12 `editBelly` strength/mask formula to cached `JOINTS_0`/`WEIGHTS_0` arrays without modifying the source. This reproduced **440** corrected abdomen vertices and the expected edge cohort sizes **fore 3,107 / hind 2,932**. Original uncorrected weights yield 3,175 / 2,934. The earlier discrepancy is therefore accounted for by the abdominal weight correction. This is a **real data-path unit calibration**, not a browser run.

**Algorithm smoke test:** an **8-frame isolated smoke test** used the corrected real GLB body and its original `Walk_PREVIEW` animation as a clearly marked **proxy**, not the generated V16.7 clip. Its 160-sample real-runtime checks were not simulated:

| Diagnostic on 8 coarse proxy frames | Source | New skin-penalized candidate | Interpretation |
|---|---:|---:|---|
| Hoof maximum penetration | 21.844 mm | 8.418 mm | Improvement but FAIL 5mm gate |
| Max full-mesh skin-edge stretch | 1.249x | 1.323x | **Regression** and FAIL 1.20x |
| Max stance height error | — | 30.854 mm | FAIL 12mm |
| Virtual treadmill-corrected step | — | 120.023 mm | FAIL 15mm; coarse 8-frame stride measurements are **not** comparable to 160-frame metrics |
| Max joint cycle seam | — | 9.649° | Below 12° but this does not validate walking |

Detected penetration was worst at proxy frame 4, fore-left; maximum edge stretch was at frame 4 and stance height discrepancy at frame 6. The isolated proxy test **FAILS**. The new algorithm has not solved the skin distortion problem and must not be applied automatically.

**Mandatory next checks:** execute 160-frame full-runtime V16.7 Walk source + candidate with corrected weights, then original 8-clips ×160 audit and real Chromium synchronized UI tests; export failing frames. The current 19 X-axis-hinge rig remains an under-actuated approximation; if penetration, true hoof attitude and skin length cannot jointly pass, rebuild the WEB rig/skin from protected Blender source in a separate candidate rather than silently expanding joint limits.

**Safety of existing assets:** modified files are only under `v16-8-full-gait-preview/`. Existing `main` and V14–V16.7 folders remain unchanged. This QA and Git stage do **not** constitute a publicly validated V16.8 preview/release.

## 2026-10-20 — P1/P2 coupled four-limb + strict no-regression envelope

Implemented in `walk-contact-fit.js` only (the protected `main`, original GLB, V12 belly correction, V15–V16.7 clips and Idle are untouched).

1. Each limb optimizer now sees the already-updated pose of the other limbs in that SAME frame, rather than testing every limb against a fresh unmodified torso/limb pose. A limited frame-zero wrap re-fit references the final cycle frame.
2. After fitting, for every frame the full 24,314-vertex corrected skin is evaluated against the corresponding ORIGINAL source frame. If the combined candidate exceeds source-frame maximum regional edge stretch by >0.02x or toe/heel/contact penetration by >1mm, the solver searches conservative interpolation fractions 0.75, 0.50, 0.25, 0.125, 0.00 until the regression envelope holds.
3. Any such backtracking forces an explicit FAIL and **no candidate clip is returned or cached for playback**. This prevents quietly calling original-pose fallback a success.
4. The existing UI reports backtracked frame counts, fraction and blocked output. Physical force, Chrome GPU motion, and equine plausibility remain UNVERIFIED.

**Independent actual GLB regression smoke test**: decoded original embedded binary glTF, then reproduced 440 V12 abdominal weight edits and 3107/2932 corrected regional edge cohorts; tested 8 coarse frames of the original `Walk_PREVIEW` clip aliased as an isolated proxy. These are NOT the production V16.7 `Walk_V16_7_FOOTFALL`, and are not a 160-frame runtime validation.

| Diagnostic, identical isolated fixture | Earlier skin-aware solver | Four-limb coupled | Coupled + safety envelope |
|---|---:|---:|---:|
| Deepest hoof below ground | 8.418 mm | 8.418 mm | 10.644 mm |
| Max corrected mesh edge stretch | 1.323x | 1.323x | **1.2045x** |
| Max consecutive virtual stance step | 120.023 mm | 97.721 mm | 149.642 mm |
| End/start joint angle difference | 9.649° | 10.149° | 7.274° |
| Worst stance-contact height | 30.854 mm | 30.854 mm | 30.484 mm |
| Backtracked frames | none | none | 6 of 8 |
| Candidate exposed for use | not approved | not approved | **NO — blocked** |

8-frame safety-envelope test status: **FAIL**. Thresholds still missed (hoof 5mm, edge 1.20x, stance 12mm, virtual stance step 15mm). Strong caution: 8-frame stride-slip proxies are heavily discretized and must NOT be treated as 160-frame motion evidence. Skin improvements must not be mistaken for overall locomotion improvement; stance movement worsened. This stage is exploratory only.

Next gates remain: full corrected-runtime 160-frame source/Walk comparison, full 1280-frame 8-gait audit, visual capture on real Chrome, and evaluation of a rig change if 19 X-hinge bones cannot meet coupled geometry limits.
