# PowerGage Analysis Playbook

Date: 2026-04-25

Purpose:
- inspect PowerGage as a black-box product
- understand whether it is useful as a workflow and UX reference for the future ISF meet client
- capture install footprint, local storage, exported artifacts, and runtime behavior without polluting the main workstation

Scope:
- `C:\PROJECTS\streetlifting-os\PG_Free.zip`
- `PowerGage28cli.exe`
- `PowerGage28srv.exe`
- `powergage_2801.051.exe`

Current known facts:
- the archive contains only Windows executables
- all binaries are `x86 PE32`
- binaries contain `Nullsoft Install System v3.10` markers
- no source code or explicit data files are present in the archive

## 1. Goal

Answer the following questions:

1. What exactly gets installed?
2. Is PowerGage a single-user local app, a client/server package, or both?
3. Where does it store competition data?
4. Does it use files, local database, service, or local network communication?
5. What are its practical meet-day screens and workflows?
6. Which features are worth copying as UX ideas, and which should be avoided?

## 2. Safety requirements

Do not install PowerGage directly on the main working system.

Use one of:
- Windows Sandbox
- disposable local VM
- isolated test PC

Preferred:
- Windows Sandbox for first-pass inspection
- VM for deeper persistence and reboot testing

## 3. Analysis strategy

Split the work into two phases.

### Phase A. Static analysis

Already partially done:
- inspect archive contents
- identify binary type
- identify installer markers

Additional optional static work:
- unpack NSIS payload if tooling is available
- inspect strings and embedded resources
- compute hashes for all executables

Expected outcome:
- high-level product shape
- candidate install targets

### Phase B. Isolated runtime analysis

Perform inside Sandbox or VM:
- install product
- capture installed file tree
- capture services, tasks, firewall rules, uninstall entries
- launch app and inspect workflows
- create a test meet
- save/export data
- inspect produced files

Expected outcome:
- real runtime model
- evidence-based UX reference set

## 4. Required artifacts

The analysis session should produce:

- pre-install inventory
- post-install inventory
- screenshots of main screens
- list of file extensions created by PowerGage
- exported sample meet files
- notes on workflow:
  - meet setup
  - registration
  - weigh-in
  - judging
  - results
  - exports
- notes on architecture clues:
  - local DB or file storage
  - separate client/server processes
  - localhost sockets or services

## 5. Prepared local tooling

Prepared script:
- [collect-powergage-inventory.ps1](C:/PROJECTS/streetlifting-os/scripts/powergage/collect-powergage-inventory.ps1)

Optional Windows Sandbox template:
- [powergage-analysis-template.wsb](C:/PROJECTS/streetlifting-os/sandbox/powergage-analysis-template.wsb)

## 6. Recommended sandbox procedure

### Step 1. Start isolated environment

Open Windows Sandbox or clean VM.

### Step 2. Make project folder available

Inside sandbox/VM, ensure these are accessible:
- `PG_Free.zip`
- `scripts/powergage/collect-powergage-inventory.ps1`

### Step 3. Capture pre-install snapshot

Run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\powergage\collect-powergage-inventory.ps1 -Phase pre
```

### Step 4. Install PowerGage

Try in this order:

1. `powergage_2801.051.exe`
2. if needed, inspect whether `PowerGage28cli.exe` and `PowerGage28srv.exe` are launchers or separate packages

Capture:
- install directory
- whether admin rights are required
- whether service is installed
- whether reboot is requested

### Step 5. Capture post-install snapshot

Run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\powergage\collect-powergage-inventory.ps1 -Phase post
```

### Step 6. Functional walkthrough

Open the application and document:

1. main menu / home screen
2. meet creation
3. registration workflow
4. weigh-in workflow
5. judging screen
6. results screen
7. export menu

For each screen capture:
- screenshot
- major actions
- notable shortcuts or operational patterns

### Step 7. Data file analysis

Create a small dummy meet and export/save it.

Capture:
- file extension
- file size
- whether it is plain text, XML, JSON, binary, or DB-backed
- whether multiple related files are generated

### Step 8. Runtime architecture clues

Capture:
- running processes
- listening ports
- local services
- files created under:
  - `Program Files`
  - `ProgramData`
  - `%AppData%`
  - `%LocalAppData%`
  - `%Public%`
  - user Documents/Desktop

## 7. What to evaluate in the product

Evaluate PowerGage on these dimensions:

### 7.1 Workflow quality

- how many clicks to move from registration to judging
- how easy it is to correct weigh-in errors
- how visible the current athlete and next athlete are
- how quickly the scorekeeper can operate under pressure

### 7.2 Domain coverage

- which competition formats it supports
- whether it supports multi-platform events
- whether it has separate client/server roles
- how exports are structured

### 7.3 UX ideas worth reusing

Potential examples:
- layout of the judging screen
- grouping and filtering logic
- keyboard-driven workflow
- printer-friendly output
- offline save/load behavior

### 7.4 Things not to copy blindly

- hidden stateful behavior
- unclear save formats
- proprietary binary storage
- Windows-only assumptions
- client/server complexity if not justified

## 8. Decision criteria after analysis

After the sandbox session, decide whether PowerGage should influence:

- only UI layout
- UI plus workflow
- workflow plus local architecture
- export model

Recommended default:
- use it as a UX reference only until evidence shows a better architectural idea than the OpenLifter-style local-first model

## 9. Expected outputs for this project

After the first isolated PowerGage session, add:

1. `docs/powergage-findings-v1.md`
2. screenshots folder
3. sample exported files folder
4. concise comparison table:
   - OpenLifter
   - PowerGage
   - Target ISF Meet Client

## 10. Key caution

PowerGage is currently a black-box proprietary reference.

Until its runtime storage and export model are inspected:
- do not base the ISF client architecture on assumptions about PowerGage
- do not infer internal data model from UI alone
- do not assume `cli/srv` names correspond exactly to deployable roles
