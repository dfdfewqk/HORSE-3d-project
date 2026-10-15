# HORSE RANCH V9.1 — Original Action audit (staging only)

This branch does **not** replace the live 3D model, edit \`index.html\`, or deploy Pages.

Purpose: assess the **original** Blender \`horse.rig\` four Actions in the GitHub cloud runner, not a synthetic 19-bone rig. At 160 sample phases per gait the audit records native hind limb three-point angle proxies, pelvis positions, and all four hoof-bone tips. These are **NOT measured ground contacts**. The script does not correct motion, save an edited BLEND, or export a GLB.

## One-time original source dependency

The conversation-uploaded native ZIP is not in GitHub. A GitHub runner cannot access files stored only in this chat. To enable cloud processing **once**:

1. In repository **Releases → Draft a new release**, create tag \`horse-original-source\`.
2. Attach the already-owned **Horse Rigged All Gaits(1).zip** (about 84 MB) as a release asset (do not extract it or upload it to the repository tree).
3. Publish the release. The audit checks the exact original BLEND SHA-256 before processing.
4. After this staging workflow is reviewed and merged to the default branch, run **Actions → V9.1 Native Horse Source Audit → Run workflow**. Download the JSON artifact or retrieve it through the connected GitHub app.

The release is **public** if the repo is public. Do not upload private assets without permission. The BlendSwap source is marked CC0, but the horse body is separately credited to Tarnyloo under CC BY; preserve original-model attribution when sharing.

## Gate for future edits

- If source motion is good, solve GLB export/baking first.
- If source is flawed, create a **duplicated** native Gallop Action and correct grounded foot trajectories + IK + pelvis/torso, then test that copy.
- Do not pass the gait based only on bone-tip numerical angles: verify anatomical joint location, actual sole contact, 4-beat footfall and Chrome rendering before publishing to a separate preview URL.
- No runtime animation correction or Pages deployment is performed by this audit.
