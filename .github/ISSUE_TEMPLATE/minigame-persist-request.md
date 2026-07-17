---
name: Minigame persist request
about: Request canonical repo updates from a static Shadowrun minigame
title: "Persist minigame changes: <app> <date>"
labels: [minigame-persist, needs-review]
assignees: []
---

## Human summary

Who made the change, what happened in play, and what should become campaign canon?

## Machine-readable request

```json
{
  "schemaVersion": "shadowrun-minigame-persist/v1",
  "appId": "example-minigame",
  "appName": "Example Minigame",
  "createdAt": "YYYY-MM-DDTHH:mm:ss.sssZ",
  "sourceRepository": "owner/repo",
  "sourceCommit": "commit-sha-used-to-generate-this-request",
  "summary": "Short human-readable summary.",
  "canonicalTargets": ["data/example.json", "campaign-wiki/path.md"],
  "requestedChanges": []
}
```
