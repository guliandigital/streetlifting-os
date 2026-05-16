# PowerTable Data Migration

PowerTable is an online 1C-backed service. The local folder under
`PowerTable/` contains the 1C thin client and launcher, not the full database.
The practical extraction path is through PowerTable's public endpoints and, when
available, federation-owned authenticated API endpoints.

## Public Collection

From `app/`:

```powershell
npm run powertable:migrate
```

Default behavior:

- fetch public directories: federations, clubs, cities, change history;
- fetch ISF event list via `all_sorev?fed=0010`;
- fetch public meet pages and working protocols for the first 25 discovered
  events;
- write raw HTML plus parsed table JSON/CSV;
- write `powertable-public-athlete-mentions.csv` from public working protocols.

To collect a specific federation:

```powershell
npm run powertable:migrate -- --fed 0010 --limit-meets 100
```

To collect all discovered meet details:

```powershell
npm run powertable:migrate -- --fed 0010 --all-meets
```

## Authenticated Collection

PowerTable documents these endpoints with a federation `sk` token:

- `nomination?sportsman=true&sk=...` - all federation athletes.
- `nomination?nom=...&json=true&sk=...` - meet nominations.
- `nomination?nom=...&csv=true&code=UTF8&sk=...` - meet nominations CSV.
- `schedule?nom=...&json=true&sk=...` - meet schedule.

Do not hardcode the token. Use an environment variable:

```powershell
$env:POWERTABLE_SK = "..."
npm run powertable:migrate -- --sk $env:POWERTABLE_SK --sportsmen --meet 4093 --auth-meet-data
```

The script redacts `sk` in `manifest.json`, but raw authenticated payloads may
contain PII and are written only under `migration-output/`, which is gitignored.

## Outputs

Default output directory:

```text
migration-output/powertable/
```

Important files:

- `manifest.json` - run status, endpoints, row counts.
- `public-federations.csv` - parsed public federation directory.
- `public-clubs.csv` - parsed public club directory.
- `public-cities.csv` - parsed public city directory.
- `fed-<code>-all_sorev.csv` - parsed public event list for a federation.
- `meets/<id>/wt-tables.csv` - parsed public working protocol tables.
- `powertable-public-athlete-mentions.csv` - best-effort athlete rows recovered
  from public protocols.
- `raw/` and `meets/<id>/raw/` - original HTML.
- `raw-auth/` - authenticated JSON/CSV/text payloads, only when `--sk` is used.

## Verified Public ISF Run

The public ISF collection was verified with:

```powershell
npm run powertable:migrate -- --fed 0010 --all-meets
```

Observed output on 2026-05-17:

- `public-federations.csv`: 77 rows.
- `public-clubs.csv`: 14 rows.
- `public-cities.csv`: 100 rows.
- `fed-0010-all_sorev.csv`: 100 ISF competitions.
- `powertable-public-athlete-mentions.csv`: 750 public athlete rows from
  working protocols.

## Limits

- Public endpoints do not expose the full athlete catalog, judge catalog, or all
  private federation fields.
- Judge catalog extraction requires authenticated data or a PowerTable export
  generated inside the client.
- The public working protocol is an HTML view, so athlete row mapping is
  best-effort. For production migration, prefer authenticated
  `nomination?...&json=true`/CSV exports.
