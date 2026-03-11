# s3man

Cross-platform S3 desktop manager built with Tauri + React + TypeScript.

## Build

```bash
npm install
npm run dist
```

The bundle output is written to `src-tauri/target/release/bundle`.

## Distribution targets

This project is configured for:

- Windows: `msi`, `nsis`
- macOS: `app`, `dmg`
- Linux: `deb`, `rpm` (plus optional `appimage`)

Commands:

```bash
npm run dist:linux
npm run dist:linux:all
npm run dist:mac
npm run dist:windows
```

## Linux channels

### Ubuntu/Debian (.deb)

- Build with `npm run dist:linux`
- Artifact path: `src-tauri/target/release/bundle/deb`

### Fedora (.rpm)

- Build with `npm run dist:linux`
- Artifact path: `src-tauri/target/release/bundle/rpm`

### AUR

Generate a `PKGBUILD` + install hook from built Debian artifacts:

```bash
RELEASE_BASE_URL="https://github.com/<owner>/<repo>/releases/download/v0.1.0" npm run dist:aur
```

Generated files:

- `dist/aur/PKGBUILD`
- `dist/aur/s3man.install`

After generation, run `makepkg --printsrcinfo > .SRCINFO` in your AUR repo and push.

## Notes on signing

- macOS signing/notarization: configure Apple signing env vars and identities for release builds.
- Windows signing: configure certificate/signing command in Tauri bundle settings for SmartScreen trust.
- Linux signing: RPM signing can be configured through `TAURI_SIGNING_RPM_KEY` env vars.

## GitHub releases

Automated release workflow: `.github/workflows/release.yml`.

- Trigger: push a tag like `v0.1.0`
- Builds and uploads:
  - Linux: `.deb`, `.rpm`
  - Windows: `.msi`, `.nsis`
  - macOS: `.app`, `.dmg` (arm64 and x64 targets)
- Generates and attaches `dist/aur/PKGBUILD` and `dist/aur/s3man.install` to the same GitHub Release

Create and push a release tag:

```bash
git tag v0.1.0
git push origin v0.1.0
```

Recommended repository secrets for signed release builds:

- Apple: `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY`, `APPLE_ID`, `APPLE_PASSWORD`, `APPLE_TEAM_ID`, `APPLE_API_ISSUER`, `APPLE_API_KEY`, `APPLE_API_KEY_PATH`
- Windows: `WINDOWS_CERTIFICATE`, `WINDOWS_CERTIFICATE_PASSWORD`
- Linux RPM: `TAURI_SIGNING_RPM_KEY`, `TAURI_SIGNING_RPM_KEY_PASSPHRASE`
