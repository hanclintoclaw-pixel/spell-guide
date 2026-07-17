# Shadowrun Minigame Persistence Pattern

## Design goal

Keep minigames static and player-friendly while preserving an auditable path for campaign-canon changes.

## State tiers

| Tier | Storage | Examples | Owner |
| --- | --- | --- | --- |
| Local draft | Browser `localStorage` | UI settings, session edits, unsent maintenance choices | Player/browser |
| Persistence request | GitHub Issue | End-of-run mutation packet with JSON | Player submits, maintainer reviews |
| Canonical state | Repo data/wiki files | committed upgrades, spent resources, page edits | Repo maintainers/Cindy |

## Issue body shape

Use plain text first and JSON second. Keep the fenced JSON block valid so Cindy can extract it reliably. Prefer JSON Patch deltas against a named canonical seed snapshot and include the source commit that generated the request so concurrent submissions can be checked against the right baseline. For large deltas, do not force the JSON into the issue URL; open a short prefilled issue and download the JSON request as an attachment file for the user to attach before submitting.

```json
{
  "schemaVersion": "shadowrun-minigame-persist/v1",
  "appId": "drone-dashboard",
  "createdAt": "2026-07-09T19:30:00.000Z",
  "sourceRepository": "hanclintoclaw-pixel/drone-dashboard",
  "sourceCommit": "commit-sha-used-to-generate-this-request",
  "canonicalTargets": ["src/data/drones.json", "campaign-wiki/Vehicles/Belmont.md"],
  "requestedChanges": [
    {
      "type": "patch_drone_dashboard_state",
      "baseSnapshot": "src/App.tsx seedState",
      "format": "json-patch/rfc6902",
      "payload": []
    }
  ]
}
```

## Navigation warning

Warn only when local state differs from the last submitted canonical-request snapshot. Local auto-save should stay quiet by itself; the warning is for unsubmitted global-impact changes.

## Security rules

- Do not run arbitrary issue JSON as code.
- Do not apply issues opened by public drive-by users.
- Prefer JSON Patch deltas for ordinary edits, with the named base snapshot and source commit included in the request. Use full replacement snapshots only for simple bootstrap/reset flows. When a delta exceeds the safe prefilled-URL budget, use a downloaded JSON attachment instead of a long URL.
- Commit canonical changes to source/data/wiki files, not generated `dist/` artifacts.
- Close issues with the commit hash and deployed URL when complete.
