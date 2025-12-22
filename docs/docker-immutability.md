# Docker Immutability Notes

## Image content guarantees
1. Build the backend image via `docker build --build-arg BUILD_COMMIT_SHA=$(git rev-parse --short HEAD) ... -t smartaccounting:prod .`.
2. After the build completes, record the image digest with `docker image inspect --format '{{index .RepoDigests 0}}' smartaccounting:prod`. Store the digest in the release artifacts folder so auditors can verify that the running container matches the approved image.
3. Push the image to your registry (`docker push registry/smartaccounting:prod`) and double-check the remote digest matches the recorded one with `docker inspect registry/smartaccounting:prod`.

## Runtime verification
- On any node, run `docker inspect --format '{{.Id}}' smartaccounting:prod` and compare it to the digest recorded for the release.
- After deployment, hit `/api/system/version` to verify the `imageDigest` field matches the digest above, ensuring no tampering occurred after the image left the registry.

## Immutable deployment policy
- Images are immutable once pushed; do not start containers from an image if its digest changes after push.
- If a configuration change is required, rebuild the image and tag it with a new SemVer tag before redeploying.
- Always redeploy by pulling the tagged image (`docker pull registry/smartaccounting:prod`) instead of reusing local images to avoid drift.
