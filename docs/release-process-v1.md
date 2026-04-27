# Release process — v0.x (V1 client)

Audience: maintainer (currently sole — Гулян / Gulyan Digital).
Scope: how to cut and publish a public release of Streetlifting OS during the
V1 sprint phase (0.1.0 → 0.x.y). After 1.0.0 GA this document gets revised.

---

## 0. SemVer policy

| Version line | Meaning |
|---|---|
| `0.X.0` | Sprint completion (Sprint 1 = 0.1.0, Sprint 2 = 0.2.0, …) |
| `0.X.Y` (Y > 0) | Patch — bug fixes, no new sprint scope |
| `1.0.0` | V1 General Availability |
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
      npx serve dist  # spot-check the offline manifest
      ```
- [ ] **No uncommitted changes** in `git status`.

---

## 2. Tagging and pushing

```sh
git tag -a v0.X.Y -m "Streetlifting OS v0.X.Y"
git push origin main
git push origin v0.X.Y
```

The `v*.*.*` tag triggers `.github/workflows/release.yml` (Windows + macOS
universal + Linux matrix). Each runner produces its bundle artefacts and
uploads them to a draft GitHub Release named `Streetlifting OS v0.X.Y`.

Build time ≈ 15–25 min wall-clock on free GitHub-hosted runners.

---

## 3. Post-build verification

When the workflow finishes:

1. Open the **Releases** page → the new draft.
2. Confirm the asset list contains:
   - `Streetlifting OS_0.X.Y_x64-setup.exe` — NSIS installer
   - `Streetlifting OS_0.X.Y_x64_en-US.msi` — MSI installer
   - `Streetlifting OS_0.X.Y_universal.dmg` — macOS universal
   - `Streetlifting OS_0.X.Y_amd64.AppImage` — Linux portable
   - `streetlifting-os_0.X.Y_amd64.deb` — Debian/Ubuntu
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
- [ ] Bump `app/package.json` → `0.X.(Y+1)-dev` on `main` (optional —
      tracking only).

---

## 5. Code-signing — current state and roadmap

**v0.x ships unsigned binaries.** Users have to bypass SmartScreen / Gatekeeper
manually (see `docs/installation-v1.md`). Real signing is deferred until the
project earns enough revenue to justify the certificate cost.

### 5.1 Windows — EV code-signing certificate

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

### 5.2 macOS — Apple Developer ID

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

### 5.3 Linux — GPG signature for DEB / AppImage

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

## 6. Auto-updater — deferred to 0.2.0

V0.1.0 does **not** wire `tauri-plugin-updater`. Reasons:

1. Updater requires an Ed25519 keypair (`tauri signer generate`) — can't
   generate without Rust tooling on the maintainer's machine yet.
2. No update server exists (V2 backend territory — D31).

When 0.2.0 lands and Rust is installed locally:

```sh
cd app/src-tauri
cargo install tauri-cli --version "^2.1"
cargo tauri signer generate -w ../../../tauri-private-key.txt
# → prints a public key to stdout. Copy it into tauri.conf.json:
#   "plugins": { "updater": { "endpoints": [...], "pubkey": "<paste>" } }
# Add tauri-plugin-updater = "2.0" to Cargo.toml.
# Register in lib.rs: .plugin(tauri_plugin_updater::Builder::new().build())
# In TS: import { check } from "@tauri-apps/plugin-updater"; check().catch(() => {});
# Set GH Actions secret TAURI_SIGNING_PRIVATE_KEY = contents of the file
# (base64 not required — Tauri reads it raw).
# NEVER commit tauri-private-key.txt — it's already in .gitignore.
```

Endpoint URL placeholder: `https://updates.streetlifting.app/{{target}}/{{current_version}}`.
Real backend behind it = V2 work (D31).

---

## 7. Troubleshooting CI builds

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

`tauri.conf.json` → `bundle.windows.nsis.installMode` must be `"perUser"`.
The MSI target itself ignores this (MSIs are per-machine by Windows
convention) — direct users to `Streetlifting OS_X.Y.Z_x64-setup.exe` (NSIS)
when they don't have admin rights.

### `tauri-action` can't find icons

Run `npm run icons:generate` BEFORE `tauri-action` in the workflow.
On macOS runners also run `npx @tauri-apps/cli icon ../docs/brand/logo-placeholder.svg`
to generate a real `.icns` (sharp can only fake one).

---

## 8. Manual hot-fix release

For an urgent patch when `main` already contains unrelated WIP:

```sh
git checkout v0.X.0
git checkout -b hotfix/0.X.1
# … fix …
git tag v0.X.1
git push origin hotfix/0.X.1
git push origin v0.X.1
```

The release workflow is keyed on tags, not branches — tagging the hotfix
branch produces a release as normal. Then merge the hotfix back into `main`.

---

## 9. Rollback

GitHub Releases can be unpublished but not un-shipped — once a binary is
downloaded by even one user it exists in the wild. **Don't release if you're
not sure.** If a critical regression slips through:

1. Edit the release on GitHub → mark as "pre-release" so it stops being the
   "latest" link.
2. Add a "⚠ KNOWN BUG — use v0.X.(Y-1)" warning at the top of the release notes.
3. Cut a hotfix release per §8 ASAP.
4. Never delete a release outright; users may have bookmarked it.
