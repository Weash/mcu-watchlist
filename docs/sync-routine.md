# The weekly sync

There is no cron trigger on the Worker. The sync is driven by a **scheduled Claude
routine** that calls the app's API once a week.

The split is deliberate:

| Half | Who does it | Why |
| --- | --- | --- |
| Refresh titles and release dates from TMDB; record unrecognised keyword-tagged films | **Code** (`POST /api/sync`) | Fact lookup. Deterministic, and must not be improvised. |
| Decide whether a discovery is really an MCU film, and which phase/saga it belongs to | **The routine** | TMDB has no concept of phases, and keyword 180547 is community-maintained — it picks up making-of specials, documentaries and mistags. |
| Write a one-line description for a newly added film | **The routine** | Style-matching against the whole existing catalogue, not eight sampled examples. |

The routine never touches the database. It only calls the endpoints below, so the
worst a confused run can do is add a film you didn't want — visible in `/admin`,
and undoable.

## Setup

1. Deploy, and set the secrets (see `wrangler.jsonc`). Generate the token with
   `openssl rand -hex 32`:

   ```bash
   npx wrangler secret put SYNC_TOKEN
   ```

2. Create a scheduled routine at [claude.ai](https://claude.ai) — weekly, Sunday
   morning — with the prompt below. Substitute your hostname and token.

If the routine ever stops running, nothing breaks visibly: release dates just go
stale. `/admin` shows how long ago the last successful sync was, and turns that
line pink past ten days.

## The routine prompt

> Each scheduled run starts with no memory of previous runs, so this prompt is
> deliberately self-contained.

```text
You maintain the MCU watchlist at https://<your-hostname>.

Authenticate every request with:
  Authorization: Bearer <SYNC_TOKEN>

STEP 1 — Run the mechanical sync.

  POST https://<your-hostname>/api/sync

This refreshes titles and release dates from TMDB and records any films tagged
as MCU on TMDB that aren't in the catalogue. It returns:

  report.dateChanges   release dates that moved
  report.errors        anything that failed
  pending              discoveries awaiting a decision
  needsDescription     films in the catalogue with no description yet
  styleReference       every hand-written description, as the voice to match

STEP 2 — Triage each pending discovery.

For each entry in `pending`, decide whether it is a mainline MCU *feature film*.

  Add it only if it is a theatrical MCU feature. Determine its phase and saga
  from what you know about the MCU release slate:

    POST /api/discoveries/{tmdbId}
    {"action": "add", "phase": <number>, "saga": "The Multiverse Saga"}

  Ignore it if it is a making-of special, documentary, TV episode or season,
  concert film, re-release, or a non-MCU film that happens to carry the tag:

    POST /api/discoveries/{tmdbId}
    {"action": "ignore"}

  Leave it alone if you are genuinely unsure. An unresolved discovery stays in
  /admin for a human. Do not guess a phase — a wrong phase is worse than no
  entry, because it silently misplaces the film in the page and in the counts.

STEP 3 — Write missing descriptions.

For each entry in `needsDescription`, write ONE line and submit it:

  PUT /api/films/{id}/description
  {"description": "..."}

Match the voice of `styleReference` exactly. Those descriptions are the design.
They are concrete and specific — they name the scene, setting or twist a viewer
would actually remember — and they are never marketing copy.

  Good:  "Scott Lang steals a shrinking suit; the climax happens on a Thomas the
          Tank Engine set."
  Good:  "Wanda hunts America Chavez across realities; the Illuminati do not last
          long."
  Bad:   "An epic adventure that changes the MCU forever."
  Bad:   "Follow the hero on a thrilling journey of self-discovery."

Rules:
  - One sentence, roughly 12-20 words, never over 25.
  - Do not start with the film's title.
  - No spoiler warnings, no hedging, no preamble — the sentence only.

The endpoint refuses to overwrite an existing description (409). That is
intentional: descriptions are written once and then left alone, because
regenerating them makes the page churn for no reason. Do not try to work around
it, and do not "improve" descriptions that already exist.

STEP 4 — Report back.

Send a short message covering only what is worth knowing:
  - release dates that moved (this is the main reason the job exists)
  - discoveries you added, ignored, or left undecided, and why
  - descriptions you wrote, quoted in full so they can be checked
  - anything in report.errors

If nothing changed, say so in one line. Do not pad the report.
```

## Endpoints

All require `Authorization: Bearer <SYNC_TOKEN>`. If `SYNC_TOKEN` is unset, the
entire `/api/*` surface returns 404 rather than being open.

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/sync` | Run the mechanical sync; returns the report plus everything needed for triage |
| `POST` | `/api/discoveries/{tmdbId}` | `{"action":"add","phase":N,"saga":"..."}` or `{"action":"ignore"}` |
| `PUT` | `/api/films/{id}/description` | Set a description. 409 if one already exists. |
| `DELETE` | `/api/films/{id}/description` | Clear a description so the next run rewrites it |

## Running it by hand

```bash
curl -X POST https://<your-hostname>/api/sync \
  -H "Authorization: Bearer $SYNC_TOKEN" | jq
```
