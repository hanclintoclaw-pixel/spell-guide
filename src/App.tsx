import { useEffect, useMemo, useState } from 'react'
import { minigameConfig } from './minigameConfig'
import { loadLocalState, saveLocalState } from './persistence'

declare const __SOURCE_COMMIT__: string

type SpellCategory = 'Combat' | 'Detection' | 'Health' | 'Illusion' | 'Manipulation'
type RangeType = 'LOS' | 'Touch' | 'LOS Area' | 'Self'
type DurationType = 'Instant' | 'Sustained' | 'Permanent'
type DamageLevel = 'Light' | 'Moderate' | 'Serious' | 'Deadly' | 'Varies'
type CalculatorMode = 'sorcery' | 'conjuring'

interface SpellRecord {
  id: string
  name: string
  category: SpellCategory
  type: string
  target: string
  range: RangeType
  duration: DurationType
  drain: string
  damage: DamageLevel
  tags: string[]
  effect: string
  sourceStatus: 'ui-seed' | 'needs-citation'
}

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
  version: 1
  query: string
  selectedCategory: 'All' | SpellCategory
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

const starterSpells: SpellRecord[] = [
  {
    id: 'mana-bolt',
    name: 'Mana Bolt',
    category: 'Combat',
    type: 'Mana / Direct',
    target: 'Willpower',
    range: 'LOS',
    duration: 'Instant',
    drain: 'By force + damage level',
    damage: 'Serious',
    tags: ['single target', 'mana', 'direct damage'],
    effect: 'Direct mana attack preview row. Replace with source-backed SR3 text during catalogue curation.',
    sourceStatus: 'needs-citation',
  },
  {
    id: 'stunbolt',
    name: 'Stunbolt',
    category: 'Combat',
    type: 'Mana / Direct',
    target: 'Willpower',
    range: 'LOS',
    duration: 'Instant',
    drain: 'By force + damage level',
    damage: 'Serious',
    tags: ['stun', 'single target', 'low profile'],
    effect: 'Non-lethal direct combat spell placeholder with SR3 citation still pending.',
    sourceStatus: 'needs-citation',
  },
  {
    id: 'heal',
    name: 'Heal',
    category: 'Health',
    type: 'Physical',
    target: 'Wound / Essence context',
    range: 'Touch',
    duration: 'Permanent',
    drain: 'By wound severity',
    damage: 'Varies',
    tags: ['recovery', 'touch', 'post-combat'],
    effect: 'Health spell card showing where wound and drain handling will surface once exact SR3 data is entered.',
    sourceStatus: 'needs-citation',
  },
  {
    id: 'detect-enemies',
    name: 'Detect Enemies',
    category: 'Detection',
    type: 'Mana / Detection',
    target: 'Variable',
    range: 'LOS Area',
    duration: 'Sustained',
    drain: 'By detection scope',
    damage: 'Varies',
    tags: ['sustained', 'threat read', 'area'],
    effect: 'Detection spell placeholder for hostile-intent checks, range display, and sustaining reminders.',
    sourceStatus: 'needs-citation',
  },
  {
    id: 'invisibility',
    name: 'Invisibility',
    category: 'Illusion',
    type: 'Mana / Illusion',
    target: 'Intelligence / Resistance',
    range: 'LOS',
    duration: 'Sustained',
    drain: 'By illusion scope',
    damage: 'Varies',
    tags: ['sustained', 'stealth', 'resisted'],
    effect: 'Illusion spell card demonstrating resistance notes and sustained-spell warnings.',
    sourceStatus: 'needs-citation',
  },
  {
    id: 'armor',
    name: 'Armor',
    category: 'Manipulation',
    type: 'Physical / Manipulation',
    target: '4',
    range: 'LOS',
    duration: 'Sustained',
    drain: 'By force',
    damage: 'Varies',
    tags: ['defense', 'sustained', 'combat prep'],
    effect: 'Manipulation spell placeholder for armor value, force, and sustaining penalty display.',
    sourceStatus: 'needs-citation',
  },
]

const seedState: SpellGuideState = {
  version: 1,
  query: '',
  selectedCategory: 'All',
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
    candidate.version === 1
    && typeof candidate.query === 'string'
    && typeof candidate.selectedCategory === 'string'
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

function App() {
  const [state, setState] = useState<SpellGuideState>(() => {
    try {
      return loadLocalState(minigameConfig.localStorageKey, seedState, isSpellGuideState)
    } catch (error) {
      console.error(error)
      return seedState
    }
  })

  useEffect(() => {
    saveLocalState(minigameConfig.localStorageKey, state)
  }, [state])

  const filteredSpells = useMemo(() => {
    const normalizedQuery = state.query.trim().toLowerCase()
    return starterSpells.filter((spell) => {
      const matchesCategory = state.selectedCategory === 'All' || spell.category === state.selectedCategory
      const haystack = `${spell.name} ${spell.category} ${spell.type} ${spell.tags.join(' ')} ${spell.effect}`.toLowerCase()
      return matchesCategory && (!normalizedQuery || haystack.includes(normalizedQuery))
    })
  }, [state.query, state.selectedCategory])

  function updateRollInputs(mode: CalculatorMode, patch: Partial<RollInputs>) {
    setState((current) => ({ ...current, [mode]: { ...current[mode], ...patch } }))
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

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <div className="sigil" aria-hidden="true">✦</div>
        <div>
          <p className="eyebrow">SR3 arcana node / beta interface</p>
          <h1>{minigameConfig.appName}</h1>
          <p className="hero-copy">
            A cybermystic workbench for Shadowrun 3rd Edition spell lookups, casting notes, and fast Sorcery / Conjuring rollouts.
          </p>
          <div className="hero-links">
            <a href={minigameConfig.wikiHubUrl}>Campaign minigame hub</a>
            <span>source {__SOURCE_COMMIT__.slice(0, 7)}</span>
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
          <div className="spell-list" aria-live="polite">
            {filteredSpells.map((spell) => <SpellCard key={spell.id} spell={spell} />)}
          </div>
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
        <div className="panel rule-panel">
          <p className="eyebrow">table flow</p>
          <h2>Rollout checklist</h2>
          <ol>
            <li>Pick spell or spirit action, force, target number, and applicable wound/sustaining modifiers.</li>
            <li>Roll Sorcery or Conjuring pool here; count successes at the final TN.</li>
            <li>Resolve resistance, effect, services, and drain using source-backed SR3 rules at the table.</li>
          </ol>
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

function SpellCard({ spell }: { spell: SpellRecord }) {
  return (
    <article className="spell-card">
      <header>
        <div>
          <p className="spell-type">{spell.category} · {spell.type}</p>
          <h3>{spell.name}</h3>
        </div>
        <span className="citation-chip">{spell.sourceStatus === 'needs-citation' ? 'citation pending' : 'seed'}</span>
      </header>
      <div className="stat-rack">
        <span><b>TN</b>{spell.target}</span>
        <span><b>Range</b>{spell.range}</span>
        <span><b>Dur.</b>{spell.duration}</span>
        <span><b>Drain</b>{spell.drain}</span>
      </div>
      <p>{spell.effect}</p>
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
