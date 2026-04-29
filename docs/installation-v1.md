# Streetlifting OS — Installation guide (v0.1.x)

For: federation secretaries, head judges, organisers.
Languages: this guide is in English; Russian translation lives next to it
(coming v0.2.0). The application UI itself is fully bilingual ru-RU / en-US.

> **What you're installing:** an offline-first desktop application for
> running ISF Streetlifting and weighted-calisthenics competitions on
> tournament day. No internet required after install.

---

## TL;DR — Pick your platform

| Your computer | Download from <https://github.com/GulianDigital/streetlifting-os/releases/latest> | Section below |
|---|---|---|
| Windows 10 / 11 — admin rights | `Streetlifting OS_0.1.0_x64_en-US.msi` | [Windows](#windows) |
| Windows — no admin rights | `Streetlifting OS_0.1.0_x64-setup.exe` (NSIS, per-user) | [Windows](#windows) |
| macOS 10.13+ (Intel or Apple Silicon) | `Streetlifting OS_0.1.0_universal.dmg` | [macOS](#macos) |
| Ubuntu / Debian 22.04+ | `streetlifting-os_0.1.0_amd64.deb` | [Linux — DEB](#linux--deb-ubuntu--debian) |
| Other Linux | `Streetlifting OS_0.1.0_amd64.AppImage` | [Linux — AppImage](#linux--appimage-any-distro) |
| No install access (computer is locked down) | run in a browser instead | [Browser PWA](#browser-pwa-no-install) |

> **Heads-up: binaries are unsigned in v0.1.x.** That means Windows and
> macOS will warn you the developer is unverified. This is normal for an
> open-source project pre-revenue — see the per-OS sections below for the
> two-click bypass. Code-signing is on the roadmap for v1.0.0.

---

## Windows

### Option A — MSI (admin rights, machine-wide install)

1. Download `Streetlifting OS_0.1.0_x64_en-US.msi`.
2. Double-click. Windows SmartScreen will say
   **"Windows protected your PC"** with a Run / Don't run dialog.
3. Click the small **More info** link in the dialog.
4. A new **Run anyway** button appears — click it.
5. Step through the installer. Default install path:
   `C:\Program Files\Streetlifting OS\`.
6. Launch from Start menu → "Streetlifting OS".

### Option B — NSIS installer (no admin rights)

1. Download `Streetlifting OS_0.1.0_x64-setup.exe`.
2. SmartScreen flow same as above (More info → Run anyway).
3. Installs to `%LOCALAPPDATA%\Streetlifting OS\` — no admin password needed.
4. Launch from Start menu.

### Where save-files live

By default, the **Save** dialog suggests
`%APPDATA%\Streetlifting OS\meets\<meet-name>.json` —
e.g.
`C:\Users\YOU\AppData\Roaming\Streetlifting OS\meets\moscow-open-2026.json`.
You can save anywhere though — Documents, USB stick, Dropbox folder.

### Uninstall

Settings → Apps → Streetlifting OS → Uninstall. Save-files in `%APPDATA%`
are **not** deleted automatically — back them up first if you care.

---

## macOS

### Install

1. Download `Streetlifting OS_0.1.0_universal.dmg` (works on both Intel
   and Apple Silicon Macs).
2. Double-click the DMG to mount it.
3. Drag **Streetlifting OS** to the **Applications** folder.
4. Eject the DMG.

### First launch — Gatekeeper bypass

The first time you double-click the app, Gatekeeper says
**"'Streetlifting OS' cannot be opened because it is from an unidentified
developer"**. Workaround:

1. Right-click (or Ctrl-click) **Streetlifting OS** in `/Applications`.
2. Choose **Open** from the context menu.
3. A new dialog appears with an **Open** button (instead of just "Cancel").
4. Click **Open**. macOS remembers this — subsequent launches work as normal.

If the right-click trick doesn't show an Open option (newer macOS versions):
**System Settings → Privacy & Security → scroll down → "Streetlifting OS
was blocked from use because it is not from an identified developer" →
Open Anyway**.

### Where save-files live

Default Save-As suggestion:
`~/Library/Application Support/Streetlifting OS/meets/<meet-name>.json`.

Open it from Finder via **Go → Go to Folder…** (`⇧⌘G`) and paste the path —
`~/Library` is hidden by default.

---

## Linux — DEB (Ubuntu / Debian)

```sh
wget https://github.com/GulianDigital/streetlifting-os/releases/download/v0.1.0/streetlifting-os_0.1.0_amd64.deb
sudo apt install ./streetlifting-os_0.1.0_amd64.deb
```

Apt resolves dependencies automatically (`libwebkit2gtk-4.1-0`, `libgtk-3-0`,
`libayatana-appindicator3-1`).

Launch from your application menu or:

```sh
streetlifting-os
```

Save-files default to:
`~/.local/share/Streetlifting OS/meets/<meet-name>.json`.

Uninstall: `sudo apt remove streetlifting-os`.

---

## Linux — AppImage (any distro)

Portable, no install:

```sh
wget https://github.com/GulianDigital/streetlifting-os/releases/download/v0.1.0/Streetlifting%20OS_0.1.0_amd64.AppImage
chmod +x "Streetlifting OS_0.1.0_amd64.AppImage"
./"Streetlifting OS_0.1.0_amd64.AppImage"
```

You'll need WebKit2GTK installed system-wide; on a fresh distro:

```sh
# Debian / Ubuntu
sudo apt install libwebkit2gtk-4.1-0 libgtk-3-0 libayatana-appindicator3-1

# Fedora
sudo dnf install webkit2gtk4.1 gtk3 libayatana-appindicator-gtk3

# Arch
sudo pacman -S webkit2gtk-4.1 gtk3 libayatana-appindicator
```

Save-files default to `~/.local/share/Streetlifting OS/meets/`.

---

## Browser PWA (no install)

If you can't install software (locked-down work laptop, kiosk mode, etc.):

1. Open <https://streetlifting.app/> in
   **Chrome / Edge / Firefox** (Yandex.Browser blocks `localhost` via
   Protect; the hosted PWA works fine in all major browsers).
2. (Optional) Install as a PWA — in Chrome, an install prompt appears in
   the address bar; in Edge, **menu → Apps → Install this site as an app**.
3. Save-files: when you click **Save**, the browser downloads a `.json` file
   to your **Downloads** folder. To load, click **Load** and pick the file.
4. Once loaded the first time, the PWA caches itself in the browser's
   Service-Worker storage — it then runs **fully offline**, even if the
   network is unplugged. Browser PWA is designed exactly for tournament-day
   reliability when you don't trust the venue's WiFi.

---

## Verifying you got the right file

We don't yet publish detached signatures (deferred — see
`docs/release-process-v1.md` §5). For now:

1. The download URL must start with
   `https://github.com/GulianDigital/streetlifting-os/releases/`.
2. The asset must be listed under the **official release page** (not a fork).
3. Compare the SHA-256 hash printed on the release notes
   (will be added starting v0.2.0).

If anything doesn't match, **don't run the file**. Open an issue at
<https://github.com/GulianDigital/streetlifting-os/issues>.

---

## Troubleshooting

### "Windows cannot find …" on launch
SmartScreen sometimes silently quarantines the EXE. Check
**Settings → Update & Security → Windows Security → Virus & Threat
Protection → Protection History**. Restore from quarantine if listed.

### macOS "App is damaged and can't be opened"
Run once in Terminal:
```sh
xattr -dr com.apple.quarantine /Applications/Streetlifting\ OS.app
```
This removes the quarantine flag macOS adds to anything downloaded from the
internet.

### Linux: AppImage refuses to run
Most likely missing FUSE. Install:
```sh
sudo apt install libfuse2
```

### App opens but every save-file says "permission denied"
Likely your antivirus is sandboxing the install directory. Add an
exception for `Streetlifting OS` or move save-files to your Documents
folder via the Save dialog.

### Cyrillic looks broken in Excel after CSV export
The export uses UTF-8 with BOM, which Excel reads correctly out of the box.
If it's still broken, open the CSV in **Data → From Text/CSV** instead of
double-click — Excel's drag-drop import sometimes guesses wrong on Windows
locale settings.

---

## Reporting bugs

<https://github.com/GulianDigital/streetlifting-os/issues> — please include:

1. OS + version (e.g. "Windows 11 23H2").
2. Streetlifting OS version (visible in the title bar).
3. Steps to reproduce.
4. The save-file you were working with, if relevant (a `.json` with
   personal data — feel free to redact names before attaching).

---

## What's NOT in v0.1.0

- No judging UI yet — that's Sprint 2 (v0.2.0). For v0.1.0 you do
  registration + weigh-in in Streetlifting OS, and judging on paper or in
  PowerTable / PowerGage as before.
- No multi-federation rule packs (V3 work).
- No backend / billing / online publishing (V2 work).

See [`CHANGELOG.md`](../CHANGELOG.md) for the full feature list.
