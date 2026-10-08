import React, { useState } from 'react';
import {
  FileText,
  MapPin,
  UserSquare2,
  Image as ImageIcon,
  Terminal,
  AlertTriangle,
  Stamp,
  ZoomIn,
  PenTool,
  FolderPlus,
  Package,
  Shield,
  Check,
  Plus,
} from 'lucide-react';
import {
  DocumentFontStyle,
  DocumentVisualStyle,
  GmAsset,
  GmAssetCategory,
} from '../types/deltaGreen';
import { ImageZoomModal } from './ImageZoomModal';
import { AddToGmLibraryModal } from './AddToGmLibraryModal';

export const DOCUMENT_VISUAL_STYLES: {
  id: DocumentVisualStyle;
  label: string;
  defaultFont: DocumentFontStyle;
  description: string;
}[] = [
  {
    id: 'official-document',
    label: 'Official Document',
    defaultFont: 'typewriter',
    description: 'Classified government form with agency header, seal border, and stamp',
  },
  {
    id: 'bloody-letter',
    label: 'Bloody Letter',
    defaultFont: 'handwritten',
    description: 'Stained parchment with crimson blood spatters and desperate ink',
  },
  {
    id: 'napkin-note',
    label: 'Note in a Napkin',
    defaultFont: 'handwritten',
    description: 'Folded cafe napkin with smudged ballpoint pen scrawl',
  },
  {
    id: 'old-computer',
    label: 'Old School Computer Text',
    defaultFont: 'terminal',
    description: 'Retro CRT phosphor monitor with terminal scanlines and prompt',
  },
  {
    id: 'small-sign',
    label: 'Small Sign',
    defaultFont: 'mono',
    description: 'Compact bolted door plaque or engraved room notice',
  },
  {
    id: 'large-sign',
    label: 'Large Sign',
    defaultFont: 'display',
    description: 'High-visibility facility billboard or quarantine hazard sign',
  },
  {
    id: 'fantasy-scroll',
    label: 'Fantasy Scroll',
    defaultFont: 'fantasy',
    description: 'Ancient rolled parchment scroll with wooden rods and wax seal',
  },
  {
    id: 'night-sky',
    label: 'Words in the Night Sky',
    defaultFont: 'serif',
    description: 'Glowing celestial starlight lettering written across the midnight cosmos',
  },
  {
    id: 'pond-water',
    label: 'Words in a Pond',
    defaultFont: 'serif',
    description: 'Shimmering aquatic words rippling across a tranquil body of water',
  },
  {
    id: 'clouds-sky',
    label: 'Words in the Clouds',
    defaultFont: 'cloud',
    description: 'Fluffy cloud-shaped letters drifting across a bright blue sky',
  },
];

export const DOCUMENT_FONT_OPTIONS: {
  id: DocumentFontStyle;
  label: string;
  fontFamily: string;
}[] = [
  {
    id: 'typewriter',
    label: 'Vintage Typewriter (Special Elite)',
    fontFamily: "'Special Elite', 'IBM Plex Mono', monospace",
  },
  {
    id: 'handwritten',
    label: 'Handwritten Scrawl (Caveat)',
    fontFamily: "'Caveat', cursive",
  },
  {
    id: 'terminal',
    label: 'Retro CRT Terminal (Share Tech Mono)',
    fontFamily: "'Share Tech Mono', 'IBM Plex Mono', monospace",
  },
  {
    id: 'mono',
    label: 'Clinical Monospace (IBM Plex Mono)',
    fontFamily: "'IBM Plex Mono', monospace",
  },
  {
    id: 'serif',
    label: 'Archival Serif (Cormorant Garamond)',
    fontFamily: "'Cormorant Garamond', Georgia, serif",
  },
  {
    id: 'display',
    label: 'Heavy Display Sign (Syne / Orbitron)',
    fontFamily: "'Syne', 'Orbitron', sans-serif",
  },
  {
    id: 'cloud',
    label: 'Cloud Style Font (Rubik Bubbles)',
    fontFamily: "'Rubik Bubbles', 'Syne', cursive, sans-serif",
  },
  {
    id: 'fantasy',
    label: 'Fantasy Scroll Script (MedievalSharp / Cinzel)',
    fontFamily: "'MedievalSharp', 'Cinzel', 'Cormorant Garamond', serif",
  },
];

export function getDocumentFontFamily(font: DocumentFontStyle | ''): string {
  const found = DOCUMENT_FONT_OPTIONS.find((f) => f.id === font);
  return found ? found.fontFamily : "'Special Elite', 'IBM Plex Mono', monospace";
}

interface StyledHandoutRendererProps {
  category: GmAssetCategory;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  publicContent: string;
  docStyle?: DocumentVisualStyle | '';
  docFont?: DocumentFontStyle | '';
  docSignature?: string;
  gmSecretNotes?: string;
  showGmSecrets?: boolean;
  compact?: boolean;
  onShareScribbleToTimeline?: (dataUrl: string, title: string) => Promise<void>;
  onSaveToGmLibrary?: (
    draft: Omit<GmAsset, 'id' | 'ownerId' | 'gameSystem' | 'updatedAt'>
  ) => Promise<string | void>;
  onAddToCharacterEquipment?: (card: {
    category: 'item' | 'equipment';
    name: string;
    imageUrl: string;
    description: string;
    effect?: string;
  }) => Promise<void> | void;
  equipTargetLabel?: string;
}

export const StyledHandoutRenderer: React.FC<StyledHandoutRendererProps> = ({
  category,
  title,
  subtitle = '',
  imageUrl = '',
  publicContent,
  docStyle = 'official-document',
  docFont = 'typewriter',
  docSignature = '',
  gmSecretNotes = '',
  showGmSecrets = false,
  compact = false,
  onShareScribbleToTimeline,
  onSaveToGmLibrary,
  onAddToCharacterEquipment,
  equipTargetLabel,
}) => {
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [showAddToLibrary, setShowAddToLibrary] = useState(false);
  const [addedToGear, setAddedToGear] = useState(false);

  const activeDocStyle: DocumentVisualStyle =
    (docStyle as DocumentVisualStyle) || 'official-document';
  const activeFont: DocumentFontStyle =
    (docFont as DocumentFontStyle) || 'typewriter';
  const fontFamily = getDocumentFontFamily(activeFont);
  const isHandwritten = activeFont === 'handwritten';

  // Render Styled Document (6 distinct visual styles)
  if (category === 'document') {
    return (
      <div className="space-y-3">
        {/* 1. OFFICIAL DOCUMENT */}
        {activeDocStyle === 'official-document' && (
          <div
            style={{
              fontFamily,
              backgroundColor: '#F4F1EA',
              color: '#18181B',
            }}
            className={`relative border-2 border-[#27272A] shadow-xl mx-auto ${
              compact ? 'p-4 max-w-full' : 'p-6 sm:p-8 max-w-2xl'
            }`}
          >
            <div className="border-b-2 border-[#27272A] pb-3 mb-4 flex items-start justify-between gap-3">
              <div>
                <div
                  style={{ color: '#991B1B' }}
                  className="text-[10px] tracking-[0.22em] font-bold uppercase"
                >
                  {subtitle || 'CLASSIFIED OFFICIAL MEMORANDUM // EYES ONLY'}
                </div>
                <h3
                  style={{ color: '#111827' }}
                  className={`${
                    compact ? 'text-base' : 'text-xl sm:text-2xl'
                  } font-bold tracking-tight mt-1`}
                >
                  {title || 'UNTITLED OFFICIAL DOCUMENT'}
                </h3>
              </div>
              <div
                style={{ color: '#991B1B', borderColor: '#991B1B' }}
                className="border-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest rotate-[-4deg] shrink-0 select-none flex items-center gap-1"
              >
                <Stamp size={12} />
                <span>FILE COPY</span>
              </div>
            </div>

            <div
              style={{ color: '#1F2937' }}
              className={`whitespace-pre-wrap leading-relaxed ${
                isHandwritten
                  ? compact
                    ? 'text-lg'
                    : 'text-2xl'
                  : compact
                  ? 'text-xs'
                  : 'text-sm sm:text-base'
              }`}
            >
              {publicContent || 'No document text provided.'}
            </div>

            {docSignature && (
              <div className="mt-6 pt-3 border-t border-[#D4D0C8] flex justify-end">
                <div className="text-right">
                  <div
                    style={{ color: '#71717A' }}
                    className="text-[10px] uppercase tracking-widest"
                  >
                    AUTHORIZED / SIGNED:
                  </div>
                  <div
                    style={{ color: '#18181B' }}
                    className="text-sm font-bold italic mt-0.5"
                  >
                    {docSignature}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. BLOODY LETTER */}
        {activeDocStyle === 'bloody-letter' && (
          <div
            style={{
              fontFamily,
              backgroundColor: '#E8D8C3',
              color: '#2A0808',
              backgroundImage:
                'radial-gradient(circle at 85% 18%, rgba(153, 27, 27, 0.38) 0%, rgba(153, 27, 27, 0.12) 16%, transparent 32%), radial-gradient(circle at 14% 82%, rgba(127, 29, 29, 0.45) 0%, rgba(127, 29, 29, 0.1) 22%, transparent 40%), radial-gradient(circle at 72% 76%, rgba(185, 28, 28, 0.28) 0%, transparent 18%), linear-gradient(180deg, #ECDCC8 0%, #DFCBB0 100%)',
            }}
            className={`relative border-2 border-[#7F1D1D] shadow-xl mx-auto ${
              compact ? 'p-4 max-w-full' : 'p-6 sm:p-8 max-w-2xl'
            }`}
          >
            {/* Corner blood drip accent */}
            <div className="pointer-events-none absolute top-0 right-6 w-3 h-10 bg-[#7F1D1D]/70 rounded-b-full" />
            <div className="pointer-events-none absolute top-0 right-11 w-1.5 h-6 bg-[#991B1B]/60 rounded-b-full" />

            {subtitle && (
              <div
                style={{ color: '#7F1D1D' }}
                className="text-xs uppercase tracking-widest font-bold mb-1"
              >
                {subtitle}
              </div>
            )}
            <h3
              style={{ color: '#450A0A' }}
              className={`${
                compact ? 'text-lg' : 'text-2xl sm:text-3xl'
              } font-bold border-b border-[#991B1B]/40 pb-2 mb-4`}
            >
              {title || 'STAINED LETTER'}
            </h3>

            <div
              style={{ color: '#2D0A0A' }}
              className={`whitespace-pre-wrap leading-relaxed ${
                isHandwritten
                  ? compact
                    ? 'text-xl'
                    : 'text-2xl sm:text-3xl'
                  : compact
                  ? 'text-xs'
                  : 'text-sm sm:text-base'
              }`}
            >
              {publicContent || 'No text legible.'}
            </div>

            {docSignature && (
              <div
                style={{ color: '#7F1D1D' }}
                className="mt-6 text-right font-bold italic text-lg"
              >
                — {docSignature}
              </div>
            )}
          </div>
        )}

        {/* 3. NOTE IN A NAPKIN */}
        {activeDocStyle === 'napkin-note' && (
          <div
            style={{
              fontFamily,
              backgroundColor: '#FAF8F2',
              color: '#1E3A8A',
              backgroundImage:
                'linear-gradient(135deg, rgba(0,0,0,0.03) 25%, transparent 25%, transparent 50%, rgba(0,0,0,0.03) 50%, rgba(0,0,0,0.03) 75%, transparent 75%, transparent)',
              backgroundSize: '24px 24px',
            }}
            className={`relative border-2 border-dashed border-[#CBD5E1] rounded-sm shadow-lg mx-auto ${
              compact ? 'p-4 max-w-full' : 'p-6 sm:p-8 max-w-md'
            }`}
          >
            {/* Napkin fold crease lines */}
            <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-[#E2E8F0]" />
            <div className="pointer-events-none absolute inset-y-0 left-1/2 border-l border-[#E2E8F0]" />

            <div className="relative z-10">
              {subtitle && (
                <div
                  style={{ color: '#64748B' }}
                  className="text-[11px] uppercase tracking-wider mb-1"
                >
                  {subtitle}
                </div>
              )}
              <h3
                style={{ color: '#172554' }}
                className={`${
                  compact ? 'text-base' : 'text-xl sm:text-2xl'
                } font-bold mb-3 underline decoration-[#93C5FD] underline-offset-4`}
              >
                {title || 'NAPKIN NOTE'}
              </h3>

              <div
                style={{ color: '#1E3A8A' }}
                className={`whitespace-pre-wrap leading-snug ${
                  isHandwritten
                    ? compact
                      ? 'text-xl'
                      : 'text-2xl sm:text-3xl'
                    : compact
                    ? 'text-xs'
                    : 'text-sm sm:text-base'
                }`}
              >
                {publicContent || 'Scrawled note...'}
              </div>

              {docSignature && (
                <div
                  style={{ color: '#1E40AF' }}
                  className="mt-4 text-right text-sm font-semibold"
                >
                  {docSignature}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. OLD SCHOOL COMPUTER TEXT */}
        {activeDocStyle === 'old-computer' && (
          <div
            style={{
              fontFamily,
              backgroundColor: '#041007',
              color: '#33FF66',
              backgroundImage:
                'repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.28), rgba(0, 0, 0, 0.28) 1px, transparent 1px, transparent 3px), linear-gradient(180deg, #041007 0%, #071A0C 100%)',
            }}
            className={`relative border-2 border-[#15803D] rounded shadow-2xl mx-auto ${
              compact ? 'p-4 max-w-full' : 'p-6 sm:p-8 max-w-2xl'
            }`}
          >
            <div
              style={{ color: '#4ADE80' }}
              className="flex items-center justify-between border-b border-[#15803D]/60 pb-2 mb-4 text-xs"
            >
              <span className="inline-flex items-center gap-1.5 font-bold">
                <Terminal size={13} />
                <span>{subtitle || 'CRT-OS // TERMINAL BUFFER'}</span>
              </span>
              <span>BAUD 9600 · TTY1</span>
            </div>

            <h3
              style={{ color: '#86EFAC' }}
              className={`${
                compact ? 'text-sm' : 'text-lg sm:text-xl'
              } font-bold uppercase tracking-wider mb-3`}
            >
              &gt; FILE: {title || 'SYSTEM_LOG.TXT'}
            </h3>

            <div
              style={{ color: '#33FF66' }}
              className={`whitespace-pre-wrap leading-relaxed ${
                compact ? 'text-xs' : 'text-sm sm:text-base'
              }`}
            >
              {publicContent || 'NO DATA IN BUFFER'}
              <span className="inline-block ml-1 animate-pulse">█</span>
            </div>

            {docSignature && (
              <div
                style={{ color: '#4ADE80' }}
                className="mt-5 pt-2 border-t border-[#15803D]/40 text-xs"
              >
                &gt; OPERATOR AUTH: {docSignature}
              </div>
            )}
          </div>
        )}

        {/* 5. SMALL SIGN */}
        {activeDocStyle === 'small-sign' && (
          <div
            style={{
              fontFamily,
              backgroundColor: '#1E2328',
              color: '#F4F4F5',
            }}
            className={`relative border-4 border-[#525B65] rounded shadow-lg mx-auto text-center ${
              compact ? 'p-4 max-w-sm' : 'p-6 max-w-md'
            }`}
          >
            {/* 4 Corner Bolts */}
            <span className="absolute top-2 left-2 w-2 h-2 rounded-full bg-[#71717A] border border-[#27272A]" />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#71717A] border border-[#27272A]" />
            <span className="absolute bottom-2 left-2 w-2 h-2 rounded-full bg-[#71717A] border border-[#27272A]" />
            <span className="absolute bottom-2 right-2 w-2 h-2 rounded-full bg-[#71717A] border border-[#27272A]" />

            <div className="border border-[#71717A]/60 px-4 py-3">
              {subtitle && (
                <div
                  style={{ color: '#A1A1AA' }}
                  className="text-[10px] uppercase tracking-[0.25em] mb-1"
                >
                  {subtitle}
                </div>
              )}
              <h3
                style={{ color: '#FACC15' }}
                className={`${
                  compact ? 'text-base' : 'text-lg sm:text-xl'
                } font-extrabold uppercase tracking-wider`}
              >
                {title || 'NOTICE'}
              </h3>
              <div
                style={{ color: '#E4E4E7' }}
                className={`mt-2 whitespace-pre-wrap ${
                  compact ? 'text-xs' : 'text-sm'
                }`}
              >
                {publicContent}
              </div>
              {docSignature && (
                <div
                  style={{ color: '#A1A1AA' }}
                  className="mt-3 text-[10px] uppercase tracking-widest"
                >
                  {docSignature}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 6. LARGE SIGN */}
        {activeDocStyle === 'large-sign' && (
          <div
            style={{
              fontFamily,
              backgroundColor: '#111315',
              color: '#FAFAFA',
            }}
            className={`relative border-4 border-[#FACC15] shadow-2xl mx-auto text-center ${
              compact ? 'p-4 max-w-full' : 'p-6 sm:p-10 max-w-2xl'
            }`}
          >
            <div
              style={{ backgroundColor: '#FACC15', color: '#111315' }}
              className="px-4 py-2 font-extrabold uppercase tracking-[0.2em] text-xs sm:text-sm flex items-center justify-center gap-2 mb-5"
            >
              <AlertTriangle size={16} />
              <span>{subtitle || 'WARNING // RESTRICTED AREA'}</span>
              <AlertTriangle size={16} />
            </div>

            <h3
              style={{ color: '#FFFFFF' }}
              className={`${
                compact ? 'text-xl' : 'text-2xl sm:text-4xl'
              } font-black uppercase tracking-tight mb-4`}
            >
              {title || 'LARGE FACILITY SIGN'}
            </h3>

            <div
              style={{ color: '#F4F4F5' }}
              className={`whitespace-pre-wrap font-semibold leading-snug ${
                compact ? 'text-sm' : 'text-base sm:text-xl'
              }`}
            >
              {publicContent}
            </div>

            {docSignature && (
              <div
                style={{ color: '#FACC15' }}
                className="mt-6 pt-3 border-t border-[#FACC15]/40 text-xs font-bold uppercase tracking-[0.2em]"
              >
                {docSignature}
              </div>
            )}
          </div>
        )}

        {/* 7. FANTASY SCROLL */}
        {activeDocStyle === 'fantasy-scroll' && (
          <div className="mx-auto max-w-2xl">
            {/* Top Rolled Scroll Rod */}
            <div
              style={{
                backgroundColor: '#78350F',
                backgroundImage:
                  'linear-gradient(90deg, #451A03 0%, #92400E 50%, #451A03 100%)',
              }}
              className="h-5 rounded-full border-2 border-[#78350F] shadow-lg flex items-center justify-between px-2"
            >
              <span className="w-3 h-3 rounded-full bg-[#F59E0B] border border-[#78350F]" />
              <span className="w-3 h-3 rounded-full bg-[#F59E0B] border border-[#78350F]" />
            </div>

            {/* Parchment Body */}
            <div
              style={{
                fontFamily,
                backgroundColor: '#EFE0BB',
                color: '#3B1D0A',
                backgroundImage:
                  'radial-gradient(circle at 50% 50%, rgba(254, 243, 199, 0.5) 0%, rgba(180, 83, 9, 0.22) 100%), linear-gradient(180deg, #E8D5A7 0%, #F3E6C8 50%, #E5CF9E 100%)',
              }}
              className={`relative mx-3 border-x-4 border-[#92400E] shadow-2xl ${
                compact ? 'p-5' : 'p-6 sm:p-10'
              }`}
            >
              <div className="border-2 border-[#B45309]/50 p-4 sm:p-6 relative">
                {subtitle && (
                  <div
                    style={{ color: '#92400E' }}
                    className="text-center text-xs uppercase tracking-[0.25em] font-bold mb-1"
                  >
                    ✦ {subtitle} ✦
                  </div>
                )}

                <h3
                  style={{ color: '#451A03' }}
                  className={`${
                    compact ? 'text-xl' : 'text-2xl sm:text-3xl'
                  } font-bold text-center border-b border-[#B45309]/40 pb-3 mb-4`}
                >
                  {title || 'ANCIENT PARCHMENT SCROLL'}
                </h3>

                <div
                  style={{ color: '#2C1507' }}
                  className={`whitespace-pre-wrap leading-relaxed ${
                    compact ? 'text-sm' : 'text-base sm:text-lg'
                  }`}
                >
                  {publicContent || 'The scroll awaits inscription...'}
                </div>

                {docSignature && (
                  <div className="mt-6 pt-3 border-t border-[#B45309]/30 flex items-center justify-end gap-3">
                    <div className="text-right">
                      <div
                        style={{ color: '#78350F' }}
                        className="text-[10px] uppercase tracking-widest"
                      >
                        SEALED BY:
                      </div>
                      <div
                        style={{ color: '#451A03' }}
                        className="text-sm sm:text-base font-bold italic"
                      >
                        {docSignature}
                      </div>
                    </div>
                    <div
                      style={{ backgroundColor: '#991B1B', color: '#FCA5A5' }}
                      className="w-9 h-9 rounded-full border-2 border-[#7F1D1D] shadow-md flex items-center justify-center text-[10px] font-bold select-none"
                    >
                      SEAL
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Rolled Scroll Rod */}
            <div
              style={{
                backgroundColor: '#78350F',
                backgroundImage:
                  'linear-gradient(90deg, #451A03 0%, #92400E 50%, #451A03 100%)',
              }}
              className="h-5 rounded-full border-2 border-[#78350F] shadow-lg flex items-center justify-between px-2"
            >
              <span className="w-3 h-3 rounded-full bg-[#F59E0B] border border-[#78350F]" />
              <span className="w-3 h-3 rounded-full bg-[#F59E0B] border border-[#78350F]" />
            </div>
          </div>
        )}

        {/* 8. WORDS IN THE NIGHT SKY (THEME-INDEPENDENT MIDNIGHT COSMOS) */}
        {activeDocStyle === 'night-sky' && (
          <div
            style={{
              fontFamily,
              backgroundColor: '#040717',
              color: '#F0F9FF',
              backgroundImage:
                'radial-gradient(circle at 20% 25%, rgba(99, 102, 241, 0.28) 0%, transparent 45%), radial-gradient(circle at 80% 70%, rgba(56, 189, 248, 0.22) 0%, transparent 50%), radial-gradient(2px 2px at 12% 18%, #FFFFFF 100%, transparent), radial-gradient(2px 2px at 28% 10%, #BAE6FD 100%, transparent), radial-gradient(1.5px 1.5px at 46% 16%, #FFFFFF 100%, transparent), radial-gradient(2.5px 2.5px at 68% 12%, #E0F2FE 100%, transparent), radial-gradient(1.5px 1.5px at 86% 20%, #FFFFFF 100%, transparent), radial-gradient(2px 2px at 18% 48%, #E0F2FE 100%, transparent), radial-gradient(1.5px 1.5px at 88% 52%, #FFFFFF 100%, transparent), radial-gradient(2px 2px at 22% 82%, #FFFFFF 100%, transparent), radial-gradient(2.5px 2.5px at 54% 88%, #BAE6FD 100%, transparent), radial-gradient(1.5px 1.5px at 79% 80%, #FFFFFF 100%, transparent), linear-gradient(180deg, #02040E 0%, #0A1332 52%, #040717 100%)',
            }}
            className={`relative border-2 border-[#38BDF8]/50 rounded-lg shadow-2xl mx-auto text-center overflow-hidden ${
              compact ? 'p-5 max-w-full' : 'p-8 sm:p-12 max-w-2xl'
            }`}
          >
            {/* Glowing Crescent Moon & Constellation Stars */}
            <div
              aria-hidden="true"
              className="pointer-events-none select-none absolute top-3.5 right-5 text-xl sm:text-2xl"
              style={{
                color: '#E0F2FE',
                textShadow: '0 0 14px rgba(186, 230, 253, 0.95)',
              }}
            >
              ☾ ✦
            </div>
            <div
              aria-hidden="true"
              className="pointer-events-none select-none absolute top-4 left-5 text-sm"
              style={{
                color: '#BAE6FD',
                textShadow: '0 0 10px rgba(186, 230, 253, 0.85)',
              }}
            >
              ✦ · ✧
            </div>

            {subtitle && (
              <div
                style={{
                  color: '#BAE6FD',
                  textShadow: '0 0 10px rgba(125, 211, 252, 0.85)',
                }}
                className="relative z-10 text-xs uppercase tracking-[0.3em] font-semibold mb-2"
              >
                ✦ {subtitle} ✦
              </div>
            )}

            <h3
              style={{
                color: '#FFFFFF',
                textShadow:
                  '0 0 12px rgba(255, 255, 255, 0.95), 0 0 28px rgba(56, 189, 248, 0.8)',
              }}
              className={`relative z-10 ${
                compact ? 'text-xl' : 'text-2xl sm:text-4xl'
              } font-bold tracking-wide mb-5`}
            >
              {title || 'WRITTEN IN THE STARS'}
            </h3>

            <div
              style={{
                color: '#E0F2FE',
                textShadow:
                  '0 0 10px rgba(224, 242, 254, 0.95), 0 0 22px rgba(56, 189, 248, 0.7)',
              }}
              className={`relative z-10 whitespace-pre-wrap leading-relaxed ${
                compact ? 'text-sm' : 'text-lg sm:text-2xl'
              }`}
            >
              {publicContent || 'Starlight forms words across the night sky...'}
            </div>

            {docSignature && (
              <div
                style={{
                  color: '#BAE6FD',
                  textShadow: '0 0 10px rgba(186, 230, 253, 0.85)',
                }}
                className="relative z-10 mt-8 pt-3 border-t border-[#38BDF8]/30 text-xs sm:text-sm tracking-[0.2em]"
              >
                ✦ {docSignature} ✦
              </div>
            )}
          </div>
        )}

        {/* 9. WORDS IN A POND (THEME-INDEPENDENT BODY OF WATER) */}
        {activeDocStyle === 'pond-water' && (
          <div
            style={{
              fontFamily,
              backgroundColor: '#052C36',
              color: '#ECFEFF',
              backgroundImage:
                'repeating-radial-gradient(circle at 50% 50%, rgba(34, 211, 238, 0.12) 0px, rgba(34, 211, 238, 0.12) 2px, transparent 3px, transparent 26px), radial-gradient(circle at 18% 22%, rgba(16, 185, 129, 0.25) 0%, transparent 40%), radial-gradient(circle at 82% 78%, rgba(6, 182, 212, 0.28) 0%, transparent 45%), linear-gradient(180deg, #04222A 0%, #083D4A 50%, #031B22 100%)',
            }}
            className={`relative border-2 border-[#22D3EE]/50 rounded-xl shadow-2xl mx-auto text-center overflow-hidden ${
              compact ? 'p-5 max-w-full' : 'p-8 sm:p-12 max-w-2xl'
            }`}
          >
            {/* Subtle Floating Lily Pads in Corners */}
            <div
              aria-hidden="true"
              style={{ backgroundColor: 'rgba(21, 128, 61, 0.65)' }}
              className="pointer-events-none absolute -top-3 -left-3 w-14 h-14 rounded-full border border-[#4ADE80]/45"
            />
            <div
              aria-hidden="true"
              style={{ backgroundColor: 'rgba(22, 101, 52, 0.65)' }}
              className="pointer-events-none absolute -bottom-4 -right-2 w-16 h-16 rounded-full border border-[#4ADE80]/45"
            />

            {subtitle && (
              <div
                style={{
                  color: '#67E8F9',
                  textShadow: '0 2px 10px rgba(34, 211, 238, 0.7)',
                }}
                className="relative z-10 text-xs uppercase tracking-[0.25em] font-semibold mb-2"
              >
                〰 {subtitle} 〰
              </div>
            )}

            <h3
              style={{
                color: '#ECFEFF',
                textShadow:
                  '0 2px 12px rgba(103, 232, 249, 0.9), 0 6px 24px rgba(6, 182, 212, 0.6)',
              }}
              className={`relative z-10 ${
                compact ? 'text-xl' : 'text-2xl sm:text-4xl'
              } font-bold italic tracking-wide mb-5`}
            >
              {title || 'REFLECTION IN THE WATER'}
            </h3>

            <div
              style={{
                color: '#CFFAFE',
                textShadow:
                  '0 2px 10px rgba(103, 232, 249, 0.85), 0 5px 18px rgba(8, 145, 178, 0.65)',
              }}
              className={`relative z-10 whitespace-pre-wrap leading-relaxed italic ${
                compact ? 'text-sm' : 'text-lg sm:text-2xl'
              }`}
            >
              {publicContent || 'Ripples form words across the surface of the pond...'}
            </div>

            {docSignature && (
              <div
                style={{
                  color: '#67E8F9',
                  textShadow: '0 2px 8px rgba(34, 211, 238, 0.75)',
                }}
                className="relative z-10 mt-7 pt-3 border-t border-[#22D3EE]/35 text-xs sm:text-sm italic tracking-widest"
              >
                〰 {docSignature} 〰
              </div>
            )}
          </div>
        )}

        {/* 10. WORDS IN THE CLOUDS (THEME-INDEPENDENT SKY BLUE + FLUFFY CLOUDS + HIGH CONTRAST) */}
        {activeDocStyle === 'clouds-sky' && (
          <div
            style={{
              fontFamily:
                activeFont === 'typewriter'
                  ? "'Rubik Bubbles', 'Syne', cursive, sans-serif"
                  : fontFamily,
              backgroundColor: '#1E88E5',
              color: '#FFFFFF',
              backgroundImage:
                'linear-gradient(180deg, #0277BD 0%, #1E88E5 52%, #4FC3F7 100%)',
            }}
            className={`relative border-2 border-[#7DD3FC] rounded-2xl shadow-2xl mx-auto text-center overflow-hidden ${
              compact ? 'p-5 max-w-full' : 'p-8 sm:p-12 max-w-2xl'
            }`}
          >
            {/* Sculpted Fluffy Clouds in the Sky Background */}
            <svg
              aria-hidden="true"
              viewBox="0 0 800 420"
              preserveAspectRatio="none"
              className="pointer-events-none select-none absolute inset-0 w-full h-full"
            >
              {/* Top-left fluffy cloud */}
              <g fill="rgba(255, 255, 255, 0.32)">
                <circle cx="95" cy="72" r="38" />
                <circle cx="135" cy="58" r="46" />
                <circle cx="182" cy="74" r="34" />
                <rect x="75" y="68" width="125" height="42" rx="20" />
              </g>
              {/* Top-right fluffy cloud */}
              <g fill="rgba(255, 255, 255, 0.30)">
                <circle cx="620" cy="64" r="34" />
                <circle cx="662" cy="48" r="48" />
                <circle cx="712" cy="66" r="36" />
                <rect x="600" y="60" width="130" height="42" rx="20" />
              </g>
              {/* Center-left distant cloud */}
              <g fill="rgba(255, 255, 255, 0.18)">
                <circle cx="210" cy="210" r="42" />
                <circle cx="265" cy="195" r="54" />
                <circle cx="320" cy="212" r="40" />
              </g>
              {/* Bottom-left cloud bank */}
              <g fill="rgba(255, 255, 255, 0.36)">
                <circle cx="65" cy="365" r="44" />
                <circle cx="122" cy="348" r="56" />
                <circle cx="185" cy="364" r="46" />
                <circle cx="235" cy="378" r="34" />
              </g>
              {/* Bottom-right cloud bank */}
              <g fill="rgba(255, 255, 255, 0.36)">
                <circle cx="575" cy="374" r="38" />
                <circle cx="630" cy="354" r="54" />
                <circle cx="695" cy="345" r="60" />
                <circle cx="755" cy="366" r="44" />
              </g>
            </svg>

            <div className="relative z-10">
              {subtitle && (
                <div
                  style={{
                    color: '#FFFFFF',
                    textShadow:
                      '0 2px 0 #01579B, 0 3px 8px rgba(1, 87, 155, 0.85)',
                  }}
                  className="text-xs sm:text-sm uppercase tracking-[0.22em] font-bold mb-2"
                >
                  ☁ {subtitle} ☁
                </div>
              )}

              <h3
                style={{
                  color: '#FFFFFF',
                  textShadow:
                    '0 3px 0 #01579B, 0 5px 14px rgba(1, 87, 155, 0.85), 0 -1px 2px rgba(1, 87, 155, 0.7)',
                }}
                className={`${
                  compact ? 'text-2xl' : 'text-3xl sm:text-5xl'
                } tracking-wide mb-5`}
              >
                {title || 'WORDS IN THE CLOUDS'}
              </h3>

              <div
                style={{
                  color: '#FFFFFF',
                  textShadow:
                    '0 2px 0 #01579B, 0 4px 12px rgba(1, 87, 155, 0.85), 0 -1px 2px rgba(1, 87, 155, 0.7)',
                }}
                className={`whitespace-pre-wrap leading-relaxed ${
                  compact ? 'text-base' : 'text-xl sm:text-3xl'
                }`}
              >
                {publicContent || 'Drifting clouds shape into words across the open sky...'}
              </div>

              {docSignature && (
                <div
                  style={{
                    color: '#FFFFFF',
                    textShadow:
                      '0 2px 0 #01579B, 0 3px 8px rgba(1, 87, 155, 0.85)',
                  }}
                  className="mt-7 pt-3 border-t border-white/50 text-sm sm:text-base tracking-widest"
                >
                  ☁ {docSignature} ☁
                </div>
              )}
            </div>
          </div>
        )}

        {/* Optional Attached Image on Styled Document */}
        {imageUrl && (
          <div className="bg-[#0B0E0D] border border-[#232B28] rounded p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
            {isZoomOpen && (
              <ImageZoomModal
                imageUrl={imageUrl}
                title={title}
                subtitle={subtitle}
                returnLabel="Return to Document Handout"
                onShareScribbleToTimeline={onShareScribbleToTimeline}
                onSaveToGmLibrary={onSaveToGmLibrary}
                onClose={() => setIsZoomOpen(false)}
              />
            )}
            {showAddToLibrary && onSaveToGmLibrary && (
              <AddToGmLibraryModal
                imageUrl={imageUrl}
                defaultTitle={title}
                onSaveToGmLibrary={onSaveToGmLibrary}
                onClose={() => setShowAddToLibrary(false)}
              />
            )}
            <button
              type="button"
              onClick={() => setIsZoomOpen(true)}
              className="relative w-24 h-24 rounded border border-[#232B28] hover:border-[#16A34A] overflow-hidden shrink-0 cursor-zoom-in"
            >
              <img
                src={imageUrl}
                alt={title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </button>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setIsZoomOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 h-7 px-3 rounded bg-[#121715] hover:bg-[#19201E] border border-[#232B28] text-xs font-mono-tabular text-[#4ADE80] whitespace-nowrap shrink-0 cursor-pointer"
              >
                <ZoomIn size={13} />
                <span>Zoom / Pen Scribble</span>
              </button>
              {onSaveToGmLibrary && (
                <button
                  type="button"
                  onClick={() => setShowAddToLibrary(true)}
                  className="inline-flex items-center justify-center gap-1.5 h-7 px-3 rounded bg-[#121715] hover:bg-[#19201E] border border-[#232B28] text-xs font-mono-tabular text-[#E2E6E4] hover:text-[#4ADE80] whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <FolderPlus size={13} className="text-[#4ADE80] shrink-0" />
                  <span>Add to GM Library</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Optional GM-Only Secret Box */}
        {showGmSecrets && gmSecretNotes && (
          <div className="bg-[#19151D] border border-[#D97706]/60 rounded p-3 text-xs">
            <div className="font-mono-tabular text-[10px] font-semibold text-[#FBBF24] uppercase mb-1">
              GM EYES ONLY // SECRET NOTES (HIDDEN FROM PLAYERS)
            </div>
            <div className="text-[#E2E6E4] whitespace-pre-wrap leading-relaxed">
              {gmSecretNotes}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Render NPC, Location, Archive Image, Item Card, or Equipment Card
  const isEquipableCard = category === 'item' || category === 'equipment';

  const handleEquipClick = async () => {
    if (!onAddToCharacterEquipment || !isEquipableCard) return;
    await onAddToCharacterEquipment({
      category,
      name: title || (category === 'equipment' ? 'Equipment' : 'Item'),
      imageUrl: imageUrl || '',
      description: publicContent || '',
      effect: category === 'equipment' ? subtitle : '',
    });
    setAddedToGear(true);
    window.setTimeout(() => setAddedToGear(false), 2000);
  };

  return (
    <div className="border border-[#232B28] bg-[#0B0E0D] rounded overflow-hidden">
      {isZoomOpen && imageUrl && (
        <ImageZoomModal
          imageUrl={imageUrl}
          title={title}
          subtitle={subtitle}
          returnLabel={`Return to ${
            category === 'npc'
              ? 'NPC Card'
              : category === 'location'
              ? 'Location Card'
              : category === 'item'
              ? 'Item Card'
              : category === 'equipment'
              ? 'Equipment Card'
              : 'Image Card'
          }`}
          onShareScribbleToTimeline={onShareScribbleToTimeline}
          onSaveToGmLibrary={onSaveToGmLibrary}
          onClose={() => setIsZoomOpen(false)}
        />
      )}
      {showAddToLibrary && onSaveToGmLibrary && (
        <AddToGmLibraryModal
          imageUrl={imageUrl}
          defaultTitle={title}
          defaultCategory={category}
          defaultSubtitle={subtitle}
          defaultPublicContent={publicContent}
          onSaveToGmLibrary={onSaveToGmLibrary}
          onClose={() => setShowAddToLibrary(false)}
        />
      )}

      <div className="p-4 flex flex-col sm:flex-row gap-4">
        {imageUrl ? (
          <div className="flex flex-col gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsZoomOpen(true)}
              title="Click to zoom into image or draw on it with Pen"
              className={`group relative ${
                category === 'npc'
                  ? 'w-28 h-36 sm:w-36 sm:h-44'
                  : category === 'item' || category === 'equipment'
                  ? 'w-32 h-32 sm:w-40 sm:h-40'
                  : 'w-full sm:w-56 h-44'
              } bg-[#121715] border border-[#232B28] hover:border-[#16A34A] rounded overflow-hidden flex items-center justify-center cursor-zoom-in`}
            >
              <img
                src={imageUrl}
                alt={title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <span className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded bg-[#0B0E0D]/90 border border-[#232B28] text-[10px] font-mono-tabular text-[#4ADE80] inline-flex items-center gap-1 shadow">
                <ZoomIn size={11} />
                <span>Zoom / Pen</span>
              </span>
            </button>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsZoomOpen(true)}
                className="flex-1 inline-flex items-center justify-center gap-1 h-7 px-2.5 rounded bg-[#121715] hover:bg-[#19201E] border border-[#232B28] text-[10px] font-mono-tabular text-[#4ADE80] whitespace-nowrap shrink-0 cursor-pointer"
              >
                <PenTool size={11} className="shrink-0" />
                <span>Zoom & Scribble</span>
              </button>

              {onSaveToGmLibrary && (
                <button
                  type="button"
                  onClick={() => setShowAddToLibrary(true)}
                  className="flex-1 inline-flex items-center justify-center gap-1 h-7 px-2.5 rounded bg-[#121715] hover:bg-[#19201E] border border-[#232B28] text-[10px] font-mono-tabular text-[#E2E6E4] hover:text-[#4ADE80] whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <FolderPlus size={11} className="text-[#4ADE80] shrink-0" />
                  <span>Add to GM Library</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div
            className={`${
              category === 'npc' ? 'w-24 h-32' : 'w-28 h-28'
            } bg-[#121715] border border-[#232B28] rounded shrink-0 flex flex-col items-center justify-center text-[#68736E]`}
          >
            {category === 'npc' && <UserSquare2 size={28} />}
            {category === 'location' && <MapPin size={28} />}
            {category === 'image' && <ImageIcon size={28} />}
            {category === 'item' && <Package size={28} />}
            {category === 'equipment' && <Shield size={28} />}
            <span className="font-mono-tabular text-[10px] mt-1 uppercase">
              {category}
            </span>
          </div>
        )}

        <div className="flex-1 min-w-0 space-y-2.5 flex flex-col justify-between">
          <div className="space-y-2">
            <div>
              <div className="inline-flex items-center gap-1.5 font-mono-tabular text-[10px] uppercase text-[#4ADE80]">
                {category === 'npc' && <UserSquare2 size={12} />}
                {category === 'location' && <MapPin size={12} />}
                {category === 'image' && <ImageIcon size={12} />}
                {category === 'item' && <Package size={12} />}
                {category === 'equipment' && <Shield size={12} />}
                <span>
                  {category === 'npc'
                    ? 'NPC DOSSIER CARD'
                    : category === 'location'
                    ? 'LOCATION RECONNAISSANCE'
                    : category === 'item'
                    ? 'ITEM CARD'
                    : category === 'equipment'
                    ? 'EQUIPMENT CARD'
                    : 'ARCHIVE EVIDENCE IMAGE'}
                </span>
                {subtitle && category !== 'equipment' && category !== 'item' && (
                  <>
                    <span>·</span>
                    <span className="text-[#8C9692]">{subtitle}</span>
                  </>
                )}
              </div>
              <h3 className="font-display text-lg sm:text-xl font-bold text-[#E2E6E4] mt-0.5">
                {title}
              </h3>
            </div>

            <p className="text-xs sm:text-sm text-[#A5B0AC] whitespace-pre-wrap leading-relaxed">
              {publicContent || 'No description provided.'}
            </p>

            {/* Equipment Card Effect Box */}
            {category === 'equipment' && subtitle && (
              <div className="bg-[#121916] border border-[#16A34A]/60 rounded px-3 py-2 text-xs">
                <div className="font-mono-tabular text-[10px] font-bold text-[#4ADE80] uppercase">
                  EQUIPMENT EFFECT / BONUS
                </div>
                <div className="text-[#E2E6E4] font-medium mt-0.5">
                  {subtitle}
                </div>
              </div>
            )}

            {showGmSecrets && gmSecretNotes && (
              <div className="mt-3 bg-[#19151D] border border-[#D97706]/60 rounded p-2.5 text-xs">
                <div className="font-mono-tabular text-[10px] font-semibold text-[#FBBF24] uppercase mb-1">
                  GM SECRET NOTES / STATS (HIDDEN FROM PLAYERS)
                </div>
                <div className="text-[#E2E6E4] whitespace-pre-wrap leading-relaxed">
                  {gmSecretNotes}
                </div>
              </div>
            )}
          </div>

          {/* Add to Player's Own Equipment Button for Item & Equipment Cards */}
          {isEquipableCard && onAddToCharacterEquipment && (
            <div className="pt-2 border-t border-[#232B28] flex items-center justify-end">
              <button
                type="button"
                onClick={handleEquipClick}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-mono-tabular font-semibold cursor-pointer"
              >
                {addedToGear ? (
                  <>
                    <Check size={13} />
                    <span>Added to Gear!</span>
                  </>
                ) : (
                  <>
                    <Plus size={13} />
                    <span>
                      Add to My Equipment
                      {equipTargetLabel ? ` (${equipTargetLabel})` : ''}
                    </span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
