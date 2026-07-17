import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { minigameConfig } from './minigameConfig'
import { spellCatalogue, spellsById } from './spellData'
import type { SpellCategory, SpellRecord } from './spellData'
import { loadLocalState, saveLocalState } from './persistence'

declare const __SOURCE_COMMIT__: string

type CalculatorMode = 'sorcery' | 'conjuring'

type MagicalStatKey =
  | 'sorcery'
  | 'conjuring'
  | 'spellPool'
  | 'willpower'
  | 'charisma'
  | 'intelligence'
  | 'magic'
  | 'essence'
  | 'body'
  | 'quickness'
  | 'reaction'

interface MagicalStats {
  sorcery: number
  conjuring: number
  spellPool: number
  willpower: number
  charisma: number
  intelligence: number
  magic: number
  essence: number
  body: number
  quickness: number
  reaction: number
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
  version: 3
  query: string
  selectedCategory: 'All' | SpellCategory
  selectedSpellId: string
  pinnedSpellIds: string[]
  pinnedSpellForces: Record<string, number>
  importPageUrl: string
  magicalStats: MagicalStats
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

const magicalStatFields: Array<{ key: MagicalStatKey, label: string, hint: string, step?: number }> = [
  { key: 'sorcery', label: 'Sorcery', hint: 'Primary spellcasting skill. Use this for casting tests; add Spell Pool dice when allocated.' },
  { key: 'conjuring', label: 'Conjuring', hint: 'Primary spirit summoning/banishing/binding skill.' },
  { key: 'spellPool', label: 'Spell Pool', hint: 'Dice that may be allocated to spellcasting or Sorcery drain resistance under SR3 rules.' },
  { key: 'willpower', label: 'Willpower', hint: 'Sorcery drain resistance attribute and common mana-spell resistance attribute.' },
  { key: 'charisma', label: 'Charisma', hint: 'Conjuring drain resistance attribute and spirit-facing social/magical baseline.' },
  { key: 'intelligence', label: 'Intelligence', hint: 'Common illusion/detection target or resistance attribute; also relevant to many perception-adjacent checks.' },
  { key: 'magic', label: 'Magic', hint: 'Magic attribute. If spell or spirit Force exceeds Magic, drain can become Physical instead of Stun.' },
  { key: 'essence', label: 'Essence', hint: 'Used by many Health spells through 10 - Essence target numbers.', step: 0.01 },
  { key: 'body', label: 'Body', hint: 'Common physical spell resistance attribute and target-code reference.' },
  { key: 'quickness', label: 'Quickness', hint: 'Used by some spell target codes, restraints, and movement-related effects.' },
  { key: 'reaction', label: 'Reaction', hint: 'Used by reaction/reflex spells and some combat timing contexts.' },
]

const seedMagicalStats: MagicalStats = {
  sorcery: 0,
  conjuring: 0,
  spellPool: 0,
  willpower: 0,
  charisma: 0,
  intelligence: 0,
  magic: 0,
  essence: 6,
  body: 0,
  quickness: 0,
  reaction: 0,
}

const seedState: SpellGuideState = {
  version: 3,
  query: '',
  selectedCategory: 'All',
  selectedSpellId: spellCatalogue[0]?.id ?? '',
  pinnedSpellIds: [],
  pinnedSpellForces: {},
  importPageUrl: 'https://hanclintoclaw-pixel.github.io/campaign-wiki/PCs/Valgaut.html',
  magicalStats: seedMagicalStats,
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

function isMagicalStats(value: unknown): value is MagicalStats {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<MagicalStats>
  return magicalStatFields.every((field) => typeof candidate[field.key] === 'number')
}

function isSpellGuideState(value: unknown): value is SpellGuideState {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<SpellGuideState>
  return (
    candidate.version === 3
    && typeof candidate.query === 'string'
    && typeof candidate.selectedCategory === 'string'
    && typeof candidate.selectedSpellId === 'string'
    && Array.isArray(candidate.pinnedSpellIds)
    && Boolean(candidate.pinnedSpellForces)
    && typeof candidate.importPageUrl === 'string'
    && isMagicalStats(candidate.magicalStats)
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

function parseWikiHtml(html: string) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  doc.querySelectorAll('script, style, nav, footer').forEach((node) => node.remove())
  return doc
}

function htmlToText(html: string) {
  return parseWikiHtml(html).body.textContent ?? ''
}

function extractSpellCandidateText(html: string) {
  const doc = parseWikiHtml(html)
  const chunks: string[] = []
  let inSpellSection = false
  const nodes = [...doc.body.querySelectorAll('h1, h2, h3, h4, p, li, td')]

  for (const node of nodes) {
    const text = (node.textContent ?? '').trim()
    if (!text) continue
    const tag = node.tagName.toLowerCase()
    const isHeading = ['h1', 'h2', 'h3', 'h4'].includes(tag)

    if (isHeading) {
      inSpellSection = /\b(known\s+spells?|spell\s+list|spells?|grimoire)\b/i.test(text) && !/spell\s+guide/i.test(text)
      continue
    }

    if (inSpellSection || /^\s*(known\s+)?spells?\s*[:=-]/i.test(text)) {
      chunks.push(text)
    }
  }

  return chunks.join('\n')
}

function extractNumberForLabels(text: string, labels: string[]) {
  for (const label of labels) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const patterns = [
      new RegExp(`\\b${escaped}\\b\\s*[:=]?\\s*(?:\\*\\*)?(-?\\d+(?:\\.\\d+)?)`, 'i'),
      new RegExp(`\\*\\*${escaped}\\*\\*\\s*[:=]?\\s*(-?\\d+(?:\\.\\d+)?)`, 'i'),
    ]
    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (match) return Number(match[1])
    }
  }
  return null
}

function extractMagicalStats(text: string) {
  const statMap: Array<{ key: MagicalStatKey, labels: string[] }> = [
    { key: 'sorcery', labels: ['Sorcery'] },
    { key: 'conjuring', labels: ['Conjuring'] },
    { key: 'spellPool', labels: ['Spell Pool', 'SpellPool'] },
    { key: 'willpower', labels: ['WIL', 'Willpower'] },
    { key: 'charisma', labels: ['CHA', 'Charisma'] },
    { key: 'intelligence', labels: ['INT', 'Intelligence'] },
    { key: 'magic', labels: ['Magic'] },
    { key: 'essence', labels: ['Essence'] },
    { key: 'body', labels: ['BOD', 'Body'] },
    { key: 'quickness', labels: ['QUI', 'Quickness'] },
    { key: 'reaction', labels: ['Reaction'] },
  ]
  const found: Partial<MagicalStats> = {}
  for (const item of statMap) {
    const value = extractNumberForLabels(text, item.labels)
    if (value !== null) found[item.key] = value
  }
  return found
}

const typeDescriptions: Record<string, string> = {
  M: 'Mana spell. It affects minds, spirits, life force, or astral/magical nature. Mana spells generally do not affect purely nonliving objects unless the spell says otherwise.',
  P: 'Physical spell. It creates or changes a physical effect in the material world and can often affect objects, devices, sensors, or bodies depending on the spell.',
}

const durationDescriptions: Record<string, string> = {
  I: 'Instant. The spell effect resolves immediately when cast. Damage, healing, or other consequences may remain, but the spell itself is not sustained.',
  S: 'Sustained. The caster must keep the spell going. In SR3, sustaining spells usually adds +2 target number per sustained spell to the caster’s other tests unless handled by a focus or other rule.',
  P: 'Permanent. The caster sustains the spell until the effect sets; after the required time, the result becomes nonmagical and no longer needs sustaining.',
}

const targetTokenDescriptions: Record<string, string> = {
  B: 'Body. The target usually resists with Body.',
  W: 'Willpower. The target usually resists with Willpower.',
  I: 'Intelligence. The target usually resists or is measured with Intelligence.',
  F: 'Force. Used for spirits, barriers, spells, or magical effects where Force is the relevant rating.',
  Q: 'Quickness. The target usually resists or is measured with Quickness.',
  OR: 'Object Resistance. Use the SR3 object resistance target number for the object/material being affected.',
  DT: 'Detection Table. Use the SR3 Detection Spell Table target number for the subject being detected.',
}

const markerDescriptions: Record<string, string> = {
  R: 'Resisted. The target can make a Spell Resistance Test; successes reduce the caster’s successes.',
  T: 'Threshold. The spell needs enough successes to exceed a threshold, often half the relevant target Attribute.',
  V: 'Voluntary target. The spell is designed for willing subjects; unwilling use may not apply or may require GM handling.',
  RC: 'Ranged Combat. Treat the spell like a ranged attack for the targeting step before resolving spell effects.',
  A: 'Area effect. The spell can affect valid targets in an area instead of just one target.',
  D: 'Directional sense. For detection spells, the granted sense works in a direction like sight or hearing.',
}

function explainType(type: string) {
  return typeDescriptions[type] ?? 'Spell type from the SR3 table. Common values are M for Mana and P for Physical.'
}

function explainTarget(target: string) {
  const parts: string[] = []
  for (const [token, description] of Object.entries(targetTokenDescriptions)) {
    const matcher = token.length === 1 ? new RegExp(`(^|[^A-Z])${token}([^A-Z]|$)`) : new RegExp(token)
    if (matcher.test(target)) parts.push(description)
  }
  for (const [marker, description] of Object.entries(markerDescriptions)) {
    if (target.includes(`(${marker})`) || target.includes(marker)) {
      if ((marker === 'T' || marker === 'V') && !target.includes(`(${marker})`)) continue
      parts.push(description)
    }
  }
  if (target.includes('Essence')) parts.push('Essence-dependent. Cyberware/bioware loss can change the target number, commonly through 10 minus Essence.')
  if (target.includes('Attribute')) parts.push('Attribute-dependent. Use the affected Attribute value as the listed target number context.')
  if (target.includes('Damage Level')) parts.push('Damage-level variable. Use the wound, toxin, allergy, or spell damage level named in the spell.')
  if (target.match(/^\d/)) parts.push('Fixed target number. Roll Sorcery against the listed number before resistance or other spell-specific handling.')
  return parts.length > 0 ? parts.join(' ') : 'Target code from the SR3 spell table. Read letters as the Attribute/rating used, and parenthetical markers as resistance or special handling.'
}

function explainRange(range: string) {
  const parts: string[] = []
  if (range.includes('LOS')) parts.push('Line of Sight. The caster must be able to see the target with natural vision or valid optical aids under SR3 targeting rules.')
  if (range.startsWith('T')) parts.push('Touch. The caster must touch the subject or target; touching an unwilling target may require a melee touch attack.')
  if (range.includes('(A)') || range.endsWith('/A')) parts.push(markerDescriptions.A)
  if (range.endsWith('/D')) parts.push(markerDescriptions.D)
  if (range.includes('/A')) parts.push('Area sense. For detection spells, the granted sense detects in all directions around the subject.')
  return parts.length > 0 ? parts.join(' ') : 'Range code from the SR3 spell table. LOS means line of sight; T means touch; (A) marks area effect.'
}

function explainDuration(duration: string) {
  return durationDescriptions[duration] ?? 'Duration code from the SR3 spell table: I is Instant, S is Sustained, and P is Permanent.'
}

function explainDrain(drain: string) {
  const parts = ['Drain is the fatigue/damage the caster resists after casting. The number modifier changes Drain Power, which is based on half Force rounded down; the letter in parentheses is the Drain Level.']
  if (drain.includes('Damage Level')) parts.push('Variable Damage Level means the drain level depends on the damage level chosen, healed, or inflicted by the spell.')
  if (/\([LMSD]\)/.test(drain)) parts.push('L/M/S/D are Light, Moderate, Serious, and Deadly drain levels.')
  if (drain.includes('+')) parts.push('A plus modifier increases Drain Power before the caster resists drain.')
  if (drain.includes('-')) parts.push('A minus modifier reduces Drain Power before the caster resists drain.')
  return parts.join(' ')
}

function explainTag(tag: string) {
  if (tag in markerDescriptions) return markerDescriptions[tag]
  const tagDescriptions: Record<string, string> = {
    area: markerDescriptions.A,
    touch: 'Touch-range spell. The caster needs physical contact with the subject or target.',
    sustained: durationDescriptions.S,
    permanent: durationDescriptions.P,
    resisted: markerDescriptions.R,
    voluntary: markerDescriptions.V,
    threshold: markerDescriptions.T,
    'ranged combat': markerDescriptions.RC,
    'object-specific': 'This is a spell family. Choose the specific object category when learning or casting the spell, such as Wreck Vehicle or Ram Door.',
    'species-specific': 'This is a spell family. Choose the specific race or species when learning the spell, such as Slay Human or Slay Spirit.',
  }
  return tagDescriptions[tag] ?? `${tag} spell tag used for filtering and quick table reminders.`
}

function TooltipValue({ label, value, tooltip }: { label: string, value: string, tooltip: string }) {
  return (
    <span className="tooltip-field" tabIndex={0} data-tooltip={tooltip} aria-label={`${label}: ${value}. ${tooltip}`}>
      <b>{label}</b>{value}
    </span>
  )
}

function TooltipChip({ children, tooltip }: { children: string, tooltip: string }) {
  return <span className="tooltip-chip" tabIndex={0} data-tooltip={tooltip} aria-label={`${children}. ${tooltip}`}>{children}</span>
}

function ForceInput({ spellId, force, onChange }: { spellId: string, force: number, onChange: (spellId: string, force: number) => void }) {
  return (
    <label className="force-input">
      Force
      <input type="number" min="1" max="30" value={force} onChange={(event) => onChange(spellId, Number(event.target.value))} />
    </label>
  )
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
  const selectedForce = selectedSpell ? state.pinnedSpellForces[selectedSpell.id] ?? 1 : 1

  function updateRollInputs(mode: CalculatorMode, patch: Partial<RollInputs>) {
    setState((current) => ({ ...current, [mode]: { ...current[mode], ...patch } }))
  }

  function updateMagicalStat(key: MagicalStatKey, value: number) {
    setState((current) => ({ ...current, magicalStats: { ...current.magicalStats, [key]: Number.isFinite(value) ? value : 0 } }))
  }

  function updateSpellForce(spellId: string, force: number) {
    setState((current) => ({
      ...current,
      pinnedSpellForces: { ...current.pinnedSpellForces, [spellId]: clampInteger(force, 1, 30) },
    }))
  }

  function pinSpell(spellId: string) {
    setState((current) => {
      const nextForces = { ...current.pinnedSpellForces, [spellId]: current.pinnedSpellForces[spellId] ?? 1 }
      if (current.pinnedSpellIds.includes(spellId)) return { ...current, pinnedSpellForces: nextForces }
      return { ...current, pinnedSpellIds: [...current.pinnedSpellIds, spellId], pinnedSpellForces: nextForces }
    })
  }

  function unpinSpell(spellId: string) {
    setState((current) => {
      const { [spellId]: _removed, ...remainingForces } = current.pinnedSpellForces
      return { ...current, pinnedSpellIds: current.pinnedSpellIds.filter((id) => id !== spellId), pinnedSpellForces: remainingForces }
    })
  }

  function clearPinnedSpells() {
    setState({ ...state, pinnedSpellIds: [], pinnedSpellForces: {} })
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
      const html = await response.text()
      const rawPageText = htmlToText(html)
      const spellCandidateText = normalizeText(extractSpellCandidateText(html))
      const matches = spellCandidateText ? spellCatalogue.filter((spell) => spellCandidateText.includes(normalizeText(spell.name))) : []
      const importedStats = extractMagicalStats(rawPageText)
      if (matches.length === 0 && Object.keys(importedStats).length === 0) {
        setImportNotice('No catalogue spell names or magical stats found on that page.')
        return
      }
      setState((current) => {
        const merged = new Set(current.pinnedSpellIds)
        const nextForces = { ...current.pinnedSpellForces }
        matches.forEach((spell) => {
          merged.add(spell.id)
          nextForces[spell.id] ??= 1
        })
        return {
          ...current,
          pinnedSpellIds: Array.from(merged),
          pinnedSpellForces: nextForces,
          selectedSpellId: matches[0]?.id ?? current.selectedSpellId,
          magicalStats: { ...current.magicalStats, ...importedStats },
        }
      })
      const statCount = Object.keys(importedStats).length
      setImportNotice(`Imported ${matches.length} matching spell${matches.length === 1 ? '' : 's'} and ${statCount} stat${statCount === 1 ? '' : 's'} from the wiki page.`)
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
              force={selectedForce}
              forceControl={selectedIsPinned ? <ForceInput spellId={selectedSpell.id} force={selectedForce} onChange={updateSpellForce} /> : null}
              action={selectedIsPinned ? <button className="ghost-button" onClick={() => unpinSpell(selectedSpell.id)}>Unpin</button> : <button onClick={() => pinSpell(selectedSpell.id)}>Pin to character</button>}
            />
          )}

          <section className="owned-menu">
            <div className="panel-header compact">
              <div>
                <p className="eyebrow">owned spells</p>
                <h2>{pinnedSpells.length} pinned</h2>
              </div>
              <button className="ghost-button" onClick={clearPinnedSpells} disabled={pinnedSpells.length === 0}>Clear list</button>
            </div>
            {pinnedSpells.length === 0 ? (
              <p className="muted">Pin a spell from the preview above, or import spell names from a character page.</p>
            ) : (
              <div className="owned-list">
                {pinnedSpells.map((spell) => (
                  <article key={spell.id} className="owned-row">
                    <button className="owned-pill" onClick={() => setState({ ...state, selectedSpellId: spell.id })}>
                      <span>{spell.name}</span>
                      <small>{spell.category} · {spell.drain}</small>
                    </button>
                    <ForceInput spellId={spell.id} force={state.pinnedSpellForces[spell.id] ?? 1} onChange={updateSpellForce} />
                  </article>
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
            <button onClick={importFromWikiPage}>Import matching spell names + stats</button>
            {importNotice && <p className="notice">{importNotice}</p>}
          </section>
        </div>

        <div className="panel ritual-panel">
          <div className="panel-header">
            <p className="eyebrow">dice engine</p>
            <h2>Sorcery + Conjuring</h2>
          </div>
          <RollerCard
            mode="sorcery"
            title="Sorcery casting"
            inputs={state.sorcery}
            suggestedDice={state.magicalStats.sorcery + state.magicalStats.spellPool}
            drainAttribute={`Willpower ${state.magicalStats.willpower}`}
            onUseSuggested={() => updateRollInputs('sorcery', { dicePool: state.magicalStats.sorcery + state.magicalStats.spellPool, drainTarget: Math.max(2, Math.floor(selectedForce / 2)) })}
            onChange={updateRollInputs}
            onRoll={roll}
          />
          <RollerCard
            mode="conjuring"
            title="Conjuring service / drain"
            inputs={state.conjuring}
            suggestedDice={state.magicalStats.conjuring}
            drainAttribute={`Charisma ${state.magicalStats.charisma}`}
            onUseSuggested={() => updateRollInputs('conjuring', { dicePool: state.magicalStats.conjuring, drainTarget: Math.max(2, Math.floor(selectedForce / 2)) })}
            onChange={updateRollInputs}
            onRoll={roll}
          />
          <p className="drain-note">Selected/pinned Force {selectedForce}; Magic {state.magicalStats.magic}. Force above Magic can make drain Physical under SR3 drain rules.</p>
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
              {pinnedSpells.map((spell) => (
                <SpellCard
                  key={spell.id}
                  spell={spell}
                  force={state.pinnedSpellForces[spell.id] ?? 1}
                  forceControl={<ForceInput spellId={spell.id} force={state.pinnedSpellForces[spell.id] ?? 1} onChange={updateSpellForce} />}
                  action={<button className="ghost-button" onClick={() => unpinSpell(spell.id)}>Remove</button>}
                />
              ))}
            </div>
          )}

          <MagicalStatsPanel stats={state.magicalStats} onChange={updateMagicalStat} />
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

function SpellCard({ spell, force, forceControl, action }: { spell: SpellRecord, force?: number, forceControl?: ReactNode, action?: ReactNode }) {
  return (
    <article className="spell-card">
      <header>
        <div>
          <p className="spell-type">{spell.category} · {spell.group} · {spell.type}</p>
          <h3>{spell.name}{force ? <span className="force-badge">Force {force}</span> : null}</h3>
        </div>
        <div className="card-actions">
          <span className="citation-chip">{spell.source}</span>
          {forceControl}
          {action}
        </div>
      </header>
      <div className="stat-rack">
        <TooltipValue label="Type" value={spell.type} tooltip={explainType(spell.type)} />
        <TooltipValue label="Target" value={spell.target} tooltip={explainTarget(spell.target)} />
        <TooltipValue label="Range" value={spell.range} tooltip={explainRange(spell.range)} />
        <TooltipValue label="Duration" value={spell.duration} tooltip={explainDuration(spell.duration)} />
        <TooltipValue label="Drain" value={spell.drain} tooltip={explainDrain(spell.drain)} />
      </div>
      <p>{spell.summary}</p>
      <p className="source-line">Source: {spell.page}</p>
      <div className="tags">
        {spell.tags.map((tag) => <TooltipChip key={tag} tooltip={explainTag(tag)}>{tag}</TooltipChip>)}
      </div>
    </article>
  )
}

function MagicalStatsPanel({ stats, onChange }: { stats: MagicalStats, onChange: (key: MagicalStatKey, value: number) => void }) {
  return (
    <section className="magic-stats-panel">
      <p className="eyebrow">magical stats</p>
      <h2>Character casting profile</h2>
      <p className="muted">Set manually, or import from a wiki character page. These values feed quick dice-pool buttons and drain reminders.</p>
      <div className="magic-stat-grid">
        {magicalStatFields.map((field) => (
          <label key={field.key} className="magic-stat-input">
            <span>{field.label}</span>
            <input type="number" step={field.step ?? 1} value={stats[field.key]} onChange={(event) => onChange(field.key, Number(event.target.value))} />
            <small>{field.hint}</small>
          </label>
        ))}
      </div>
    </section>
  )
}

function RollerCard({ mode, title, inputs, suggestedDice, drainAttribute, onUseSuggested, onChange, onRoll }: {
  mode: CalculatorMode
  title: string
  inputs: RollInputs
  suggestedDice: number
  drainAttribute: string
  onUseSuggested: () => void
  onChange: (mode: CalculatorMode, patch: Partial<RollInputs>) => void
  onRoll: (mode: CalculatorMode) => void
}) {
  const targetNumber = clampInteger(inputs.baseTarget + inputs.modifiers, 2, 6)
  const expected = expectedSuccesses(inputs.dicePool, targetNumber)

  return (
    <article className="roller-card">
      <div className="roller-heading">
        <h3>{title}</h3>
        <button className="ghost-button" onClick={onUseSuggested} disabled={suggestedDice <= 0}>Use character dice ({suggestedDice})</button>
      </div>
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
          <span>Expected hits: {expected.toFixed(2)} · Drain note TN {inputs.drainTarget} · Resist with {drainAttribute}</span>
        </div>
        <button onClick={() => onRoll(mode)}>Roll {inputs.dicePool}D6</button>
      </div>
    </article>
  )
}

export default App
