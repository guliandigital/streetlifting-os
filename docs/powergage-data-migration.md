# PowerGage Data Migration

This is the local, read-only path for extracting legacy PowerGage data into
Streetlifting OS migration files.

## Why this exists

PowerGage stores operational data in Firebird 2.5 databases. Static installer
files contain the schema clues, but not the actual athlete, judge, federation, or
meet data. The real database is normally under:

```text
%APPDATA%\Power Gage\database\*.fdb
```

The migration script handles the practical cases:

- auto-discover `dblink.ini` and common database locations;
- accept an explicit `--db` path;
- export raw PowerGage tables to CSV/JSON;
- create a best-effort `streetlifting-registration-draft.csv` for the current
  Streetlifting OS registration importer;
- keep local migration payloads out of git via `migration-input/` and
  `migration-output/`.

## Run

From `app/`:

```powershell
npm run powergage:migrate
```

With explicit paths:

```powershell
npm run powergage:migrate -- --db "C:\path\to\database.fdb" --isql "C:\Program Files (x86)\Firebird\Firebird_2_5\bin\isql.exe"
```

If Firebird is installed in the standard location, `--isql` is optional.

For a broader local search:

```powershell
npm run powergage:migrate -- --scan-root "D:\"
```

Use `--deep-scan` only when the machine can tolerate a slow disk walk.

## Outputs

Default output directory:

```text
migration-output/powergage/
```

Expected files:

- `manifest.json` - run status, selected DB, Firebird CLI path, row counts.
- `schema-columns.csv/json` - discovered Firebird user tables and columns.
- `powergage-athletes.csv/json`
- `powergage-competitions.csv/json`
- `powergage-nominations.csv/json`
- `powergage-attempts.csv/json`
- `powergage-teams.csv/json`
- `powergage-ranges.csv/json`
- `powergage-federations.csv/json` if PowerGage DB has a federation table.
- `powergage-extra_*.csv/json` for discovered judge/federation-like tables.
- `streetlifting-registration-draft.csv` - rows mapped with enough confidence for
  current Streetlifting OS registration import.
- `streetlifting-registration-unmapped.csv` - rows that need manual mapping.

## Known limits

- Firebird `.fbk/.gbk` backups must be restored to `.fdb` before querying.
- Judge data is exported only if the real DB contains a judge-like table. Static
  PowerGage files mostly show judge names as report signature placeholders.
- Current Streetlifting OS client does not yet have first-class judge and
  federation catalogs, so those are exported as raw migration files for the V2/V3
  backend/catalog work.
- Discipline mapping is conservative. ISF ranges are mapped when `id_range` and
  attempt columns clearly match the built-in Streetlifting OS discipline catalog;
  other rows are sent to the unmapped CSV.
