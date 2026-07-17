export type SpellCategory = 'Combat' | 'Detection' | 'Health' | 'Illusion' | 'Manipulation'
export type SpellSource = 'SR3 Core' | 'Magic in the Shadows'

export interface SpellRecord {
  id: string
  name: string
  category: SpellCategory
  group: string
  type: string
  target: string
  duration: string
  range: string
  drain: string
  source: SpellSource
  page: string
  tags: string[]
  summary: string
}

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function spell(input: Omit<SpellRecord, 'id'>): SpellRecord {
  return { id: slugify(input.name), ...input }
}

const corePage = 'SR3 p. 191-198; MitS spell table p. 165-168'
const mitsPage = 'Magic in the Shadows p. 138-148; spell table p. 165-168'

const effectHints: Record<SpellCategory, string> = {
  Combat: 'Combat spell. Resolve the listed target, resistance marker, range, and drain; variable Damage Level is chosen when casting where applicable.',
  Detection: 'Detection spell. Usually grants the subject a magical sense; use the listed sense range and resistance marker for targets.',
  Health: 'Health spell. Use touch/voluntary/resisted markers, Essence or wound context, and permanent/sustained timing as listed.',
  Illusion: 'Illusion spell. Directed illusions target minds or sensors; indirect illusions alter what observers perceive around a subject or area.',
  Manipulation: 'Manipulation spell. Use the listed control, elemental, telekinetic, or transformation handling plus any threshold/resistance marker.',
}

function tags(category: SpellCategory, group: string, name: string, range: string, duration: string, target: string) {
  const terms = [category.toLowerCase(), group.toLowerCase()]
  if (range.includes('(A)')) terms.push('area')
  if (range.startsWith('T')) terms.push('touch')
  if (duration === 'S') terms.push('sustained')
  if (duration === 'P') terms.push('permanent')
  if (target.includes('(R)')) terms.push('resisted')
  if (target.includes('(V)')) terms.push('voluntary')
  if (target.includes('(T)')) terms.push('threshold')
  if (target.includes('(RC)')) terms.push('ranged combat')
  if (name.includes('(Object)')) terms.push('object-specific')
  if (name.includes('(Race/Species)')) terms.push('species-specific')
  return terms
}

function s(name: string, category: SpellCategory, group: string, type: string, target: string, duration: string, range: string, drain: string, source: SpellSource, summary = effectHints[category]) {
  return spell({ name, category, group, type, target, duration, range, drain, source, page: source === 'SR3 Core' ? corePage : mitsPage, tags: tags(category, group, name, range, duration, target), summary })
}

export const spellCatalogue: SpellRecord[] = [
  s('Death Touch', 'Combat', 'Combat', 'M', 'W(R)', 'I', 'T', '(Damage Level -1)', 'SR3 Core', 'Touch-range mana combat spell that damages a living target.'),
  s('Manaball', 'Combat', 'Combat', 'M', 'W(R)', 'I', 'LOS(A)', '(Damage Level +1)', 'SR3 Core', 'Area mana combat spell resisted with Willpower.'),
  s('Manabolt', 'Combat', 'Combat', 'M', 'W(R)', 'I', 'LOS', '(Damage Level)', 'SR3 Core', 'Single-target mana combat spell resisted with Willpower.'),
  s('Powerball', 'Combat', 'Combat', 'P', 'B(R)', 'I', 'LOS(A)', '+1(Damage Level +1)', 'SR3 Core', 'Area physical combat spell resisted with Body.'),
  s('Powerbolt', 'Combat', 'Combat', 'P', 'B(R)', 'I', 'LOS', '+1(Damage Level)', 'SR3 Core', 'Single-target physical combat spell resisted with Body.'),
  s('Ram (Object)', 'Combat', 'Combat', 'P', 'OR', 'I', 'T', '+1(Damage Level -2)', 'Magic in the Shadows', 'Touch-range object-specific physical damage spell.'),
  s('Shattershield', 'Combat', 'Combat', 'M', 'F(R)', 'I', 'T', '(M)', 'Magic in the Shadows', 'Touch-range mana spell for breaking astral barriers.'),
  s('Slaughter (Race/Species)', 'Combat', 'Combat', 'M', 'W(R)', 'I', 'LOS(A)', '+1(D)', 'Magic in the Shadows', 'Area species-specific deadly mana combat spell.'),
  s('Slay (Race/Species)', 'Combat', 'Combat', 'M', 'W(R)', 'I', 'LOS', '-1(D)', 'Magic in the Shadows', 'Single-target species-specific deadly mana combat spell.'),
  s('Spiritblast', 'Combat', 'Combat', 'M', 'F(R)', 'I', 'LOS(A)', '-1(Damage Level +1)', 'Magic in the Shadows', 'Area combat spell that affects spirits.'),
  s('Spiritbolt', 'Combat', 'Combat', 'M', 'F(R)', 'I', 'LOS', '-1(Damage Level)', 'Magic in the Shadows', 'Single-target combat spell that affects spirits.'),
  s('Stunball', 'Combat', 'Combat', 'M', 'W(R)', 'I', 'LOS(A)', '-1(Damage Level +1)', 'SR3 Core', 'Area mana combat spell causing stun damage.'),
  s('Stunbolt', 'Combat', 'Combat', 'M', 'W(R)', 'I', 'LOS', '-1(Damage Level)', 'SR3 Core', 'Single-target mana combat spell causing stun damage.'),
  s('Stun Touch', 'Combat', 'Combat', 'M', 'W(R)', 'I', 'T', '-1(Damage Level -1)', 'Magic in the Shadows', 'Touch-range stun combat spell.'),
  s('Wreck (Object)', 'Combat', 'Combat', 'P', 'OR', 'I', 'LOS', '+1(Damage Level -1)', 'Magic in the Shadows', 'Line-of-sight object-specific physical damage spell.'),

  s('Analyze Device', 'Detection', 'Detection', 'P', 'OR', 'S', 'T/D', '+1(M)', 'SR3 Core', 'Gives the subject analytical insight into a device or object.'),
  s('Analyze Magic', 'Detection', 'Detection', 'M', 'F(R)', 'S', 'T/D', '(L)', 'Magic in the Shadows', 'Lets the subject analyze magical phenomena similarly to assensing.'),
  s('Analyze Truth', 'Detection', 'Detection', 'M', 'W(R)', 'S', 'T/D', '(L)', 'SR3 Core', 'Helps the subject evaluate whether statements are truthful.'),
  s('Animal (Sense)', 'Detection', 'Detection', 'M', 'W(R)', 'S', 'T/D', '(M)', 'Magic in the Shadows', 'Lets the subject borrow a chosen mundane animal sense.'),
  s('Astral Window', 'Detection', 'Detection', 'M', 'F(R)', 'S', 'T/D', '(L)', 'Magic in the Shadows', 'Lets an astrally active subject see through astral barriers.'),
  s('Catalog', 'Detection', 'Detection', 'P', '6', 'S', 'T/A', '+1(M)', 'Magic in the Shadows', 'Compiles an itemized inventory of nonliving items in range.'),
  s('Clairaudience', 'Detection', 'Detection', 'M', '6(R)', 'S', 'T/D', '(M)', 'SR3 Core', 'Grants magical remote hearing as a directional sense.'),
  s('Clairvoyance', 'Detection', 'Detection', 'M', '6(R)', 'S', 'T/D', '(M)', 'SR3 Core', 'Grants magical remote sight as a directional sense.'),
  s('Combat Sense', 'Detection', 'Detection', 'M', '4', 'S', 'T', '(S)', 'SR3 Core', 'Heightens the subject’s awareness of combat threats.'),
  s('Detect Enemies', 'Detection', 'Detection', 'M', 'DT(R)', 'S', 'T/A', '(M)', 'SR3 Core', 'Detects beings with hostile intent toward the subject.'),
  s('Detect Individual', 'Detection', 'Detection', 'M', 'DT(R)', 'S', 'T/A', '(L)', 'SR3 Core', 'Detects a specific known individual.'),
  s('Detect Life', 'Detection', 'Detection', 'M', 'DT(R)', 'S', 'T/A', '(L)', 'SR3 Core', 'Detects living beings in the sense area.'),
  s('Detect (Life Form)', 'Detection', 'Detection', 'M', 'DT(R)', 'S', 'T/A', '-1(L)', 'SR3 Core', 'Detects a specified category of life form.'),
  s('Detect Magic', 'Detection', 'Detection', 'M', '6(R)', 'S', 'T/A', '(L)', 'SR3 Core', 'Detects magical presences or effects.'),
  s('Detect (Object)', 'Detection', 'Detection', 'P', 'DT', 'S', 'T/A', '+1(M)', 'SR3 Core', 'Detects a specified object category.'),
  s('Diagnose', 'Detection', 'Detection', 'M', 'W(R)', 'I', 'T/D', '-1(L)', 'Magic in the Shadows', 'Provides health and medical condition information about a target.'),
  s('Enhance Aim', 'Detection', 'Detection', 'M', '6(R)', 'S', 'T/D', '(M)', 'Magic in the Shadows', 'Improves the subject’s ranged targeting through magical sensing.'),
  s('Eyes of the Pack', 'Detection', 'Detection', 'M', '6(V)', 'S', 'T/D', '(M)', 'Magic in the Shadows', 'Lets the subject borrow sight from voluntary metahuman pack members.'),
  s('Mindlink', 'Detection', 'Detection', 'M', '4(V)', 'S', 'LOS/D', '(S)', 'SR3 Core', 'Creates a telepathic communication link with a voluntary target.'),
  s('Mind Probe', 'Detection', 'Detection', 'M', 'W(R)', 'S', 'T/D', '(S)', 'SR3 Core', 'Reads information from a target’s mind.'),
  s('Night Vision', 'Detection', 'Detection', 'P', '6(V)', 'S', 'T/D', '+1(L)', 'Magic in the Shadows', 'Grants low-light vision to a voluntary subject.'),
  s('Translate', 'Detection', 'Detection', 'M', '4(V)', 'S', 'T/D', '(M)', 'Magic in the Shadows', 'Provides rough intent-based speech translation.'),

  s('Alleviate Allergy', 'Health', 'Health', 'P', '10 - Essence(V)', 'S', 'T', '(Allergy Level)', 'Magic in the Shadows', 'Temporarily reduces the effects of one allergy.'),
  s('Antidote', 'Health', 'Health', 'M', 'Toxin Power(V)', 'P', 'T', '(Toxin Damage Level)', 'SR3 Core', 'Helps neutralize a toxin affecting the target.'),
  s('Awaken', 'Health', 'Health', 'M', '4(V)', 'I', 'T', '-2(Stun Damage Level)', 'Magic in the Shadows', 'Temporarily wakes an unconscious target without healing stun damage.'),
  s('Cause Allergy', 'Health', 'Health', 'P', '10 - Essence(R)', 'S', 'T', '+2(Allergy Level +1)', 'Magic in the Shadows', 'Inflicts a chosen allergic reaction on a resisted target.'),
  s('Cripple Limb', 'Health', 'Health', 'P', 'B(T)', 'S', 'T', '+1(S)', 'Magic in the Shadows', 'Imposes penalties by disabling an organic limb while sustained.'),
  s('Cure Disease', 'Health', 'Health', 'M', 'Disease Power(V)', 'P', 'T', '(Disease Damage Level)', 'SR3 Core', 'Helps cure a disease affecting the target.'),
  s('Decrease (Attribute)', 'Health', 'Health', 'M', '10 - Essence(R)', 'S', 'T', '+1(S)', 'SR3 Core', 'Reduces one natural Attribute while sustained.'),
  s('Decrease (Cybered Att.)', 'Health', 'Health', 'P', '10 - Essence(R)', 'S', 'T', '+2(S)', 'SR3 Core', 'Reduces one cyber-enhanced Attribute while sustained.'),
  s('Decrease Cybered React.', 'Health', 'Health', 'P', '10 - Essence(R)', 'S', 'T', '+2(D)', 'Magic in the Shadows', 'Reduces cyber-enhanced Reaction while sustained.'),
  s('Decrease Reaction', 'Health', 'Health', 'M', '10 - Essence(R)', 'S', 'T', '+1(D)', 'Magic in the Shadows', 'Reduces natural Reaction while sustained.'),
  s('Decrease Reflexes -1 Initiative Die', 'Health', 'Health', 'P', '10 - Essence(R)', 'S', 'T', '+2(D)', 'Magic in the Shadows', 'Removes up to one Initiative die while sustained.'),
  s('Decrease Reflexes -2 Initiative Dice', 'Health', 'Health', 'P', '10 - Essence(R)', 'S', 'T', '+4(D)', 'Magic in the Shadows', 'Removes up to two Initiative dice while sustained.'),
  s('Decrease Reflexes -3 Initiative Dice', 'Health', 'Health', 'P', '10 - Essence(R)', 'S', 'T', '+6(D)', 'Magic in the Shadows', 'Removes up to three Initiative dice while sustained.'),
  s('Detox', 'Health', 'Health', 'M', 'Toxin Power(V)', 'P', 'T', '-2(Toxin Damage Level)', 'SR3 Core', 'Flushes or counters toxin effects on a voluntary target.'),
  s('Fast', 'Health', 'Health', 'M', '4(V)', 'P', 'T', '-2(M)', 'Magic in the Shadows', 'Suppresses hunger and thirst for a limited time.'),
  s('Heal', 'Health', 'Health', 'M', '10 - Essence(V)', 'P', 'T', '(Damage Level)', 'SR3 Core', 'Heals physical damage on a voluntary target.'),
  s('Healthy Glow', 'Health', 'Health', 'M', '4(V)', 'P', 'T', '(L)', 'SR3 Core', 'Cosmetic health spell for a refreshed, healthy appearance.'),
  s('Hibernate', 'Health', 'Health', 'M', '4(V)', 'S', 'T', '+1(M)', 'SR3 Core', 'Places a voluntary target into controlled hibernation.'),
  s('Increase (Attribute)', 'Health', 'Health', 'M', 'Attribute(V)', 'S', 'T', '+1(M)', 'SR3 Core', 'Boosts one natural Attribute while sustained.'),
  s('Increase (Cybered Att.)', 'Health', 'Health', 'P', 'Attribute(V)', 'S', 'T', '+2(M)', 'SR3 Core', 'Boosts one cyber-enhanced Attribute while sustained.'),
  s('Increase Reaction', 'Health', 'Health', 'M', 'Reaction(V)', 'S', 'T', '+1(S)', 'SR3 Core', 'Boosts Reaction while sustained.'),
  s('Increase Reflexes +1 Initiative Die', 'Health', 'Health', 'M', 'Reaction(V)', 'S', 'T', '+1(S)', 'SR3 Core', 'Adds up to one Initiative die while sustained.'),
  s('Increase Reflexes +2 Initiative Dice', 'Health', 'Health', 'M', 'Reaction(V)', 'S', 'T', '+1(D)', 'SR3 Core', 'Adds up to two Initiative dice while sustained.'),
  s('Increase Reflexes +3 Initiative Dice', 'Health', 'Health', 'M', 'Reaction(V)', 'S', 'T', '+3(D)', 'SR3 Core', 'Adds up to three Initiative dice while sustained.'),
  s('Intoxication', 'Health', 'Health', 'P', 'B(R)', 'P', 'T', '+1(D)', 'Magic in the Shadows', 'Causes magical inebriation and target-number penalties.'),
  s('Nutrition', 'Health', 'Health', 'P', '4(V)', 'P', 'T', '+1(M)', 'Magic in the Shadows', 'Provides temporary nourishment after becoming permanent.'),
  s('Oxygenate', 'Health', 'Health', 'P', '4(V)', 'S', 'T', '+2(L)', 'SR3 Core', 'Helps a voluntary target function without normal breathing.'),
  s('Preserve', 'Health', 'Health', 'P', '4', 'P', 'T', '+1(M)', 'Magic in the Shadows', 'Preserves inert organic matter from decay.'),
  s('Prophylaxis', 'Health', 'Health', 'M', '4(V)', 'S', 'T', '+1(L)', 'SR3 Core', 'Protective health spell against disease or toxin exposure.'),
  s('Resist Pain', 'Health', 'Health', 'M', '4(V)', 'P', 'T', '-2(Damage Level)', 'SR3 Core', 'Suppresses wound modifiers without healing the injury.'),
  s('Stabilize', 'Health', 'Health', 'M', '4 + minutes(V)', 'P', 'T', '+1(M)', 'SR3 Core', 'Stabilizes a dying or critically injured target.'),
  s('Treat', 'Health', 'Health', 'M', '10 - Essence(V)', 'P', 'T', '-1(Damage Level)', 'SR3 Core', 'Immediate post-injury healing support spell.'),

  s('Agony', 'Illusion', 'Directed Illusion', 'M', 'W(R)', 'S', 'LOS', '(M)', 'Magic in the Shadows', 'Creates an illusion of pain that imposes penalties.'),
  s('Blindness', 'Illusion', 'Directed Illusion', 'P', 'I(R)', 'S', 'LOS', '+1(M)', 'Magic in the Shadows', 'Interferes with visual perception for living or sensor targets.'),
  s('Chaff', 'Illusion', 'Directed Illusion', 'P', 'OR', 'S', 'LOS', '(S)', 'Magic in the Shadows', 'Sensor-only version of a chaos-style illusion.'),
  s('Chaos', 'Illusion', 'Directed Illusion', 'P', 'I(R)', 'S', 'LOS', '+1(S)', 'SR3 Core', 'Imposes sensory confusion on a single target.'),
  s('Chaotic World', 'Illusion', 'Directed Illusion', 'P', 'I(R)', 'S', 'LOS(A)', '+1(D)', 'SR3 Core', 'Area version of Chaos.'),
  s('Confusion', 'Illusion', 'Directed Illusion', 'M', 'W(R)', 'S', 'LOS', '(S)', 'SR3 Core', 'Mana illusion that confuses a single target.'),
  s('Dream', 'Illusion', 'Directed Illusion', 'M', 'W(R)', 'S', 'LOS', '(M)', 'Magic in the Shadows', 'Sends crafted dream imagery to a sleeping target.'),
  s('Entertainment', 'Illusion', 'Directed Illusion', 'M', 'W(V)', 'S', 'LOS(A)', '(L)', 'SR3 Core', 'Creates voluntary sensory entertainment for an area.'),
  s('Flak', 'Illusion', 'Directed Illusion', 'P', 'OR', 'S', 'LOS(A)', '(D)', 'Magic in the Shadows', 'Area sensor-only version of Chaotic World.'),
  s('Flash', 'Illusion', 'Directed Illusion', 'P', 'I(R)', 'I', 'LOS(A)', '(S)', 'Magic in the Shadows', 'Creates a blinding physical flash in an area.'),
  s('Mass Agony', 'Illusion', 'Directed Illusion', 'M', 'W(R)', 'S', 'LOS(A)', '(S)', 'Magic in the Shadows', 'Area version of Agony.'),
  s('Mass Blindness', 'Illusion', 'Directed Illusion', 'P', 'I(R)', 'S', 'LOS(A)', '+1(S)', 'Magic in the Shadows', 'Area version of Blindness.'),
  s('Mass Confusion', 'Illusion', 'Directed Illusion', 'M', 'W(R)', 'S', 'LOS(A)', '(D)', 'SR3 Core', 'Area mana confusion illusion.'),
  s('Stench', 'Illusion', 'Directed Illusion', 'M', 'W(R)', 'S', 'LOS(A)', '(S)', 'Magic in the Shadows', 'Area illusion of sickening smell.'),
  s('Stink', 'Illusion', 'Directed Illusion', 'M', 'W(R)', 'S', 'LOS', '(M)', 'Magic in the Shadows', 'Single-target illusion of sickening smell.'),
  s('Trid Entertainment', 'Illusion', 'Directed Illusion', 'P', 'I(V)', 'S', 'LOS(A)', '+1(L)', 'SR3 Core', 'Physical version of Entertainment that can affect technological senses.'),
  s('Camouflage', 'Illusion', 'Indirect Illusion', 'M', '4(R)', 'S', 'LOS', '(L)', 'Magic in the Shadows', 'Colors the subject to blend with surroundings for living observers.'),
  s('Double Image', 'Illusion', 'Indirect Illusion', 'M', '4(R)', 'S', 'T', '(S)', 'Magic in the Shadows', 'Creates a misleading duplicate image of the subject.'),
  s('Foreboding', 'Illusion', 'Indirect Illusion', 'M', '4(R)', 'S', 'LOS(A)', '(D)', 'Magic in the Shadows', 'Creates an area mood of supernatural dread.'),
  s('Hot Potato', 'Illusion', 'Indirect Illusion', 'M', '4(R)', 'S', 'LOS(A)', '(M)', 'Magic in the Shadows', 'Makes objects seem painfully or urgently undesirable to hold.'),
  s('Improved Invisibility', 'Illusion', 'Indirect Illusion', 'P', '4(R)', 'S', 'LOS', '+1(M)', 'SR3 Core', 'Physical invisibility illusion that can affect technological sensors.'),
  s('Invisibility', 'Illusion', 'Indirect Illusion', 'M', '4(R)', 'S', 'LOS', '(M)', 'SR3 Core', 'Mana invisibility illusion for living observers.'),
  s('Mask', 'Illusion', 'Indirect Illusion', 'M', '4(R)', 'S', 'LOS', '(M)', 'SR3 Core', 'Changes the subject’s perceived appearance for living observers.'),
  s('Phantasm', 'Illusion', 'Indirect Illusion', 'M', '4(R)', 'S', 'LOS(A)', '(D)', 'SR3 Core', 'Area mana illusion creating a believable scene or image.'),
  s('Physical Camouflage', 'Illusion', 'Indirect Illusion', 'P', '4(R)', 'S', 'LOS', '+1(L)', 'Magic in the Shadows', 'Physical camouflage illusion that also affects sensors.'),
  s('Physical Double Image', 'Illusion', 'Indirect Illusion', 'P', '4(R)', 'S', 'T', '+1(S)', 'Magic in the Shadows', 'Sensor-affecting version of Double Image.'),
  s('Physical Mask', 'Illusion', 'Indirect Illusion', 'P', '4(R)', 'S', 'LOS', '+1(M)', 'SR3 Core', 'Sensor-affecting version of Mask.'),
  s('Silence', 'Illusion', 'Indirect Illusion', 'P', '4(R)', 'S', 'LOS(A)', '+1(S)', 'SR3 Core', 'Area physical sound-suppression illusion.'),
  s('Stealth', 'Illusion', 'Indirect Illusion', 'P', '4(R)', 'S', 'LOS', '+1(M)', 'SR3 Core', 'Physical illusion that suppresses signs of the subject’s movement.'),
  s('Trid Phantasm', 'Illusion', 'Indirect Illusion', 'P', '4(R)', 'S', 'LOS(A)', '+1(D)', 'SR3 Core', 'Sensor-affecting version of Phantasm.'),
  s('Vehicle Mask', 'Illusion', 'Indirect Illusion', 'P', '4(R)', 'S', 'LOS', '+1(S)', 'Magic in the Shadows', 'Masks a vehicle’s apparent appearance.'),

  s('Alter Memory', 'Manipulation', 'Control Manipulation', 'M', 'W(T)', 'P', 'LOS', '(D)', 'Magic in the Shadows', 'Permanently alters a target memory if the spell overcomes threshold.'),
  s('Calm Animal', 'Manipulation', 'Control Manipulation', 'M', 'W(T)', 'S', 'LOS', '(M)', 'Magic in the Shadows', 'Calms one animal while sustained.'),
  s('Calm Pack', 'Manipulation', 'Control Manipulation', 'M', 'W(T)', 'S', 'LOS(A)', '(S)', 'Magic in the Shadows', 'Area version of Calm Animal.'),
  s('Compel Truth', 'Manipulation', 'Control Manipulation', 'M', 'W(T)', 'S', 'LOS', '+1(M)', 'Magic in the Shadows', 'Compels truthful speech while sustained.'),
  s('Control Actions', 'Manipulation', 'Control Manipulation', 'M', 'W(T)', 'S', 'LOS', '+1(M)', 'SR3 Core', 'Controls a target’s physical actions while sustained.'),
  s('Control Animal', 'Manipulation', 'Control Manipulation', 'M', 'W(T)', 'S', 'LOS', '(S)', 'Magic in the Shadows', 'Controls one animal while sustained.'),
  s('Control Emotion', 'Manipulation', 'Control Manipulation', 'M', 'W(T)', 'S', 'LOS', '+1(M)', 'SR3 Core', 'Manipulates a target’s emotional state.'),
  s('Control Pack', 'Manipulation', 'Control Manipulation', 'M', 'W(T)', 'S', 'LOS(A)', '(D)', 'Magic in the Shadows', 'Area version of Control Animal.'),
  s('Control Thoughts', 'Manipulation', 'Control Manipulation', 'M', 'W(T)', 'S', 'LOS', '+1(S)', 'SR3 Core', 'Controls a target’s thoughts while sustained.'),
  s('Influence', 'Manipulation', 'Control Manipulation', 'M', 'W(T)', 'P', 'LOS', '(S)', 'SR3 Core', 'Plants a suggestion that can become permanent.'),
  s('Mob Mind', 'Manipulation', 'Control Manipulation', 'M', 'W(T)', 'S', 'LOS(A)', '+1(D)', 'Magic in the Shadows', 'Area version of Control Thoughts.'),
  s('Mob Mood', 'Manipulation', 'Control Manipulation', 'M', 'W(T)', 'S', 'LOS(A)', '+1(S)', 'Magic in the Shadows', 'Area version of Control Emotion.'),
  s('Acid Stream', 'Manipulation', 'Elemental Manipulation', 'P', '4(RC)', 'I', 'LOS', '+1(Damage Level +1)', 'SR3 Core', 'Single-target acid elemental manipulation attack.'),
  s('Ball Lightning', 'Manipulation', 'Elemental Manipulation', 'P', '4(RC)', 'I', 'LOS(A)', '+1(Damage Level +2)', 'SR3 Core', 'Area lightning elemental manipulation attack.'),
  s('Fireball', 'Manipulation', 'Elemental Manipulation', 'P', '4(RC)', 'I', 'LOS(A)', '+1(Damage Level +2)', 'SR3 Core', 'Area fire elemental manipulation attack.'),
  s('Flamethrower', 'Manipulation', 'Elemental Manipulation', 'P', '4(RC)', 'I', 'LOS', '+1(Damage Level +1)', 'SR3 Core', 'Single-target fire elemental manipulation attack.'),
  s('Laser', 'Manipulation', 'Elemental Manipulation', 'P', '4(RC)', 'I', 'LOS', '+1(Damage Level +1)', 'Magic in the Shadows', 'Single-target laser elemental manipulation attack.'),
  s('Lightning Bolt', 'Manipulation', 'Elemental Manipulation', 'P', '4(RC)', 'I', 'LOS', '+1(Damage Level +1)', 'SR3 Core', 'Single-target lightning elemental manipulation attack.'),
  s('Nova', 'Manipulation', 'Elemental Manipulation', 'P', '4(RC)', 'I', 'LOS(A)', '+1(Damage Level +2)', 'Magic in the Shadows', 'Area intense light/heat elemental manipulation attack.'),
  s('Smoke Cloud', 'Manipulation', 'Elemental Manipulation', 'P', '4(RC)', 'I', 'LOS(A)', '(Damage Level +2)', 'Magic in the Shadows', 'Area smoke elemental manipulation attack/effect.'),
  s('Steam', 'Manipulation', 'Elemental Manipulation', 'P', '4(RC)', 'I', 'LOS', '(Damage Level +1)', 'Magic in the Shadows', 'Single-target steam elemental manipulation attack.'),
  s('Thunderbolt', 'Manipulation', 'Elemental Manipulation', 'P', '4(RC)', 'I', 'LOS', '(Damage Level +1)', 'Magic in the Shadows', 'Single-target sound/impact elemental manipulation attack.'),
  s('Thunderclap', 'Manipulation', 'Elemental Manipulation', 'P', '4(RC)', 'I', 'LOS(A)', '(Damage Level +2)', 'Magic in the Shadows', 'Area sound/impact elemental manipulation attack.'),
  s('Toxic Wave', 'Manipulation', 'Elemental Manipulation', 'P', '4(RC)', 'I', 'LOS(A)', '+1(Damage Level +2)', 'SR3 Core', 'Area toxic elemental manipulation attack.'),
  s('Animate', 'Manipulation', 'Telekinetic Manipulation', 'P', 'OR', 'S', 'LOS', '+1(M)', 'Magic in the Shadows', 'Animates an object while sustained.'),
  s('Bind', 'Manipulation', 'Telekinetic Manipulation', 'P', 'Q(R)', 'S', 'LOS', '+2(M)', 'Magic in the Shadows', 'Restrains a target through telekinetic force.'),
  s('Catfall', 'Manipulation', 'Telekinetic Manipulation', 'P', '4', 'S', 'LOS', '+1(M)', 'Magic in the Shadows', 'Cushions or controls a fall.'),
  s('Clout', 'Manipulation', 'Telekinetic Manipulation', 'P', '4(RC)', 'I', 'LOS', '(Damage Level)', 'SR3 Core', 'Telekinetic impact attack.'),
  s('Deflect', 'Manipulation', 'Telekinetic Manipulation', 'P', '4', 'S', 'LOS', '+2(M)', 'Magic in the Shadows', 'Telekinetically deflects incoming attacks or objects.'),
  s('Fling', 'Manipulation', 'Telekinetic Manipulation', 'P', '4(RC)', 'I', 'T', '+1(M)', 'SR3 Core', 'Launches a touched object telekinetically.'),
  s('Gecko Crawl', 'Manipulation', 'Telekinetic Manipulation', 'P', '4', 'S', 'LOS', '+2(M)', 'Magic in the Shadows', 'Lets a subject cling to surfaces while sustained.'),
  s('Levitate', 'Manipulation', 'Telekinetic Manipulation', 'P', '4(R)', 'S', 'LOS', '+2(M)', 'SR3 Core', 'Moves a subject or object through the air.'),
  s('Lock', 'Manipulation', 'Telekinetic Manipulation', 'P', '4', 'S', 'LOS', '+2(M)', 'Magic in the Shadows', 'Holds a portal or mechanism shut.'),
  s('Magic Fingers', 'Manipulation', 'Telekinetic Manipulation', 'P', '6', 'S', 'LOS', '+2(M)', 'SR3 Core', 'Creates telekinetic manipulation hands.'),
  s('Net', 'Manipulation', 'Telekinetic Manipulation', 'P', 'Q(R)', 'S', 'LOS(A)', '+2(S)', 'Magic in the Shadows', 'Area telekinetic restraint.'),
  s('Poltergeist', 'Manipulation', 'Telekinetic Manipulation', 'P', '4(R)', 'S', 'LOS(A)', '+1(M)', 'SR3 Core', 'Creates chaotic telekinetic movement in an area.'),
  s('Redirect', 'Manipulation', 'Telekinetic Manipulation', 'P', '4(RC)', 'I', 'LOS', '+1(Damage Level)', 'Magic in the Shadows', 'Redirects a projectile or attack path telekinetically.'),
  s('Shape Earth', 'Manipulation', 'Telekinetic Manipulation', 'P', '4', 'S', 'LOS(A)', '+2(M)', 'Magic in the Shadows', 'Shapes earth in an area while sustained.'),
  s('Shape Water', 'Manipulation', 'Telekinetic Manipulation', 'P', '4', 'S', 'LOS(A)', '+2(M)', 'Magic in the Shadows', 'Shapes water in an area while sustained.'),
  s('Use (Skill)', 'Manipulation', 'Telekinetic Manipulation', 'P', '6', 'S', 'LOS', '+2(L)', 'Magic in the Shadows', 'Uses a known skill telekinetically; each skill is a separate spell.'),
  s('Alter Temperature', 'Manipulation', 'Transformation Manipulation', 'P', '4', 'S', 'LOS(A)', '+2(M)', 'Magic in the Shadows', 'Changes temperature in an area while sustained.'),
  s('Armor', 'Manipulation', 'Transformation Manipulation', 'P', '6', 'S', 'LOS', '+2(M)', 'SR3 Core', 'Creates a magical armor field around the target.'),
  s('Astral Armor', 'Manipulation', 'Transformation Manipulation', 'M', '6', 'S', 'LOS', '+1(M)', 'Magic in the Shadows', 'Astral version of Armor for astral protection.'),
  s('Astral Barrier', 'Manipulation', 'Transformation Manipulation', 'M', '6', 'S', 'LOS(A)', '+1(S)', 'SR3 Core', 'Creates a sustained astral barrier.'),
  s('Clean (Element)', 'Manipulation', 'Transformation Manipulation', 'P', '6', 'P', 'LOS(A)', '+1(S)', 'Magic in the Shadows', 'Purifies or cleans a specified element or substance category.'),
  s('Control Fire', 'Manipulation', 'Transformation Manipulation', 'P', 'Power of fire', 'S', 'LOS(A)', '+2(M)', 'Magic in the Shadows', 'Controls existing fire in an area.'),
  s('Create Food', 'Manipulation', 'Transformation Manipulation', 'P', '4', 'P', 'LOS', '+1(S)', 'Magic in the Shadows', 'Creates edible food after becoming permanent.'),
  s('Fashion', 'Manipulation', 'Transformation Manipulation', 'P', '6', 'P', 'T', '+1(L)', 'Magic in the Shadows', 'Alters clothing or fabric appearance.'),
  s('Firewall', 'Manipulation', 'Transformation Manipulation', 'P', '4', 'S', 'LOS(A)', '+2(S)', 'Magic in the Shadows', 'Creates a sustained wall or area of fire.'),
  s('Fix', 'Manipulation', 'Transformation Manipulation', 'P', 'OR', 'P', 'T', '(S)', 'Magic in the Shadows', 'Repairs damage to an object.'),
  s('Flame Aura', 'Manipulation', 'Transformation Manipulation', 'P', '4', 'S', 'LOS', '+2(M)', 'Magic in the Shadows', 'Surrounds a target with a damaging flame aura.'),
  s('Freeze Water', 'Manipulation', 'Transformation Manipulation', 'P', '4', 'I', 'LOS(A)', '+1(M)', 'Magic in the Shadows', 'Freezes water in an area.'),
  s('Glue', 'Manipulation', 'Transformation Manipulation', 'P', '4', 'S', 'LOS', '+2(M)', 'Magic in the Shadows', 'Makes one target surface or object sticky.'),
  s('Glue Strip', 'Manipulation', 'Transformation Manipulation', 'P', '4', 'S', 'LOS(A)', '+2(S)', 'Magic in the Shadows', 'Area version of Glue.'),
  s('Ice Sheet', 'Manipulation', 'Transformation Manipulation', 'P', '4', 'I', 'LOS(A)', '+1(S)', 'SR3 Core', 'Creates a slick sheet of ice in an area.'),
  s('Ignite', 'Manipulation', 'Transformation Manipulation', 'P', '4(T)', 'P', 'LOS', '+1(D)', 'SR3 Core', 'Ignites a target if threshold is overcome.'),
  s('Light', 'Manipulation', 'Transformation Manipulation', 'P', '4', 'S', 'LOS(A)', '+2(M)', 'SR3 Core', 'Creates magical light in an area.'),
  s('Limited Armor', 'Manipulation', 'Transformation Manipulation', 'P', '6', 'S', 'LOS', '+2(L)', 'Magic in the Shadows', 'Armor variant limited to a chosen damage type.'),
  s('Limited Physical Barrier', 'Manipulation', 'Transformation Manipulation', 'P', '6', 'S', 'LOS(A)', '+2(M)', 'Magic in the Shadows', 'Physical barrier variant limited to a chosen damage type.'),
  s('Makeover', 'Manipulation', 'Transformation Manipulation', 'P', '6(V)', 'P', 'LOS', '+1(M)', 'Magic in the Shadows', 'Cosmetically changes the target after becoming permanent.'),
  s('Mana Static', 'Manipulation', 'Transformation Manipulation', 'M', '4', 'P', 'LOS(A)', '(D)', 'Magic in the Shadows', 'Creates a persistent magical static zone.'),
  s('Mist', 'Manipulation', 'Transformation Manipulation', 'P', '4', 'I', 'LOS(A)', '+1(M)', 'Magic in the Shadows', 'Creates mist in an area.'),
  s('Petrify', 'Manipulation', 'Transformation Manipulation', 'P', 'B(T)', 'S', 'LOS', '+1(S)', 'SR3 Core', 'Transforms living flesh toward stone while sustained.'),
  s('Physical Barrier', 'Manipulation', 'Transformation Manipulation', 'P', '6', 'S', 'LOS(A)', '+2(S)', 'SR3 Core', 'Creates a sustained physical barrier.'),
  s('Reinforce', 'Manipulation', 'Transformation Manipulation', 'P', 'OR', 'S', 'LOS', '+1(M)', 'Magic in the Shadows', 'Strengthens an object while sustained.'),
  s('Shadow', 'Manipulation', 'Transformation Manipulation', 'P', '4', 'S', 'LOS(A)', '+2(M)', 'Magic in the Shadows', 'Creates supernatural shadow or dimness in an area.'),
  s('Shapechange', 'Manipulation', 'Transformation Manipulation', 'P', 'B(T)(V)', 'S', 'LOS', '+1(M)', 'Magic in the Shadows', 'Transforms a voluntary living target into a critter form while sustained.'),
  s('Spell Shield', 'Manipulation', 'Transformation Manipulation', 'M', '6', 'S', 'LOS', '(M)', 'Magic in the Shadows', 'Creates a protective magical shield against spells.'),
  s('Spell Wall', 'Manipulation', 'Transformation Manipulation', 'M', '6', 'S', 'LOS(A)', '(S)', 'Magic in the Shadows', 'Area wall version of Spell Shield.'),
  s('Spirit Barrier', 'Manipulation', 'Transformation Manipulation', 'M', '6', 'S', 'LOS(A)', '(S)', 'Magic in the Shadows', 'Barrier against spirits.'),
  s('Sterilize', 'Manipulation', 'Transformation Manipulation', 'P', '4', 'I', 'LOS(A)', '+1(M)', 'Magic in the Shadows', 'Cleans an area of biological traces or contaminants.'),
  s('Transform', 'Manipulation', 'Transformation Manipulation', 'P', 'B(T)', 'S', 'LOS', '+1(S)', 'Magic in the Shadows', 'Transforms a living target while sustained.'),
  s('Wind', 'Manipulation', 'Transformation Manipulation', 'P', '4', 'S', 'LOS(A)', '+2(M)', 'Magic in the Shadows', 'Creates or controls wind in an area.'),
].sort((a, b) => a.name.localeCompare(b.name))

export const spellsById = new Map(spellCatalogue.map((spellRecord) => [spellRecord.id, spellRecord]))
