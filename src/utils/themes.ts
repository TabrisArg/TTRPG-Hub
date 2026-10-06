import { VisualTheme } from '../types/deltaGreen';

export interface ThemeMeta {
  id: VisualTheme;
  label: string;
  shortName: string;
  tagline: string;
  classificationBanner: string;
}

export const VISUAL_THEMES: ThemeMeta[] = [
  {
    id: 'default-light',
    label: 'Default Light',
    shortName: 'Default Light',
    tagline: 'Clean Modern Interface · Light Appearance',
    classificationBanner: 'CHARACTER SHEET ARCHIVE · LIGHT EDITION',
  },
  {
    id: 'default-dark',
    label: 'Default Dark',
    shortName: 'Default Dark',
    tagline: 'Clean Modern Interface · Dark Appearance',
    classificationBanner: 'CHARACTER SHEET ARCHIVE · DARK APPEARANCE',
  },
  {
    id: 'delta-green',
    label: 'Delta Green',
    shortName: 'Delta Green',
    tagline: 'Classified Federal Dossier · Tactical Phosphor',
    classificationBanner: 'DD FORM 315 · TOP SECRET // ORCON // SPECIAL ACCESS',
  },
  {
    id: 'dnd',
    label: 'Dungeons & Dragons',
    shortName: 'D&D Style',
    tagline: 'High Fantasy Grimoire · Crimson & Burnished Gold',
    classificationBanner: 'ADVENTURER CHRONICLE · REALMS & DUNGEONS ARCHIVE',
  },
  {
    id: 'call-of-cthulhu',
    label: 'Call of Cthulhu',
    shortName: 'Call of Cthulhu',
    tagline: '1920s Arkham Investigation · Eldritch Sepia & Verdigris',
    classificationBanner: 'MISKATONIC UNIVERSITY ARCHIVES · INVESTIGATOR FILE',
  },
  {
    id: 'paranoia',
    label: 'Paranoia',
    shortName: 'Paranoia',
    tagline: 'Alpha Complex Terminal · Friend Computer Red Clearance',
    classificationBanner: 'FRIEND COMPUTER // ALPHA COMPLEX TERMINAL · CLEARANCE: RED',
  },
  {
    id: 'warhammer-40k',
    label: 'Warhammer 40k',
    shortName: 'Warhammer 40k',
    tagline: 'Imperium of Man · Inquisition & Mechanicus Cogitator',
    classificationBanner: 'ADEPTUS ADMINISTRATUM // INQUISITORIAL COGITATOR DATASLATE · M41',
  },
];

export function getThemeMeta(theme: VisualTheme): ThemeMeta {
  return VISUAL_THEMES.find((t) => t.id === theme) || VISUAL_THEMES[1];
}
