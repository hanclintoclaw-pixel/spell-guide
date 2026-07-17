# Cindy / Maintainer Ingestion Workflow

## Schedule

Start with nightly or Discord-prompted checks. Webhooks can come later.

## Checklist

1. List open issues labeled `minigame-persist` or `needs-review`.
2. For each issue, inspect the issue author's `author_association`.
3. Continue only if the author is `MEMBER`, `OWNER`, or `COLLABORATOR`, or a repo member explicitly approves in the issue thread.
4. Extract the fenced JSON block and validate `schemaVersion`.
5. Compare requested changes against the current repo state.
6. Apply canonical source/data/wiki edits.
7. Run existing build/lint/tests.
8. Commit and push.
9. Let CI/CD redeploy GitHub Pages.
10. Close the issue with the commit hash, deployed URL, and Discord-facing summary.

## Suggested `gh` commands

```sh
gh issue list --label minigame-persist --state open --json number,title,author,authorAssociation,labels,body,url
gh issue view <number> --json number,title,author,authorAssociation,comments,body,url
gh issue comment <number> --body "Applied in <commit>; deployed via GitHub Pages."
gh issue close <number> --reason completed
```

## Reject/non-member response

```md
Thanks for the report. This repository only accepts canon-changing minigame persistence requests from repository members/collaborators or requests explicitly approved by one in-thread. I am leaving this open as feedback, but will not apply it as a canonical update without that approval.
```
