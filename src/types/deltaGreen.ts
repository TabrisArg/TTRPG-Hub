export type StatKey = 'STR' | 'CON' | 'DEX' | 'INT' | 'POW' | 'CHA';

export type VisualTheme =
  | 'default-light'
  | 'default-dark'
  | 'delta-green'
  | 'dnd'
  | 'call-of-cthulhu'
  | 'paranoia'
  | 'warhammer-40k';

export type DossierPage =
  | 'personal'
  | 'stats-psych'
  | 'skills'
  | 'injuries-equipment'
  | 'remarks';

export type GmAssetCategory = 'npc' | 'location' | 'image' | 'document';

export type DocumentVisualStyle =
  | 'official-document'
  | 'bloody-letter'
  | 'napkin-note'
  | 'old-computer'
  | 'small-sign'
  | 'large-sign'
  | 'fantasy-scroll'
  | 'night-sky'
  | 'pond-water'
  | 'clouds-sky';

export type DocumentFontStyle =
  | 'mono'
  | 'typewriter'
  | 'handwritten'
  | 'terminal'
  | 'serif'
  | 'display'
  | 'cloud'
  | 'fantasy';

export type TimelineEntryType = 'asset' | 'message' | 'timeskip' | 'scribble';

export type ScribbleInkColor = 'black' | 'white' | 'red' | 'blue' | 'green';

export type ScribblePenThickness = 'small' | 'mid' | 'large';

export type BlankDocumentBackground =
  | 'solid-white'
  | 'solid-black'
  | 'solid-gray'
  | 'crumbled-paper'
  | 'wall-texture'
  | 'formal-letter'
  | 'wood-panel'
  | 'dirt-texture'
  | 'hand-texture'
  | 'fantasy-scroll'
  | 'night-sky'
  | 'pond-water'
  | 'clouds-sky';

export interface GmAsset {
  id: string;
  ownerId: string;
  gameSystem: 'delta-green';
  category: GmAssetCategory;
  title: string;
  subtitle: string;
  imageUrl: string;
  publicContent: string;
  gmSecretNotes: string;
  docStyle: DocumentVisualStyle | '';
  docFont: DocumentFontStyle | '';
  docSignature: string;
  updatedAt: string;
}

export interface SharedSessionItem {
  id: string;
  entryType?: TimelineEntryType;
  category: GmAssetCategory;
  title: string;
  subtitle: string;
  imageUrl: string;
  publicContent: string;
  docStyle: DocumentVisualStyle | '';
  docFont: DocumentFontStyle | '';
  docSignature: string;
  sharedAt: string;
  authorName?: string;
  authorRole?: 'GM' | 'PLAYER';
}

export interface SessionRollEntry {
  id: string;
  rollerName: string;
  label: string;
  formula: string;
  result: number;
  details: string;
  isPrivate: boolean;
  timestamp: string;
}

export interface CombatantEntry {
  id: string;
  name: string;
  dexOrInit: number;
  hpCurrent: number;
  hpMax: number;
  status: string;
  isNpc: boolean;
  isActiveTurn: boolean;
  /** Whether players can see this combatant's HP in encounters */
  isHpPublic?: boolean;
}

export interface ThreatClockEntry {
  id: string;
  name: string;
  filled: number;
  segments: number;
  isPublic: boolean;
}

export interface SessionJoinedPlayer {
  uid: string;
  name: string;
  email: string;
  characterId: string;
  characterName: string;
}

export interface SceneState {
  title: string;
  location: string;
  dateTime: string;
  /** Saved present campaign time when the GM initiates a -time flashback */
  presentDateTime?: string;
  alertLevel: 'NORMAL' | 'SURVEILLANCE' | 'COMBAT' | 'CONTAINMENT BREACH';
  publicNotes: string;
}

export interface GameSession {
  id: string;
  gmId: string;
  gmName: string;
  gmEmail: string;
  gameSystem: 'delta-green';
  title: string;
  description: string;
  status: 'active' | 'paused' | 'archived';
  invitedEmails: string[];
  joinedPlayers: SessionJoinedPlayer[];
  sceneState: SceneState;
  spotlightItem: SharedSessionItem | Record<string, never>;
  sharedItems: SharedSessionItem[];
  publicRolls: SessionRollEntry[];
  privateRolls: SessionRollEntry[];
  combatTracker: CombatantEntry[];
  clocks: ThreatClockEntry[];
  updatedAt: string;
}

export interface StatData {
  key: StatKey;
  label: string;
  score: number;
  distinguishingFeatures: string;
}

export interface DerivedAttributes {
  hp: { max: number; current: number };
  wp: { max: number; current: number };
  san: { max: number; current: number };
  bp: { max: number; current: number };
  autoCalculateMax: boolean;
}

export interface BondItem {
  id: string;
  name: string;
  score: number;
}

export interface AdaptationData {
  violence: [boolean, boolean, boolean];
  violenceAdapted: boolean;
  helplessness: [boolean, boolean, boolean];
  helplessnessAdapted: boolean;
}

export interface SkillItem {
  id: string;
  name: string;
  base: number;
  value: number;
  checked: boolean;
  hasSpecialty?: boolean;
  specialty?: string;
  isUnnatural?: boolean;
  column: 1 | 2 | 3;
}

export interface CustomSkillItem {
  id: string;
  name: string;
  value: number;
  checked: boolean;
}

export interface WeaponItem {
  id: string;
  slot: string;
  name: string;
  skill: number;
  baseRange: string;
  damage: string;
  armorPiercing: string;
  lethality: number;
  killRadius: string;
  ammo: number;
  maxAmmo: number;
}

export interface SpecialTrainingItem {
  id: string;
  name: string;
  skillOrStatUsed: string;
}

export interface AgentCharacter {
  id: string;
  updatedAt: string;
  ownerId?: string;
  ownerName?: string;
  sessionId?: string;
  sessionGmId?: string;
  portraitUrl?: string;
  // Section 1-7: Personal Data
  fullNameAndAlias: string; // 1. LAST NAME, FIRST NAME (AND ALIAS OR CODE NAME IF APPLICABLE)
  professionAndRank: string; // 2. PROFESSION (RANK IF APPLICABLE)
  employer: string; // 3. EMPLOYER
  nationality: string; // 4. NATIONALITY
  sex: 'F' | 'M' | 'OTHER' | ''; // 5. SEX
  sexOtherText: string;
  ageAndDob: string; // 6. AGE AND D.O.B.
  educationAndOccupation: string; // 7. EDUCATION AND OCCUPATIONAL HISTORY

  // Section 8-10: Statistical Data
  statistics: Record<StatKey, StatData>; // 8. STATISTICS
  derived: DerivedAttributes; // 9. DERIVED ATTRIBUTES
  physicalDescription: string; // 10. PHYSICAL DESCRIPTION

  // Section 11-13: Psychological Data
  bonds: BondItem[]; // 11. BONDS
  motivationsAndDisorders: string; // 12. MOTIVATIONS AND MENTAL DISORDERS
  adaptation: AdaptationData; // 13. INCIDENTS OF SAN LOSS WITHOUT GOING INSANE

  // Applicable Skill Sets
  skills: SkillItem[];
  foreignLanguagesAndOther: CustomSkillItem[];

  // Page 2: Section 14-21
  woundsAndAilments: string; // 14. WOUNDS AND AILMENTS
  firstAidAttempted: boolean; // Has First Aid been attempted since the last injury?
  armorAndGear: string; // 15. ARMOR AND GEAR
  armorRating: number;
  weapons: WeaponItem[]; // 16. WEAPONS (a)-(g)
  personalDetailsAndNotes: string; // 17. PERSONAL DETAILS AND NOTES
  developmentsHomeAndFamily: string; // 18. DEVELOPMENTS WHICH AFFECT HOME AND FAMILY
  specialTraining: SpecialTrainingItem[]; // 19. SPECIAL TRAINING
  recruitmentNote: string; // Please indicate why this agent was recruited and why the agent agreed to be recruited.
  authorizingOfficer: string; // 20. AUTHORIZING OFFICER
  agentSignature: string; // 21. AGENT SIGNATURE
}
