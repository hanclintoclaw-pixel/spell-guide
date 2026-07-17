# Subagent Prompts

## Implement a new minigame from this template

```text
You are implementing a new static Shadowrun minigame from `/Users/hanclaw/claw/projects/cindylou/shadowrun-minigame-template`.

Requirements:
- Keep it deployable as GitHub Pages only; no backend.
- Store local draft/session state in localStorage.
- Include a natural Save changes button that is disabled when there are no local changes and opens a prefilled GitHub Issue when changes exist.
- The issue body must include a human summary and a fenced JSON block with `schemaVersion: "shadowrun-minigame-persist/v1"`, source commit, and JSON Patch delta operations when the payload fits in a safe URL; otherwise download the JSON request and open a short issue instructing the user to attach it.
- Do not include permission-gate boilerplate in the user-submitted issue body or JSON payload; maintainer ingestion must validate GitHub author association from issue metadata before applying canonical changes.
- Warn on navigation when local global-impact state differs from the last submitted persistence-request snapshot.
- Update README docs and campaign-wiki hub links.
- Run the repo's existing build/lint checks.

Return exact changed files, validation commands, and any follow-up needed.
```

## Ingest minigame issues

```text
You are ingesting Shadowrun minigame persistence requests.

Requirements:
- Use GitHub Issues as a request queue, not a database.
- Fetch open issues labeled `minigame-persist`.
- Before applying anything, verify `authorAssociation` is `MEMBER`, `OWNER`, or `COLLABORATOR`, or that a repo member approved in-thread.
- Extract and validate the fenced JSON block or attached JSON request file.
- Check the request's `sourceCommit` and named base snapshot against the current repo state before applying the patch.
- Apply changes only to canonical source/data/wiki files.
- Run existing checks.
- Commit, push, wait for CI/CD deployment, close the issue with the commit hash and deployed URL, and post a concise Discord update.
```

## Add WYSIWYG wiki editing

```text
You are adding a static WYSIWYG editor workflow to the campaign wiki.

Requirements:
- Do not add a backend.
- Load Markdown page content into a browser editor where practical.
- Store drafts in localStorage.
- Save/Persist opens a prefilled GitHub Issue containing a human summary, target wiki path, original content hash if available, proposed Markdown, and JSON metadata.
- Warn on navigation when editor drafts differ from the last submitted issue snapshot.
- Issues must be permission-scoped to repository members/collaborators before Cindy applies canonical wiki commits.
- Link the editor workflow from the wiki hub and relevant template docs.
```
