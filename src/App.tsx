import { useEffect, useMemo, useState } from 'react'
import { minigameConfig } from './minigameConfig'
import { buildIssueDraft, buildJsonPatch, downloadTextFile, loadLocalState, saveLocalState, snapshotOf } from './persistence'
import type { PersistRequest } from './persistence'

declare const __SOURCE_COMMIT__: string

interface ExampleState {
  version: 1
  runner: string
  sessionDate: string
  notes: string
  resourcesSpent: number
  upgrades: string[]
}

const seedState: ExampleState = {
  version: 1,
  runner: 'Ace Malone',
  sessionDate: new Date().toISOString().slice(0, 10),
  notes: 'Habitat maintenance draft notes go here.',
  resourcesSpent: 0,
  upgrades: ['Replace intake filter'],
}

function isExampleState(value: unknown): value is ExampleState {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<ExampleState>
  return candidate.version === 1 && typeof candidate.runner === 'string' && Array.isArray(candidate.upgrades)
}

function App() {
  const [state, setState] = useState<ExampleState>(() => {
    try {
      return loadLocalState(minigameConfig.localStorageKey, seedState, isExampleState)
    } catch (error) {
      console.error(error)
      return seedState
    }
  })
  const [submittedSnapshot, setSubmittedSnapshot] = useState(
    () => window.localStorage.getItem(minigameConfig.submittedSnapshotKey) ?? snapshotOf(seedState),
  )
  const [persistNotice, setPersistNotice] = useState('')

  const currentSnapshot = useMemo(() => snapshotOf(state), [state])
  const hasUnsubmittedChanges = currentSnapshot !== submittedSnapshot

  useEffect(() => {
    saveLocalState(minigameConfig.localStorageKey, state)
  }, [state])

  useEffect(() => {
    if (!hasUnsubmittedChanges) return

    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warnBeforeUnload)
    return () => window.removeEventListener('beforeunload', warnBeforeUnload)
  }, [hasUnsubmittedChanges])

  function openPersistIssue() {
    if (!hasUnsubmittedChanges) return

    const request: PersistRequest<ExampleState> = {
      schemaVersion: 'shadowrun-minigame-persist/v1',
      appId: minigameConfig.appId,
      appName: minigameConfig.appName,
      campaign: minigameConfig.campaign,
      createdAt: new Date().toISOString(),
      sourceRepository: minigameConfig.sourceRepository,
      sourceCommit: __SOURCE_COMMIT__,
      localStorageKey: minigameConfig.localStorageKey,
      summary: `${state.runner} requests ${state.upgrades.length} canonical minigame update(s) for ${state.sessionDate}.`,
      canonicalTargets: ['data/example-minigame.json', 'campaign-wiki/Minigames.md'],
      requestedChanges: [
        {
          type: 'patch_example_state',
          baseSnapshot: 'template seedState',
          format: 'json-patch/rfc6902',
          payload: buildJsonPatch(seedState, state),
        },
      ],
    }

    const issueDraft = buildIssueDraft(
      minigameConfig.issueRepositoryUrl,
      `Persist ${minigameConfig.appName}: ${state.sessionDate}`,
      request,
      minigameConfig.appId,
    )
    if (issueDraft.attachment) {
      downloadTextFile(issueDraft.attachment.filename, issueDraft.attachment.content, 'application/json')
      setPersistNotice(`Downloaded ${issueDraft.attachment.filename}. Attach it to the GitHub Issue before submitting.`)
    } else {
      setPersistNotice('Opened a GitHub Issue with the JSON Patch request prefilled.')
    }
    window.localStorage.setItem(minigameConfig.submittedSnapshotKey, currentSnapshot)
    setSubmittedSnapshot(currentSnapshot)
    window.open(issueDraft.url, '_blank', 'noopener,noreferrer')
  }

  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Static GitHub Pages minigame</p>
        <h1>{minigameConfig.appName}</h1>
        <p>Local drafts auto-save in this browser. Canonical campaign changes are submitted as permission-scoped GitHub Issues.</p>
        <a href={minigameConfig.wikiHubUrl}>Campaign wiki minigame hub</a>
      </section>

      <section className="panel">
        <label>
          Runner
          <input value={state.runner} onChange={(event) => setState({ ...state, runner: event.target.value })} />
        </label>
        <label>
          Session date
          <input type="date" value={state.sessionDate} onChange={(event) => setState({ ...state, sessionDate: event.target.value })} />
        </label>
        <label>
          Resources spent
          <input type="number" min="0" value={state.resourcesSpent} onChange={(event) => setState({ ...state, resourcesSpent: Number(event.target.value) })} />
        </label>
        <label>
          Upgrades / global changes
          <textarea value={state.upgrades.join('\n')} onChange={(event) => setState({ ...state, upgrades: event.target.value.split('\n').filter(Boolean) })} />
        </label>
        <label>
          Notes
          <textarea value={state.notes} onChange={(event) => setState({ ...state, notes: event.target.value })} />
        </label>
      </section>

      <section className="panel actions">
        <div>
          <strong>{hasUnsubmittedChanges ? 'Unsubmitted global changes' : 'No unsubmitted global changes'}</strong>
          <p>Save changes opens a GitHub Issue with a JSON Patch delta against the bundled seed state and the source commit it was generated from. Oversized deltas download as an attachment file instead of being placed in the URL.</p>
          {persistNotice && <p className="notice">{persistNotice}</p>}
        </div>
        <button onClick={openPersistIssue} disabled={!hasUnsubmittedChanges}>{hasUnsubmittedChanges ? 'Save changes' : 'Saved'}</button>
      </section>
    </main>
  )
}

export default App
