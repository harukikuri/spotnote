---
name: release
description: Release a new version of spotnote and spotnote-mcp to npm. Bumps both package.json versions, waits for CI and Test on main, pushes the tag, and checks the release workflow and npm. Use when the user asks to release, publish or cut a new version.
---

# Release

The tag does the publishing: `.github/workflows/release.yml` runs CI and Test,
then publishes both packages (trusted publishing, with provenance) and creates
the GitHub release. See "Release" in DEVELOPMENT.md.

## 1. Check the starting point

1. `git status`: on `main`, nothing uncommitted. If there are changes, ask
   whether to commit them first; don't release around them.
2. `git fetch && git status`: up to date with `origin/main`.
3. `git log --oneline $(git describe --tags --abbrev=0)..HEAD`: there are
   commits since the last tag. None? Stop: nothing to release.

## 2. Pick the version

While on 0.x, bump the patch (`0.1.5` → `0.1.6`) unless the user names a
version. Both packages always get the same one.

## 3. Bump, commit, push

1. Set `"version"` in `package/package.json` and `mcp/package.json`.
2. `pnpm lint && pnpm test`.
3. Commit as `release: vX.Y.Z` (just the two files), and push `main`.

## 4. Wait for main to pass

Wait for the `Test` and `CI` runs of that commit, and check both succeeded:

```bash
gh run list --branch main --limit 4 --json name,status,conclusion,headSha
gh run watch <id> --exit-status
```

A run cancelled by a newer push doesn't count: wait for the release commit's own.
If one fails, stop and show the failure; don't tag.

## 5. Tag

```bash
git tag vX.Y.Z && git push origin vX.Y.Z
```

Then watch the `Release` run (`gh run list --workflow release.yml --limit 1`).
Its `release` job runs after `ci` and `test` pass.

## 6. Check it's out

1. The publish step's log shows `+ spotnote@X.Y.Z` and `+ spotnote-mcp@X.Y.Z`.
2. `gh release view vX.Y.Z --json url`: the GitHub release exists.
3. `npm view spotnote version`: npm can take a few minutes to show it. If it
   still shows the old version, say so; the publish log is the proof.

Report the version, the GitHub release URL, and what's in it (the `feat:` and
`fix:` commits since the last tag).
