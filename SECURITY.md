# Security Policy

## Reporting a vulnerability

**Do not file a public GitHub issue for security reports.** The repository is
private; even so, public issues invite ad-hoc disclosure that we cannot stage.

Instead, report security issues privately via either:

1. **GitHub Security Advisories** — go to the repository's Security tab and
   submit a draft advisory. This is the preferred channel because it lets us
   coordinate a fix and a coordinated disclosure date with you.
2. **Email** the maintainer at the address in the `git log --pretty=format:%ae`
   of recent commits, with subject prefix `[SECURITY] streetlifting-os` and
   PGP encryption if your finding includes a working exploit. PGP key
   fingerprint is published on request.

Please include:

- a description of the issue and its impact;
- a minimal reproduction (steps, save-file fixture if relevant, screenshots);
- the version affected (`releaseVersion` from any save-file, or the GitHub
  Release tag, or the commit SHA if running from source);
- the operating system and Tauri/PWA mode;
- whether you intend to publish your findings, and on what timeline.

## What's in scope

- The Streetlifting OS desktop app (Tauri 2 build) on Windows / macOS / Linux
- The Streetlifting OS browser PWA when deployed
- The save-file format (`stateVersion: "2"` and forward-compatible variants)
- The build pipeline in `.github/workflows/`
- Any code that reads, validates, or migrates user-supplied JSON or CSV

## What's out of scope

- The closed-source third-party reference material kept locally
  (`_research/`, `Power Gage/`, `PowerTable/`) — those are not part of the
  product.
- Findings that require physical access to a meet-day operator's laptop or
  social engineering of the operator.
- Issues in dependencies that are already disclosed upstream and have a fix
  available; we will pick those up via Dependabot when GitHub Pro lights up.
- DoS via crafted very-large save-files (the operator picks files manually;
  we treat resource exhaustion of a single client as a usability issue).
- "Findings" that are essentially feature requests.

## Coordinated disclosure expectations

- We will acknowledge the report within **5 business days**.
- We will share a remediation plan and target release within **15 business
  days**.
- We will request **30 days** to ship a fixed release before any public
  disclosure on the reporter's side. For high-severity issues affecting
  meet-day workflow we may negotiate longer.
- We do not currently run a paid bounty program. Acknowledgement in the
  release notes (with the reporter's preferred attribution) is the standard
  thank-you. A negotiated bounty may be possible for severe findings; ask.

## Hardening posture (current state)

- Repository is private; sole admin is the project owner; zero collaborators
  and zero forks at the time of this writing.
- No plaintext secrets in git history (verified 2026-04-28 via full-history
  pattern scan against PAT, AWS, OpenAI, RSA-private-key, and similar
  patterns).
- All workflows declare an explicit `permissions:` block at the workflow
  level; the default token scope is `contents: read` and only escalates
  per-job (`release.yml` needs `contents: write` to attach release assets).
- Save-files are zod-validated on decode and refuse unknown shapes.
- Code-signing of desktop binaries is deferred until a legal entity is in
  place; in the meantime, binaries are unsigned, and the v0.x release notes
  surface the per-OS "open anyway" flow.
- Auto-updater is deferred until an Ed25519 keypair is generated and a hosted
  endpoint exists.

## Out-of-band

If GitHub itself is unreachable or compromised, expect a fallback channel
announcement on the maintainer's GitHub profile bio when service resumes.
