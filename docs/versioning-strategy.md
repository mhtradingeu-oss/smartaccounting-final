# Versioning & Release Governance

## Tagging strategy
- Follow **Semantic Versioning (SemVer)**. Use `git tag -a vMAJOR.MINOR.PATCH -m "Release vMAJOR.MINOR.PATCH"` so the version is self-documenting and can be referenced by auditors.
- When the release is promoted to production, add a secondary tag such as `v1.0.0-production` to indicate the immutable deployment candidate.
- Keep `package.json` in sync with the latest release version so `APP_VERSION` and the Docker image share the same reference point.
- Document release notes and GoBD compliance checks under the same tag before deployment to ensure traceability.

## Build metadata injection
- The backend Docker build now accepts `BUILD_COMMIT_SHA`, `BUILD_TIMESTAMP`, and `BUILD_IMAGE_DIGEST` via build args (see `docker-compose.prod.yml` and `backend/Dockerfile`).
- These values populate `src/config/buildMetadata.js`, which exposes `packageVersion`, `commitHash`, `buildTimestamp`, `imageDigest`, `nodeVersion`, and `environment`.
- During CI/CD, inject the values with commands like `docker build --build-arg BUILD_COMMIT_SHA=$(git rev-parse --short HEAD) --build-arg BUILD_TIMESTAMP=$(date -u +%Y%m%dT%H%M%SZ)`.
- Keep backup copies of the built image digest; the same digest is used to prove immutability (see `docs/docker-immutability.md`).

## Runtime version endpoint
- `/api/system/version` is a read-only endpoint that now returns the injected metadata payload above.
- This endpoint can be polled by production monitors and auditors to verify that the running binaries came from the tagged release.
- The endpoint does not mutate any data and does not require authentication, keeping it safe for compliance probes.

## Release sign-off criteria
1. All automated tests pass and lint results are clean.
2. Docker image is tagged with the SemVer release and its digest is recorded for audits.
3. Build metadata endpoint returns the matching commit hash, timestamp, and image digest associated with the tag.
4. Documentation (this repository + production docs) references the release tag so auditors can trace the build artifacts back to source control.
