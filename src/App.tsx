import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { minigameConfig } from './minigameConfig'
import { spellCatalogue, spellsById } from './spellData'
import type { SpellCategory, SpellRecord } from './spellData'
import { loadLocalState, saveLocalState } from './persistence'

declare const __SOURCE_COMMIT__: string

type CalculatorMode = 'sorcery' | 'conjuring'

interface RollEntry {
  id: string
  mode: CalculatorMode
  label: string
  dice: number[]
  targetNumber: number
  successes: number
  timestamp: string
}

interface SpellGuideState {
  version: 2
  query: string
  selectedCategory: 'All' | SpellCategory
  selectedSpellId: string
  pinnedSpellIds: string[]
  importPageUrl: string
  sorcery: RollInputs
  conjuring: RollInputs
  history: RollEntry[]
}

interface RollInputs {
  dicePool: number
  baseTarget: number
  modifiers: number
  drainTarget: number
  label: string
}

const categoryOptions: Array<'All' | SpellCategory> = ['All', 'Combat', 'Detection', 'Health', 'Illusion', 'Manipulation']

const seedState: SpellGuideState = {
  version: 2,
  query: '',
  selectedCategory: 'All',
  selectedSpellId: spellCatalogue[0]?.id ?? '',
  pinnedSpellIds: [],
  importPageUrl: 'https://hanclintoclaw-pixel.github.io/campaign-wiki/PCs/Valgaut.html',
  sorcery: {
    dicePool: 6,
    baseTarget: 4,
    modifiers: 0,
    drainTarget: 4,
    label: 'Sorcery test',
  },
  conjuring: {
    dicePool: 6,
    baseTarget: 4,
    modifiers: 0,
    drainTarget: 4,
    label: 'Conjuring test',
  },
  history: [],
}

function isRollInputs(value: unknown): value is RollInputs {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<RollInputs>
  return (
    typeof candidate.dicePool === 'number'
    && typeof candidate.baseTarget === 'number'
    && typeof candidate.modifiers === 'number'
    && typeof candidate.drainTarget === 'number'
    && typeof candidate.label === 'string'
  )
}

function isSpellGuideState(value: unknown): value is SpellGuideState {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<SpellGuideState>
  return (
    candidate.version === 2
    && typeof candidate.query === 'string'
    && typeof candidate.selectedCategory === 'string'
    && typeof candidate.selectedSpellId === 'string'
    && Array.isArray(candidate.pinnedSpellIds)
    && typeof candidate.importPageUrl === 'string'
    && isRollInputs(candidate.sorcery)
    && isRollInputs(candidate.conjuring)
    && Array.isArray(candidate.history)
  )
}

function clampInteger(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min
  return Math.max(min, Math.min(max, Math.trunc(value)))
}

function rollD6Pool(count: number) {
  return Array.from({ length: clampInteger(count, 1, 40) }, () => Math.floor(Math.random() * 6) + 1)
}

function countSuccesses(dice: number[], targetNumber: number) {
  return dice.filter((die) => die >= targetNumber).length
}

function successChance(targetNumber: number) {
  const target = clampInteger(targetNumber, 2, 6)
  return (7 - target) / 6
}

function expectedSuccesses(dicePool: number, targetNumber: number) {
  return clampInteger(dicePool, 1, 40) * successChance(targetNumber)
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function extractVisibleText(html: string) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  doc.querySelectorAll('script, style, nav, footer').forEach((node) => node.remove())
  return normalizeText(doc.body.textContent ?? '')
}

function App() {
  const [state, setState] = useState<SpellGuideState>(() => {
    try {
      return loadLocalState(minigameConfig.localStorageKey, seedState, isSpellGuideState)
    } catch (error) {
      console.error(error)
      return seedState
    }
  })
  const [importNotice, setImportNotice] = useState('')

  useEffect(() => {
    saveLocalState(minigameConfig.localStorageKey, state)
  }, [state])

  const filteredSpells = useMemo(() => {
    const normalizedQuery = normalizeText(state.query)
    return spellCatalogue.filter((spell) => {
      const matchesCategory = state.selectedCategory === 'All' || spell.category === state.selectedCategory
      const haystack = normalizeText(`${spell.name} ${spell.category} ${spell.group} ${spell.type} ${spell.target} ${spell.tags.join(' ')} ${spell.summary}`)
      return matchesCategory && (!normalizedQuery || haystack.includes(normalizedQuery))
    })
  }, [state.query, state.selectedCategory])

  const selectedSpell = spellsById.get(state.selectedSpellId) ?? filteredSpells[0] ?? spellCatalogue[0]
  const pinnedSpells = state.pinnedSpellIds.map((id) => spellsById.get(id)).filter((spell): spell is SpellRecord => Boolean(spell))
  const selectedIsPinned = selectedSpell ? state.pinnedSpellIds.includes(selectedSpell.id) : false

  function updateRollInputs(mode: CalculatorMode, patch: Partial<RollInputs>) {
    setState((current) => ({ ...current, [mode]: { ...current[mode], ...patch } }))
  }

  function pinSpell(spellId: string) {
    setState((current) => {
      if (current.pinnedSpellIds.includes(spellId)) return current
      return { ...current, pinnedSpellIds: [...current.pinnedSpellIds, spellId] }
    })
  }

  function unpinSpell(spellId: string) {
    setState((current) => ({ ...current, pinnedSpellIds: current.pinnedSpellIds.filter((id) => id !== spellId) }))
  }

  function roll(mode: CalculatorMode) {
    const inputs = state[mode]
    const targetNumber = clampInteger(inputs.baseTarget + inputs.modifiers, 2, 6)
    const dice = rollD6Pool(inputs.dicePool)
    const entry: RollEntry = {
      id: crypto.randomUUID(),
      mode,
      label: inputs.label.trim() || (mode === 'sorcery' ? 'Sorcery test' : 'Conjuring test'),
      dice,
      targetNumber,
      successes: countSuccesses(dice, targetNumber),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
    setState((current) => ({ ...current, history: [entry, ...current.history].slice(0, 8) }))
  }

  async function importFromWikiPage() {
    setImportNotice('Reading wiki page...')
    try {
      const response = await fetch(state.importPageUrl)
      if (!response.ok) throw new Error(`Wiki page returned ${response.status}`)
      const pageText = extractVisibleText(await response.text())
      const matches = spellCatalogue.filter((spell) => pageText.includes(normalizeText(spell.name)))
      if (matches.length === 0) {
        setImportNotice('No catalogue spell names found on that page.')
        return
      }
      setState((current) => {
        const merged = new Set(current.pinnedSpellIds)
        matches.forEach((spell) => merged.add(spell.id))
        return { ...current, pinnedSpellIds: Array.from(merged), selectedSpellId: matches[0].id }
      })
      setImportNotice(`Imported ${matches.length} matching spell${matches.length === 1 ? '' : 's'} from the wiki page.`)
    } catch (error) {
      console.error(error)
      setImportNotice(error instanceof Error ? error.message : 'Import failed.')
    }
  }

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <div className="sigil" aria-hidden="true">✦</div>
        <div>
          <p className="eyebrow">SR3 arcana node / beta interface</p>
          <h1>{minigameConfig.appName}</h1>
          <p className="hero-copy">
            A cybermystic workbench for Shadowrun 3rd Edition spell lookups, personal spell lists, and fast Sorcery / Conjuring rollouts.
          </p>
          <div className="hero-links">
            <a href={minigameConfig.wikiHubUrl}>Campaign minigame hub</a>
            <span>{spellCatalogue.length} SR3 + Magic in the Shadows spells · source {__SOURCE_COMMIT__.slice(0, 7)}</span>
          </div>
        </div>
      </section>

      <section className="grid two-up">
        <div className="panel catalogue-panel">
          <div className="panel-header">
            <p className="eyebrow">spell catalogue</p>
            <h2>Grimoire index</h2>
          </div>
          <div className="filters">
            <label>
              Search
              <input value={state.query} onChange={(event) => setState({ ...state, query: event.target.value })} placeholder="mana, stun, sustained..." />
            </label>
            <label>
              Category
              <select value={state.selectedCategory} onChange={(event) => setState({ ...state, selectedCategory: event.target.value as SpellGuideState['selectedCategory'] })}>
                {categoryOptions.map((category) => <option key={category}>{category}</option>)}
              </select>
            </label>
          </div>
          <label className="spell-picker">
            Available spells ({filteredSpells.length})
            <select value={filteredSpells.some((spell) => spell.id === selectedSpell?.id) ? selectedSpell?.id : ''} onChange={(event) => setState({ ...state, selectedSpellId: event.target.value })}>
              {!filteredSpells.some((spell) => spell.id === selectedSpell?.id) && <option value="">Current selection hidden by filters</option>}
              {filteredSpells.map((spell) => <option key={spell.id} value={spell.id}>{spell.name} · {spell.category}</option>)}
            </select>
          </label>

          {selectedSpell && (
            <SpellCard
              spell={selectedSpell}
              action={selectedIsPinned ? <button className="ghost-button" onClick={() => unpinSpell(selectedSpell.id)}>Unpin</button> : <button onClick={() => pinSpell(selectedSpell.id)}>Pin to character</button>}
            />
          )}

          <section className="owned-menu">
            <div className="panel-header compact">
              <div>
                <p className="eyebrow">owned spells</p>
                <h2>{pinnedSpells.length} pinned</h2>
              </div>
              <button className="ghost-button" onClick={() => setState({ ...state, pinnedSpellIds: [] })} disabled={pinnedSpells.length === 0}>Clear list</button>
            </div>
            {pinnedSpells.length === 0 ? (
              <p className="muted">Pin a spell from the preview above, or import spell names from a character page.</p>
            ) : (
              <div className="owned-list">
                {pinnedSpells.map((spell) => (
                  <button key={spell.id} className="owned-pill" onClick={() => setState({ ...state, selectedSpellId: spell.id })}>
                    <span>{spell.name}</span>
                    <small>{spell.category} · {spell.drain}</small>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="import-box">
            <p className="eyebrow">wiki import</p>
            <label>
              Character page URL
              <input value={state.importPageUrl} onChange={(event) => setState({ ...state, importPageUrl: event.target.value })} />
            </label>
            <button onClick={importFromWikiPage}>Import matching spell names</button>
            {importNotice && <p className="notice">{importNotice}</p>}
          </section>
        </div>

        <div className="panel ritual-panel">
          <div className="panel-header">
            <p className="eyebrow">dice engine</p>
            <h2>Sorcery + Conjuring</h2>
          </div>
          <RollerCard mode="sorcery" title="Sorcery casting" inputs={state.sorcery} onChange={updateRollInputs} onRoll={roll} />
          <RollerCard mode="conjuring" title="Conjuring service / drain" inputs={state.conjuring} onChange={updateRollInputs} onRoll={roll} />
        </div>
      </section>

      <section className="grid two-up lower-grid">
        <div className="panel owned-detail-panel">
          <p className="eyebrow">character grimoire</p>
          <h2>Pinned spell stats</h2>
          {pinnedSpells.length === 0 ? (
            <p className="muted">Pinned spells will appear here as the character’s working spell list.</p>
          ) : (
            <div className="spell-list compact-list">
              {pinnedSpells.map((spell) => <SpellCard key={spell.id} spell={spell} action={<button className="ghost-button" onClick={() => unpinSpell(spell.id)}>Remove</button>} />)}
            </div>
          )}
        </div>

        <div className="panel history-panel">
          <div className="panel-header compact">
            <p className="eyebrow">last rolls</p>
            <button className="ghost-button" onClick={() => setState({ ...state, history: [] })} disabled={state.history.length === 0}>Clear</button>
          </div>
          {state.history.length === 0 ? (
            <p className="muted">No rolls yet. The astral dice are waiting.</p>
          ) : (
            <div className="history-list">
              {state.history.map((entry) => (
                <article key={entry.id} className="history-entry">
                  <div>
                    <strong>{entry.label}</strong>
                    <span>{entry.timestamp} · TN {entry.targetNumber} · {entry.successes} success{entry.successes === 1 ? '' : 'es'}</span>
                  </div>
                  <code>{entry.dice.join(' ')}</code>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}

function SpellCard({ spell, action }: { spell: SpellRecord, action?: ReactNode }) {
  return (
    <article className="spell-card">
      <header>
        <div>
          <p className="spell-type">{spell.category} · {spell.group} · {spell.type}</p>
          <h3>{spell.name}</h3>
        </div>
        <div className="card-actions">
          <span className="citation-chip">{spell.source}</span>
          {action}
        </div>
      </header>
      <div className="stat-rack">
        <span><b>Target</b>{spell.target}</span>
        <span><b>Range</b>{spell.range}</span>
        <span><b>Duration</b>{spell.duration}</span>
        <span><b>Drain</b>{spell.drain}</span>
      </div>
      <p>{spell.summary}</p>
      <p className="source-line">Source: {spell.page}</p>
      <div className="tags">
        {spell.tags.map((tag) => <span key={tag}>{tag}</span>)}
      </div>
    </article>
  )
}

function RollerCard({ mode, title, inputs, onChange, onRoll }: {
  mode: CalculatorMode
  title: string
  inputs: RollInputs
  onChange: (mode: CalculatorMode, patch: Partial<RollInputs>) => void
  onRoll: (mode: CalculatorMode) => void
}) {
  const targetNumber = clampInteger(inputs.baseTarget + inputs.modifiers, 2, 6)
  const expected = expectedSuccesses(inputs.dicePool, targetNumber)

  return (
    <article className="roller-card">
      <h3>{title}</h3>
      <label>
        Label
        <input value={inputs.label} onChange={(event) => onChange(mode, { label: event.target.value })} />
      </label>
      <div className="mini-grid">
        <label>
          Dice pool
          <input type="number" min="1" max="40" value={inputs.dicePool} onChange={(event) => onChange(mode, { dicePool: Number(event.target.value) })} />
        </label>
        <label>
          Base TN
          <input type="number" min="2" max="6" value={inputs.baseTarget} onChange={(event) => onChange(mode, { baseTarget: Number(event.target.value) })} />
        </label>
        <label>
          Modifiers
          <input type="number" min="-4" max="12" value={inputs.modifiers} onChange={(event) => onChange(mode, { modifiers: Number(event.target.value) })} />
        </label>
        <label>
          Drain TN note
          <input type="number" min="2" max="12" value={inputs.drainTarget} onChange={(event) => onChange(mode, { drainTarget: Number(event.target.value) })} />
        </label>
      </div>
      <div className="roll-footer">
        <div>
          <strong>Final TN {targetNumber}</strong>
          <span>Expected hits: {expected.toFixed(2)} · Drain note TN {inputs.drainTarget}</span>
        </div>
        <button onClick={() => onRoll(mode)}>Roll {inputs.dicePool}D6</button>
      </div>
    </article>
  )
}

export default App
