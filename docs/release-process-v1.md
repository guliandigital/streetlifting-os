# Release process — V1.x client

Audience: maintainer (currently sole — Гулян / Gulyan Digital).
Scope: how to cut and publish a public release of Streetlifting OS during the
V1.x production-hardening phase. This covers GitHub Releases, Tauri updater
artifacts, Ed25519 updater signing, and deferred OS code-signing.

---

## 0. SemVer policy

| Version line | Meaning |
|---|---|
| `1.0.0` | V1 General Availability |
| `1.X.Y` | V1.x hardening — release, signing, UAT, packaging fixes |
| `2.0.0` | V2 launch (backend, RulesPack, multi-federation) |

Save-file `stateVersion` is independent of the app version. V1 ships
`stateVersion: "2"`; bumping it requires a migration in
`src/persistence/migrations/`.

---

## 1. Pre-release checklist

Before tagging, all of the following must be true:

- [ ] **Versions are in sync** in:
  - `app/package.json` → `"version"`
  - `app/src-tauri/Cargo.toml` → `[package] version`
  - `app/src-tauri/tauri.conf.json` → `"version"`
- [ ] **`CHANGELOG.md` updated** — new section under `## [X.Y.Z] — YYYY-MM-DD`.
- [ ] **`docs/installation-v1.md` reviewed** if installer behaviour changed.
- [ ] **Updater config validates**:
      ```sh
      cd app
      npm run release:validate-updater
      ```
- [ ] **All tests green** locally:
      ```sh
      cd app
      npm run typecheck
      npm run test -- --run
      npm run lint
      npm run build
      ```
- [ ] **Local desktop smoke-test** passed (Windows host):
      ```sh
      cd app
      npm run icons:generate
      npm run tauri:build
      # Run the produced MSI from src-tauri/target/release/bundle/msi/
      # — check window opens, save dialog opens, save-file roundtrips.
      ```
- [ ] **Save-file roundtrip verified**: create a meet → add 5 athletes →
      weigh-in → save → close app → reopen app → load same file → all data
      identical (categories, multipliers, lot order, dates).
- [ ] **CSV roundtrip verified** in Excel: Cyrillic-named athletes export
      and re-import cleanly (UTF-8 BOM works).
- [ ] **PWA build still works**:
      ```sh
      cd app
      VITE_PUBLIC_BASE=/streetlifting-os/ npm run build
      VITE_PUBLIC_BASE=/streetlifting-os/ npm run pwa:validate
      npx serve dist  # spot-check the offline manifest
      ```
- [ ] **No unrelated uncommitted changes** in `git status`.
- [ ] **Release secrets are present** in GitHub repository settings:
  - required now: `TAURI_SIGNING_PRIVATE_KEY`;
  - optional now: `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` if the key is password-protected;
  - deferred until OS signing: Apple / Windows / Linux signing secrets in §5.

---

## 2. Tagging and pushing

```sh
git tag -a v1.X.Y -m "Streetlifting OS v1.X.Y"
git push origin main
git push origin v1.X.Y
```

The `v*.*.*` tag triggers `.github/workflows/release.yml` (Windows + macOS
universal + Linux matrix). Each runner produces its bundle artefacts and
uploads them to a draft GitHub Release named `Streetlifting OS v1.X.Y`.

Build time ≈ 15–25 min wall-clock on free GitHub-hosted runners.

---

## 3. Post-build verification

When the workflow finishes:

1. Open the **Releases** page → the new draft.
2. Confirm the asset list contains:
   - `Streetlifting OS_1.X.Y_x64-setup.exe` — NSIS installer
   - `Streetlifting OS_1.X.Y_x64_en-US.msi` — MSI installer
   - `Streetlifting OS_1.X.Y_universal.dmg` — macOS universal
   - `Streetlifting OS_1.X.Y_amd64.AppImage` — Linux portable
   - `streetlifting-os_1.X.Y_amd64.deb` — Debian/Ubuntu
   - `latest.json` — Tauri updater manifest
   - `.sig` files for updater-capable bundles
3. Download at least the Windows MSI and verify it installs cleanly on a
   fresh Windows VM (or a colleague's machine).
4. If you have macOS / Linux access, smoke-test those bundles too.
5. Edit the release notes — copy the relevant `## [X.Y.Z]` section from
   `CHANGELOG.md` into the release body.
6. **Publish** the release (un-check "Save as draft").

---

## 4. After publishing

- [ ] Update `app/README.md` if the install instructions changed.
- [ ] Announce in the maintainers' channel (Telegram).
- [ ] Open issues for any regressions found during smoke-tests.
- [ ] Bump `app/package.json` → `1.X.(Y+1)-dev` on `main` (optional —
      tracking only).

---

## 5. Secrets, certificates, and signing state

**Current state in v1.1.1:** Tauri updater artifacts are Ed25519-signed. OS
installers are still unsigned, so users may have to bypass SmartScreen /
Gatekeeper manually (see `docs/installation-v1.md`). Real OS code-signing is
deferred until Windows EV and Apple Developer ID certificates are procured.

### 5.1 Tauri updater — required now

Required GitHub Actions secrets:

- `TAURI_SIGNING_PRIVATE_KEY` — private half of the Tauri/minisign updater
  keypair. Paste the raw key content; do not base64-wrap it unless Tauri's
  tooling changes its input contract.
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` — optional. Set only if the private key
  was generated with a password.

Public material committed to the repo:

- `app/src-tauri/tauri.conf.json` → `plugins.updater.pubkey`.
- `app/src-tauri/tauri.conf.json` → `plugins.updater.endpoints`.

Never commit:

- the private key file;
- `.key`, `.pfx`, `.p12`, `.asc`, `.gpg`, `.pgp`, `.jks`, `.keystore`;
- screenshots or logs containing the private key.

The root `.gitignore` intentionally blocks common private-key and certificate
extensions, including Tauri/minisign private-key filenames.

### 5.2 Windows — EV code-signing certificate

Cost: ~$300–500 / year. Providers: DigiCert, Sectigo (formerly Comodo),
GlobalSign. EV certs come on a USB token; "regular" OV certs are cheaper but
do **not** clear SmartScreen on first install.

When an EV cert is in place:

1. Plug the USB token into a build machine (or USB-over-IP onto a self-hosted
   runner — GitHub-hosted runners cannot accept the token).
2. Switch `release.yml` to a self-hosted Windows runner OR move signing to a
   post-build step that pulls from Azure Key Vault.
3. Set GitHub Actions secrets:
   - `WINDOWS_CERTIFICATE` — base64-encoded `.pfx`
   - `WINDOWS_CERTIFICATE_PASSWORD`
4. Tauri-action picks them up automatically when present
   (the env-vars are pre-wired, currently commented out in `release.yml`).

### 5.3 macOS — Apple Developer ID

Cost: $99 / year. Requires Apple Developer Account. Process:

1. Enrol at <https://developer.apple.com/programs/>.
2. In *Certificates, Identifiers & Profiles*, create a
   **Developer ID Application** certificate. Export as `.p12`.
3. App-specific password: <https://account.apple.com> → Sign-in & Security →
   App-Specific Passwords.
4. Set GitHub Actions secrets:
   - `APPLE_CERTIFICATE` — base64-encoded `.p12`
   - `APPLE_CERTIFICATE_PASSWORD`
   - `APPLE_SIGNING_IDENTITY` — `Developer ID Application: Your Name (TEAMID)`
   - `APPLE_ID` — your Apple ID e-mail
   - `APPLE_PASSWORD` — the app-specific password (NOT your Apple ID password)
   - `APPLE_TEAM_ID`
5. Tauri-action signs + notarises automatically when these are present.
6. First notarisation can take 5–30 min — Apple's queue.

### 5.4 Linux — GPG signature for DEB / AppImage

Free. Generate a key once:

```sh
gpg --full-generate-key
gpg --armor --export your-email@example.com > pubkey.asc
gpg --armor --export-secret-keys your-email@example.com > privkey.asc
```

Set GH Actions secret `LINUX_GPG_PRIVATE_KEY` (base64-encoded `privkey.asc`).
Add a sign step after the Linux build to produce `.deb.sig` / `.AppImage.sig`,
attach them to the release.

Publish the public key in the README and on `streetlifting.app`.

---

## 6. Auto-updater — active in v1.1.1

The updater chain is active:

- `app/src-tauri/tauri.conf.json` has `bundle.createUpdaterArtifacts: true`.
- `app/src-tauri/tauri.conf.json` has the Ed25519/minisign public key.
- `app/src-tauri/tauri.conf.json` points at GitHub Releases
  `latest.json`.
- `.github/workflows/release.yml` passes `TAURI_SIGNING_PRIVATE_KEY` and
  `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` to `tauri-action`.
- `app/src-tauri/src/lib.rs` registers `tauri_plugin_updater`.
- `app/package.json` includes `@tauri-apps/plugin-updater`.
- CI runs `npm run release:validate-updater` to catch missing updater config.

The current endpoint is:

```text
https://github.com/GulianDigital/streetlifting-os/releases/latest/download/latest.json
```

This keeps V1 independent of a custom update backend. A future V2 endpoint can
replace it only after a separate production-deploy decision.

### 6.1 Generate or rotate the updater key

Only do this on a maintainer-controlled machine. Key rotation breaks
auto-update for users who installed older versions because they trust the old
public key baked into their app. Those users must reinstall manually.

```sh
cd app/src-tauri
npx @tauri-apps/cli signer generate -w ~/.tauri/streetlifting-os.key
```

Then:

1. Copy only the printed public key into
   `app/src-tauri/tauri.conf.json` → `plugins.updater.pubkey`.
2. Store the private-key file content in the GitHub Actions secret
   `TAURI_SIGNING_PRIVATE_KEY`.
3. If a password was used, store it in
   `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`.
4. Run:
   ```sh
   cd app
   npm run release:validate-updater
   ```
5. Cut a release and verify the draft contains `latest.json` and `.sig`
   artifacts before publishing.

---

## 7. GitHub Pages / production PWA

Current state: GitHub Pages is active again for the now-public repository.
The production PWA URL is:

```text
https://guliandigital.github.io/streetlifting-os/
```

`.github/workflows/pages.yml` deploys automatically on every push to `main`
and can also be run manually with `workflow_dispatch`.

Important constraints:

- GitHub Pages for private repositories requires GitHub Pro / Team /
  Enterprise. On a Free plan, a private repo returns:
  ```text
  422 "Your current plan does not support GitHub Pages for this repository."
  ```
- If the repository is made private again on a Free plan, Pages will stop
  working and the browser PWA must move to an external static host or the
  account must be upgraded.
- The GitHub Pages build must keep `VITE_PUBLIC_BASE=/streetlifting-os/`
  because the project site is served under the repository path.

### 7.1 Provisioning / recovery

If the Pages site is ever deleted, recreate it once while the repository is
public or on a paid plan:

```sh
gh api -X POST repos/GulianDigital/streetlifting-os/pages -f build_type=workflow
```

Then run:

```sh
gh workflow run pages.yml --ref main
```

Verify:

1. The `Deploy PWA to GitHub Pages` workflow finishes successfully.
2. `https://guliandigital.github.io/streetlifting-os/` returns HTTP 200.
3. The app loads nested routes and the PWA manifest/service worker is fetched
   from `/streetlifting-os/`.

The workflow runs `npm run pwa:validate` after build. This gate fails the
deployment before upload if `index.html`, `manifest.webmanifest`, generated
service worker files, app assets, or manifest icons are missing or if the
artifact uses root-relative `/assets/` paths while deploying under
`/streetlifting-os/`.

### 7.2 Private-repo alternative

If the repository must become private again without upgrading GitHub, do not
keep GitHub Pages as the production PWA channel. Move the browser build to an
external static host, such as Cloudflare Pages or the existing
`streetlifting.app` nginx host:

```sh
cd app
npm ci --no-audit --no-fund
npm run icons:generate
VITE_PUBLIC_BASE=/ npm run build
```

Publish `app/dist` to the chosen static host and update README,
`docs/installation-v1.md`, and release notes with the new browser URL.

---

## 8. Troubleshooting CI builds

### Linux build fails on `webkit2gtk`

Symptom: `error: failed to run custom build command for webkit2gtk-sys`.
Fix: ensure all of these are in the `apt-get install` step in `release.yml`:

```
libwebkit2gtk-4.1-dev libssl-dev libgtk-3-dev
libayatana-appindicator3-dev librsvg2-dev patchelf
```

If a new Ubuntu LTS removes `webkit2gtk-4.1`, switch to `webkit2gtk-4.0` and
match Tauri's required version (Tauri 2.x supports both).

### macOS notarisation hangs

Apple's queue can spike to 30 min on busy days. If a build is stuck > 1 h,
log in to <https://appstoreconnect.apple.com> → Notarisation Service →
check status manually.

### Windows MSI demands admin

`tauri.conf.json` → `bundle.windows.nsis.installMode` must be `"currentUser"`.
The MSI target itself ignores this (MSIs are per-machine by Windows
convention) — direct users to `Streetlifting OS_X.Y.Z_x64-setup.exe` (NSIS)
when they don't have admin rights.

### `tauri-action` can't find icons

Run `npm run icons:generate` BEFORE `tauri-action` in the workflow.
On macOS runners also run
`npx @tauri-apps/cli icon <path-to-vector-logo.svg>` when a production vector
logo source is available to generate a real `.icns` (sharp can only fake one).

---

## 9. Manual hot-fix release

For an urgent patch when `main` already contains unrelated WIP:

```sh
git checkout v1.X.0
git checkout -b hotfix/1.X.1
# … fix …
git tag v1.X.1
git push origin hotfix/1.X.1
git push origin v1.X.1
```

The release workflow is keyed on tags, not branches — tagging the hotfix
branch produces a release as normal. Then merge the hotfix back into `main`.

---

## 10. Rollback

GitHub Releases can be unpublished but not un-shipped — once a binary is
downloaded by even one user it exists in the wild. **Don't release if you're
not sure.** If a critical regression slips through:

1. Edit the release on GitHub → mark as "pre-release" so it stops being the
   "latest" link.
2. Add a "KNOWN BUG — use v1.X.(Y-1)" warning at the top of the release notes.
3. Cut a hotfix release per §9 ASAP.
4. Never delete a release outright; users may have bookmarked it.
