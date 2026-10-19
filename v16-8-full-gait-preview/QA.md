# HORSE RANCH V16.8 — P0 bridge + P1/P2 Walk contact-fit staging

**Baseline:** `main` at `e7aa72cc8611c708721a6a4468de951f3a4d2137`. This branch is an isolated test environment, **not a natural-walk release**. Do not deploy or merge automatically.

## Files / actual changes
- `index.html`: original legacy iframe, 50 original scripts and two new V16.8 scripts, 5 top/lower modes, a manual P1/P2 test button and side-by-side diagnostic output.
- `viewer-bridge.js`: uses legacy `clipIndex` as the only source of truth, adds 180ms experimental pose blending, preserves phase, synchronizes mode, compare, speed, play and Idle. **P0 fix:** updates the real DOM option value before switching to an old source clip; assigning an index not present in an HTML select's options can clear its value and select the wrong clip.
- `walk-contact-fit.js`: new **experimental Walk-only** real skinned vertex optimization. Processes four hoof contact/toe/heel triplets, 14 original X-hinge limb rotations, cyclic gait targets; reconstructs all 19 joint transforms + inverse bind matrices. It runs **160 full-mesh CPU skin evaluations** for candidate and baseline. Skin cohort expected from V16.7 runtime: fore 3107, hind 2932 edges.
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
