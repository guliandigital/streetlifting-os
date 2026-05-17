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
- fetch public meet pages and all discovered public `wt?nom=...&dsp=...`
  working-protocol discipline tabs for the first 25 discovered events;
- fetch public XHR reference endpoints behind the PowerTable pages:
  `norm_in`, `rec_in`, `rating_in`, `rating_coach_in`;
- write raw HTML plus parsed table JSON/CSV;
- write parsed competitions, result rows, attempts, athlete mentions, norms,
  records, athlete ratings, and coach ratings.

To collect a specific federation:

```powershell
npm run powertable:migrate -- --fed 0010 --limit-meets 100
```

To collect all discovered meet details:

```powershell
npm run powertable:migrate -- --fed 0010 --all-meets
```

If disk space is tight, keep only structured outputs and skip raw HTML copies:

```powershell
npm run powertable:migrate -- --fed 0010 --all-meets --no-raw
```

To include every public regional record endpoint as well:

```powershell
npm run powertable:migrate -- --fed 0010 --all-meets --include-regional-records
```

To include per-year/per-regional-federation rating breakdowns, add
`--rating-breakdowns`. The default only collects all-time/all-federations
ratings to keep the public run bounded.

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
- `fed-<code>-public-api-catalog.json` - discovered public PowerTable pages,
  select filters, XHR endpoint URLs, and row counts.
- `fed-<code>-public-references.json` - parsed public norms, records, athlete
  ratings, and coach ratings.
- `powertable-public-competitions.csv/json` - competition metadata parsed from
  public `sorev?nom=...` pages.
- `powertable-public-results.csv/json` - parsed result rows from all fetched
  public `wt?nom=...&dsp=...` discipline tabs.
- `powertable-public-attempts.csv/json` - parsed attempt rows derived from
  public working protocols.
- `meets/<id>/wt-tables.csv` - parsed public working protocol tables.
- `meets/<id>/discipline-links.json` - public discipline tabs discovered on
  the working protocol page.
- `meets/<id>/discipline-results.csv/json` - parsed per-meet result rows.
- `meets/<id>/attempts.csv/json` - parsed per-meet attempts.
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
- `powertable-public-results.csv`: all public discipline-tab result rows from
  fetched working protocols.
- `powertable-public-attempts.csv`: parsed attempt rows from the public
  protocol markup.
- `fed-0010-public-references.json`: public norms, global/country records,
  all-time athlete ratings, and all-time coach ratings.

## Limits

- Public endpoints do not expose the full athlete catalog, judge catalog, or all
  private federation fields.
- Judge catalog extraction requires authenticated data or a PowerTable export
  generated inside the client.
- Per-attempt judge votes are visible only on individual public `noms?nom=...`
  pages; the default collector does not fetch thousands of participant detail
  pages to avoid excessive load.
- The public working protocol is an HTML view, so athlete row mapping is
  best-effort. For production migration, prefer authenticated
  `nomination?...&json=true`/CSV exports.
