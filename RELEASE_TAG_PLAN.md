# v1.0.0 Release Tag Plan

1. Confirm the working tree is clean and up-to-date with `main` (no outstanding feature branches or WIP commits).
2. Capture the current `client/appVersion.json` (if used) and increment any version metadata to match `v1.0.0` before tagging.
3. Run the release checklist commands (`lint`, `test`, `build` via `npm run ... --prefix client`) to ensure the bundle is stable.
4. Document critical changes and safety checks in the release notes or changelog so the tag references a known state.
5. When ready, create an annotated tag:
   ```
   git tag -a v1.0.0 -m "Release v1.0.0"
   ```
6. Push the tag to the remote once the `main` branch passes CI:
   ```
   git push origin v1.0.0
   ```
7. Do not tag until steps 1–4 are complete; this plan merely records the intended process.
