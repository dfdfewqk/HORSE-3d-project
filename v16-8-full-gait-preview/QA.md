# HORSE RANCH V16.8 — isolated P0 integration, NOT A RELEASE

**Base main:** `e7aa72cc8611c708721a6a4468de951f3a4d2137` (V16.7)
**Folder:** `v16-8-full-gait-preview/`

## Concrete changes in this branch
- New top-level preview `index.html` loads all existing 50 dependent scripts from their original unchanged locations, then loads `viewer-bridge.js`.
- The real legacy `clipIndex` / `animTime` / `play` are authoritative. The upper Idle/Walk/Cruise/Fast/Sprint selector, lower selection, source/new comparison, play/pause, and speed mirror this state.
- Switching clips retains the normalized source-phase and begins an experimental 180ms quaternion/translation/scale pose blend. A lower-select change is intercepted in its capture phase before the legacy change handler resets the clock.
- The original GLB, source clips, V15–V16.7 code, original five lower UI options, 19-bone rig, 440-vertex abdomen correction, and HairKey are not modified.
- Existing V16.7 CPU geometry audit is exposed with *diagnostic* guardrails (hooves >5mm below ground, stance >15mm, mesh edge stretch >1.20x). These thresholds do **not** mean that any gait is physically validated.

## Checks actually performed
| Verification | Status | Notes |
|---|---|---|
| Repository `main` SHA | PASS | Verified at project handoff |
| Source asset dependency paths | PASS | All 50 previously deployed scripts resolve in the repository; new `viewer-bridge.js` included as 51st |
| HTML inline JavaScript syntax | PASS | `new Function` parse in isolated JavaScript host |
| Bridge JavaScript syntax | PASS | `new Function` parse in isolated JavaScript host |
| Mock mode change / phase retention / original compare / Idle | PASS | Mock DOM and rig only, NOT Chrome/GLB |
| Direct Chromium viewer UI interaction | NOT VERIFIED | Browser integration not executed |
| Real GLB old/new 1280-frame CPU inspection | NOT VERIFIED | Existing audit is still available via `?audit`; not executed here |
| P1 actual hoof-toe/heel/centre ground anchoring | FAIL / UNRESOLVED | V16.7 builder is retained, no new gait substituted |
| P2 real skin extension & 19-joint kinematic reachability | FAIL / UNRESOLVED | Previous P1/P2 trial increased skin stretching |
| P3 body/neck/head/hair response physically coupled to contact | UNRESOLVED | Earlier sine-based source gait remains |
| P4 Cruise/Fast/Sprint biomechanics and mode-transition hoof slip | NOT VERIFIED | Runtime pose blend exists; contact during blend not measured |
| Original asset preservation | PASS (Git tree paths) | This commit adds only this independent folder |

## Previous measurements — MUST NOT be counted as V16.8 test results

The handed-over V16.8 investigation reported real GLB proxy evaluations (not the complete production runtime):
- Walk: penetration 21.19 → 16.26 mm; front skin extension 1.196 → 1.447x
- Cruise: 39.20 → 36.60 mm; 1.255 → 1.542x
- Fast: 62.17 → 49.54 mm; 1.349 → 1.583x
- Sprint: 36.49 → 39.63 mm; 1.401 → 1.542x

The revised experimental IK reduced center-point error but did **not** pass toe/heel/skin tests. Do not promote the old experimental IK clip generator.

## Required gates before merge/deploy as finished
1. Test with real Chromium + actual embedded GLB; verify 5 lower modes, source/candidate, changing speed and play/idle, animation state, normal and reverse switching, and glitch-free transitions.
2. Build **genuinely new** skin-aware hoof constraints, with contact/toe/heel and 19-joint limitations checked against full model; do not claim IK-center success alone.
3. Run 4 existing ×160 + 4 new ×160 = 1,280 CPU-skinned frames; log penetration, stance slip, toe/heel contact, edge extension, seams, plus body/head/hair behavior.
4. Do frame-matched, fixed-camera qualitative inspection using real recorded horse references.
5. Only on ALL gates passing, commit/merge to `main` and enable/publicize the GitHub Pages result. Until then this branch is an isolated candidate and **does not have a confirmed published V16.8 URL**.

Key source study: Ratzlaff et al. (1993), https://pubmed.ncbi.nlm.nih.gov/8470468/ ; Deuel et al. (1994), https://beva.onlinelibrary.wiley.com/doi/10.1111/j.2042-3306.1994.tb04869.x .
