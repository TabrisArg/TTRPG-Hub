import { GmAsset, SharedSessionItem } from '../types/deltaGreen';

// Clean hand-coded SVG Data URIs (no generative AI content)
const SVG_NPC_DOSSIER_BADGE = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 400" width="320" height="400">
    <rect width="320" height="400" fill="#0B0E0D"/>
    <rect x="12" y="12" width="296" height="376" fill="#121715" stroke="#232B28" stroke-width="2"/>
    <line x1="12" y1="60" x2="308" y2="60" stroke="#232B28" stroke-width="1"/>
    <text x="24" y="40" fill="#4ADE80" font-family="monospace" font-size="12" font-weight="bold">PERSONNEL FILE // CASE OFFICER</text>
    <circle cx="160" cy="165" r="46" fill="#19201E" stroke="#16A34A" stroke-width="2"/>
    <path d="M90 295 C90 235 230 235 230 295 Z" fill="#19201E" stroke="#16A34A" stroke-width="2"/>
    <rect x="28" y="325" width="264" height="40" fill="#0B0E0D" stroke="#232B28" stroke-width="1"/>
    <text x="160" y="350" fill="#8C9692" font-family="monospace" font-size="11" text-anchor="middle">ID VERIFIED · CLEARANCE LEVEL 4</text>
  </svg>`
)}`;

const SVG_LOCATION_BLUEPRINT = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 320" width="480" height="320">
    <rect width="480" height="320" fill="#091318"/>
    <g stroke="#163240" stroke-width="1">
      <line x1="0" y1="40" x2="480" y2="40"/><line x1="0" y1="80" x2="480" y2="80"/>
      <line x1="0" y1="120" x2="480" y2="120"/><line x1="0" y1="160" x2="480" y2="160"/>
      <line x1="0" y1="200" x2="480" y2="200"/><line x1="0" y1="240" x2="480" y2="240"/>
      <line x1="0" y1="280" x2="480" y2="280"/>
      <line x1="60" y1="0" x2="60" y2="320"/><line x1="120" y1="0" x2="120" y2="320"/>
      <line x1="180" y1="0" x2="180" y2="320"/><line x1="240" y1="0" x2="240" y2="320"/>
      <line x1="300" y1="0" x2="300" y2="320"/><line x1="360" y1="0" x2="360" y2="320"/>
      <line x1="420" y1="0" x2="420" y2="320"/>
    </g>
    <rect x="60" y="50" width="360" height="220" fill="none" stroke="#38BDF8" stroke-width="3"/>
    <rect x="80" y="70" width="90" height="45" fill="#0E222D" stroke="#38BDF8" stroke-width="1.5"/>
    <text x="125" y="97" fill="#7DD3FC" font-family="monospace" font-size="10" text-anchor="middle">LOCKERS 1-2</text>
    <rect x="290" y="70" width="110" height="60" fill="#0E222D" stroke="#38BDF8" stroke-width="1.5"/>
    <text x="345" y="104" fill="#7DD3FC" font-family="monospace" font-size="10" text-anchor="middle">WORKBENCH</text>
    <line x1="200" y1="270" x2="280" y2="270" stroke="#FBBF24" stroke-width="5"/>
    <text x="240" y="295" fill="#FBBF24" font-family="monospace" font-size="11" text-anchor="middle">ROLL-UP DOOR (14B)</text>
    <text x="24" y="28" fill="#38BDF8" font-family="monospace" font-size="12" font-weight="bold">ARCHITECTURAL SCHEMATIC // GREEN BOX #094</text>
  </svg>`
)}`;

const SVG_ARCHIVE_OSCILLOGRAPH = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 300" width="480" height="300">
    <rect width="480" height="300" fill="#070B09"/>
    <rect x="16" y="16" width="448" height="268" fill="#0B130F" stroke="#16A34A" stroke-width="2"/>
    <g stroke="#143321" stroke-width="1">
      <line x1="16" y1="83" x2="464" y2="83"/>
      <line x1="16" y1="150" x2="464" y2="150"/>
      <line x1="16" y1="217" x2="464" y2="217"/>
      <line x1="128" y1="16" x2="128" y2="284"/>
      <line x1="240" y1="16" x2="240" y2="284"/>
      <line x1="352" y1="16" x2="352" y2="284"/>
    </g>
    <polyline fill="none" stroke="#4ADE80" stroke-width="2.5" points="24,150 70,150 85,110 100,195 115,65 130,235 145,90 160,180 175,150 230,150 245,55 260,245 275,75 290,220 305,150 370,150 385,120 400,180 415,150 456,150"/>
    <text x="30" y="42" fill="#4ADE80" font-family="monospace" font-size="12" font-weight="bold">EXHIBIT A // SIGNAL TRACE 19.4 KHZ</text>
    <text x="30" y="268" fill="#8C9692" font-family="monospace" font-size="11">REC: 03:14:22 HRS · GAIN +12dB · ANOMALY DETECTED</text>
  </svg>`
)}`;

export const STARTER_GM_ASSETS: Omit<
  GmAsset,
  'id' | 'ownerId' | 'gameSystem' | 'updatedAt'
>[] = [
  {
    category: 'npc',
    title: 'Agent Marcus Vance ("Case Officer")',
    subtitle: 'A-Cell Handler // Operational Briefing Officer',
    imageUrl: SVG_NPC_DOSSIER_BADGE,
    publicContent:
      'Veteran federal liaison assigned to brief the cell at the Green Box facility. Speaks in clipped, measured sentences and carries a weathered leather briefcase chained to his wrist.',
    gmSecretNotes:
      'STR 11, CON 12, DEX 10, INT 15, POW 14, CHA 12 · HP 12, WP 14, SAN 58 · Skills: Bureaucracy 70%, HUMINT 65%, Firearms 55%, Occult 40%. Knows the combination to Locker #2 (example NPC card — delete anytime).',
    docStyle: '',
    docFont: '',
    docSignature: '',
  },
  {
    category: 'location',
    title: 'Green Box #094 — Storage Unit 14B',
    subtitle: '38.8951° N, 77.0364° W // Industrial Corridor',
    imageUrl: SVG_LOCATION_BLUEPRINT,
    publicContent:
      'A climate-controlled 10×20 cinderblock storage unit behind a rusted roll-up door. Inside: steel shelving, two padlocked footlockers, a folding metal table, and an unplugged field radio.',
    gmSecretNotes:
      'Padlock key is taped beneath the folding table. Footlocker #2 contains a false bottom with three sealed evidence bags from the 1998 operation (example Location card — delete anytime).',
    docStyle: '',
    docFont: '',
    docSignature: '',
  },
  {
    category: 'image',
    title: 'Exhibit A — Acoustic Anomaly Oscillograph',
    subtitle: 'EVIDENCE LOG #44-B // RECOVERED RELAY TAPE',
    imageUrl: SVG_ARCHIVE_OSCILLOGRAPH,
    publicContent:
      'Technical photograph of the oscilloscope trace recorded at the relay station at 03:14 HRS immediately prior to the facility power failure.',
    gmSecretNotes:
      'Agents with SIGINT 40%+ or Science (Physics) 30%+ recognize the repeating pulse as an artificial carrier wave originating underground (example Archive Image — delete anytime).',
    docStyle: '',
    docFont: '',
    docSignature: '',
  },
  {
    category: 'document',
    title: 'DIRECTIVE 14-G // CONTAINMENT PROTOCOL',
    subtitle: 'TOP SECRET // EYES ONLY — OPERATIONAL CELL',
    imageUrl: '',
    publicContent:
      '1. Proceed to Green Box #094 no later than 2200 HRS.\n2. Inventory all physical contents and secure Case File #44-B.\n3. Do NOT engage local law enforcement under official agency credentials.\n4. Report any unauthorized entry or missing inventory immediately via the primary dead-drop.',
    gmSecretNotes:
      'Example of the Official Document visual style. You can edit or delete this handout at any time.',
    docStyle: 'official-document',
    docFont: 'typewriter',
    docSignature: 'A-CELL // OPERATIONS DIRECTORATE',
  },
  {
    category: 'document',
    title: 'Torn Journal Page (Room 304)',
    subtitle: 'Recovered from motel nightstand drawer',
    imageUrl: '',
    publicContent:
      "Don't trust the dial tone on the landline. I unplugged the phone from the wall an hour ago and it still rang three times. Whatever is down in the sub-level knows we opened the locker.",
    gmSecretNotes:
      'Example of the Bloody Letter visual style. Grants +1% Unnatural if cross-referenced with the relay tape.',
    docStyle: 'bloody-letter',
    docFont: 'handwritten',
    docSignature: '— R.M.',
  },
  {
    category: 'document',
    title: 'Diner Napkin Dead-Drop Note',
    subtitle: 'Left under the coffee cup at Booth 4',
    imageUrl: '',
    publicContent:
      'Storage Gate Code: 4912#\nUnit 14B — Padlock key is taped under the folding metal table.\nGet rid of this napkin after reading.',
    gmSecretNotes: 'Example of the Note in a Napkin visual style.',
    docStyle: 'napkin-note',
    docFont: 'handwritten',
    docSignature: '— V.',
  },
  {
    category: 'document',
    title: 'GREENBOX_INVENTORY_LOG.TXT',
    subtitle: 'TERMINAL NODE // LOCAL DISK A:',
    imageUrl: '',
    publicContent:
      '> MOUNT VOLUME: GB_094_ARCHIVE\n> LAST ACCESS: 10/14/1998 03:12:09\n> ITEM 01: 2x AN/PRC-127 FIELD RADIOS [OK]\n> ITEM 02: 1x LEAD-LINED SPECIMEN CANISTER [SEAL BROKEN]\n> WARNING: CHECKSUM MISMATCH ON SECTOR 09',
    gmSecretNotes: 'Example of the Old School Computer Text visual style.',
    docStyle: 'old-computer',
    docFont: 'terminal',
    docSignature: 'SYSTEM_EOF // RETURN CODE 0',
  },
  {
    category: 'document',
    title: 'AUTHORIZED PERSONNEL ONLY',
    subtitle: 'SUB-BASEMENT ACCESS DOOR B2',
    imageUrl: '',
    publicContent:
      'HIGH VOLTAGE RELAY EQUIPMENT BEYOND THIS POINT.\nTwo-person sign-in and protective gear required at all times.',
    gmSecretNotes: 'Example of the Small Sign visual style.',
    docStyle: 'small-sign',
    docFont: 'display',
    docSignature: 'FACILITY MAINTENANCE',
  },
  {
    category: 'document',
    title: 'QUARANTINE ZONE — DO NOT ENTER',
    subtitle: 'STRUCTURAL & BIOLOGICAL HAZARD',
    imageUrl: '',
    publicContent:
      'THIS FACILITY IS CLOSED BY ORDER OF COUNTY HEALTH & SAFETY.\nUNAUTHORIZED ENTRY WILL RESULT IN IMMEDIATE DETENTION.',
    gmSecretNotes: 'Example of the Large Sign visual style.',
    docStyle: 'large-sign',
    docFont: 'display',
    docSignature: 'ORDER #88-401',
  },
];

export function buildStarterSessionSharedItems(): SharedSessionItem[] {
  const nowStr = new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  return STARTER_GM_ASSETS.map((item, idx) => ({
    id: `starter-shared-${idx + 1}-${Date.now()}`,
    category: item.category,
    title: item.title,
    subtitle: item.subtitle,
    imageUrl: item.imageUrl,
    publicContent: item.publicContent,
    docStyle: item.docStyle,
    docFont: item.docFont,
    docSignature: item.docSignature,
    sharedAt: nowStr,
  }));
}
