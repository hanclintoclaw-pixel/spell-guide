# Shadowrun Minigame Template

Static GitHub Pages starter for Shadowrun apps and table minigames.

## Standard pattern

1. Host each minigame as a static GitHub Pages app.
2. Store local, per-player draft/session state in `localStorage`.
3. Warn when the user has local global-impact changes that have not been submitted.
4. Use a disabled-when-clean **Save changes** button to open a prefilled GitHub Issue with a human summary, source commit, and machine-readable JSON Patch delta; if the request is too large for a URL, download the JSON and have the user attach it to the issue.
5. Treat GitHub Issues as a permission-scoped request queue, never as an auto-applied database.
6. Cindy or a maintainer validates the issue author, applies canonical repo/data/wiki changes, commits, pushes, waits for CI/CD, closes the issue, and posts back to Discord.

## Permission model

Public repositories can receive issues from anyone, so ingestion must be scoped by author permission.

An issue can be acted on only when one of these is true:

- GitHub reports the issue author's association as `MEMBER`, `OWNER`, or `COLLABORATOR`.
- A repo member explicitly approves the issue in-thread.

All other issues are comments, bug reports, or suggestions. They are not canonical mutation requests.

## What is included

- `src/persistence.ts` - reusable localStorage + GitHub Issue URL helpers.
- `src/App.tsx` - small example minigame with local edits and a Save changes button.
- `.github/ISSUE_TEMPLATE/minigame-persist-request.md` - manual fallback template.
- `docs/PERSISTENCE_PATTERN.md` - implementation recommendations.
- `docs/INGESTION_WORKFLOW.md` - Cindy/maintainer issue-ingestion checklist.
- `docs/SUBAGENT_PROMPTS.md` - ready-to-use prompts for implementing new apps and ingestion passes.

## Development

```sh
npm install
npm run build
npm run dev
```

When copying this template, update these values first:

- `package.json` `name`, `description`, and `homepage`
- `vite.config.ts` `base`
- `src/minigameConfig.ts` repository URLs and app identifiers
- Wiki hub links in the campaign wiki
