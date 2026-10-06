import React, { useRef, useState } from 'react';
import { Upload, Trash2, Link2, UserSquare2, ZoomIn } from 'lucide-react';
import { AgentCharacter } from '../types/deltaGreen';
import { ImageZoomModal } from './ImageZoomModal';

interface PersonalDataSectionProps {
  agent: AgentCharacter;
  onUpdate: (updater: (prev: AgentCharacter) => AgentCharacter) => void;
}

export const PersonalDataSection: React.FC<PersonalDataSectionProps> = ({
  agent,
  onUpdate,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlDraft, setUrlDraft] = useState('');
  const [imgError, setImgError] = useState(false);
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  const handleField = <K extends keyof AgentCharacter>(
    key: K,
    value: AgentCharacter[K]
  ) => {
    onUpdate((prev) => ({
      ...prev,
      [key]: value,
      updatedAt: new Date().toISOString(),
    }));
  };

  const handlePortraitUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = String(ev.target?.result || '');
      if (dataUrl) {
        setImgError(false);
        handleField('portraitUrl', dataUrl);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleApplyUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlDraft.trim()) return;
    setImgError(false);
    handleField('portraitUrl', urlDraft.trim());
    setUrlDraft('');
    setShowUrlInput(false);
  };

  const hasValidPortrait = Boolean(agent.portraitUrl && !imgError);

  return (
    <section
      id="section-personal"
      className="border border-[#232B28] bg-[#121715] flex flex-col md:flex-row"
    >
      {/* Official Vertical Black Form Sidebar */}
      <div className="bg-[#070908] border-b md:border-b-0 md:border-r border-[#232B28] px-3 py-2 md:py-0 md:w-9 flex items-center justify-between md:justify-center shrink-0 select-none">
        <span className="font-mono-tabular text-[11px] font-semibold tracking-[0.2em] text-[#A5B0AC] md:[writing-mode:vertical-rl] md:rotate-180">
          PERSONAL DATA
        </span>
        <span className="md:hidden font-mono-tabular text-[10px] text-[#68736E]">
          FORM DD-315 // SEC 01–07
        </span>
      </div>

      {/* Main Content Split: Leftward Column (1, 2, 3, 4 stacked + 5, 6, 7) | Rightward Column (Character Portrait) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#232B28]">
        {/* Leftward Column: Fields 1, 2, 3, 4 stacked on top of one another, followed by 5 & 6, and 7 */}
        <div className="lg:col-span-8 flex flex-col divide-y divide-[#232B28]">
          {/* 1. LAST NAME, FIRST NAME (AND ALIAS OR CODE NAME IF APPLICABLE) */}
          <div className="p-3.5">
            <label className="block font-mono-tabular text-[11px] text-[#8C9692] mb-1.5">
              1. LAST NAME, FIRST NAME (AND ALIAS OR CODE NAME IF APPLICABLE)
            </label>
            <input
              type="text"
              value={agent.fullNameAndAlias}
              onChange={(e) => handleField('fullNameAndAlias', e.target.value)}
              placeholder="LAST, FIRST // ALIAS"
              className="w-full bg-[#0B0E0D] border border-[#232B28] focus:border-[#16A34A] rounded px-3 py-2 text-sm font-medium text-[#E2E6E4] focus:outline-none transition-colors"
            />
          </div>

          {/* 2. PROFESSION (RANK IF APPLICABLE) */}
          <div className="p-3.5">
            <label className="block font-mono-tabular text-[11px] text-[#8C9692] mb-1.5">
              2. PROFESSION (RANK IF APPLICABLE)
            </label>
            <input
              type="text"
              value={agent.professionAndRank}
              onChange={(e) => handleField('professionAndRank', e.target.value)}
              placeholder="e.g., Federal Agent, Epidemiologist, Special Operator"
              className="w-full bg-[#0B0E0D] border border-[#232B28] focus:border-[#16A34A] rounded px-3 py-2 text-sm font-medium text-[#E2E6E4] focus:outline-none transition-colors"
            />
          </div>

          {/* 3. EMPLOYER */}
          <div className="p-3.5">
            <label className="block font-mono-tabular text-[11px] text-[#8C9692] mb-1.5">
              3. EMPLOYER
            </label>
            <input
              type="text"
              value={agent.employer}
              onChange={(e) => handleField('employer', e.target.value)}
              placeholder="e.g., FBI, CDC, DEA, USAMRIID, Academic Institution"
              className="w-full bg-[#0B0E0D] border border-[#232B28] focus:border-[#16A34A] rounded px-3 py-2 text-sm text-[#E2E6E4] focus:outline-none transition-colors"
            />
          </div>

          {/* 4. NATIONALITY */}
          <div className="p-3.5">
            <label className="block font-mono-tabular text-[11px] text-[#8C9692] mb-1.5">
              4. NATIONALITY
            </label>
            <input
              type="text"
              value={agent.nationality}
              onChange={(e) => handleField('nationality', e.target.value)}
              placeholder="e.g., United States"
              className="w-full bg-[#0B0E0D] border border-[#232B28] focus:border-[#16A34A] rounded px-3 py-2 text-sm text-[#E2E6E4] focus:outline-none transition-colors"
            />
          </div>

          {/* Row for 5. SEX and 6. AGE AND D.O.B. */}
          <div className="grid grid-cols-1 sm:grid-cols-12 divide-y sm:divide-y-0 sm:divide-x divide-[#232B28]">
            <div className="sm:col-span-6 p-3.5">
              <label className="block font-mono-tabular text-[11px] text-[#8C9692] mb-1.5">
                5. SEX
              </label>
              <div className="flex items-center gap-3 flex-wrap">
                <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs text-[#E2E6E4] min-h-[36px]">
                  <input
                    type="checkbox"
                    checked={agent.sex === 'F'}
                    onChange={() => handleField('sex', agent.sex === 'F' ? '' : 'F')}
                    className="w-4 h-4 accent-[#16A34A] rounded bg-[#0B0E0D] border-[#232B28]"
                  />
                  <span className="font-mono-tabular">F</span>
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs text-[#E2E6E4] min-h-[36px]">
                  <input
                    type="checkbox"
                    checked={agent.sex === 'M'}
                    onChange={() => handleField('sex', agent.sex === 'M' ? '' : 'M')}
                    className="w-4 h-4 accent-[#16A34A] rounded bg-[#0B0E0D] border-[#232B28]"
                  />
                  <span className="font-mono-tabular">M</span>
                </label>
                <div className="inline-flex items-center gap-1.5 flex-1 min-w-[100px]">
                  <input
                    type="checkbox"
                    checked={agent.sex === 'OTHER'}
                    onChange={() =>
                      handleField('sex', agent.sex === 'OTHER' ? '' : 'OTHER')
                    }
                    aria-label="Other sex specification"
                    className="w-4 h-4 accent-[#16A34A] rounded bg-[#0B0E0D] border-[#232B28]"
                  />
                  <input
                    type="text"
                    value={agent.sexOtherText}
                    onChange={(e) => {
                      handleField('sex', 'OTHER');
                      handleField('sexOtherText', e.target.value);
                    }}
                    placeholder="Specify"
                    className="w-full bg-[#0B0E0D] border-b border-[#232B28] focus:border-[#16A34A] px-1.5 py-1 text-xs text-[#E2E6E4] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="sm:col-span-6 p-3.5">
              <label className="block font-mono-tabular text-[11px] text-[#8C9692] mb-1.5">
                6. AGE AND D.O.B.
              </label>
              <input
                type="text"
                value={agent.ageAndDob}
                onChange={(e) => handleField('ageAndDob', e.target.value)}
                placeholder="AGE // YYYY-MM-DD"
                className="w-full bg-[#0B0E0D] border border-[#232B28] focus:border-[#16A34A] rounded px-3 py-2 text-sm font-mono-tabular text-[#E2E6E4] focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* 7. EDUCATION AND OCCUPATIONAL HISTORY */}
          <div className="p-3.5 flex-1 flex flex-col">
            <label className="block font-mono-tabular text-[11px] text-[#8C9692] mb-1.5">
              7. EDUCATION AND OCCUPATIONAL HISTORY
            </label>
            <textarea
              rows={3}
              value={agent.educationAndOccupation}
              onChange={(e) => handleField('educationAndOccupation', e.target.value)}
              placeholder="Academic degrees, military service record, prior agency postings, clearance history..."
              className="w-full flex-1 bg-[#0B0E0D] border border-[#232B28] focus:border-[#16A34A] rounded px-3 py-2 text-xs sm:text-sm leading-relaxed text-[#E2E6E4] focus:outline-none transition-colors resize-y"
            />
          </div>
        </div>

        {/* Rightward Column: Character Portrait Section */}
        <div className="lg:col-span-4 p-4 bg-[#0E1311] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono-tabular text-[11px] font-semibold text-[#8C9692]">
                AGENT PHOTOGRAPH // ID
              </span>
              <span className="font-mono-tabular text-[10px] text-[#68736E]">
                FORM 315-PHOTO
              </span>
            </div>

            {/* Portrait Frame */}
            {isZoomOpen && hasValidPortrait && agent.portraitUrl && (
              <ImageZoomModal
                imageUrl={agent.portraitUrl}
                title={agent.fullNameAndAlias || 'Agent Portrait'}
                subtitle={agent.professionAndRank}
                returnLabel="Return to Character Sheet (01. Personal Data)"
                onClose={() => setIsZoomOpen(false)}
              />
            )}

            <div className="relative w-full max-w-[280px] mx-auto aspect-[3/4] bg-[#0B0E0D] border border-[#232B28] rounded overflow-hidden flex items-center justify-center group">
              {hasValidPortrait ? (
                <button
                  type="button"
                  onClick={() => setIsZoomOpen(true)}
                  title="Click to zoom into agent photograph"
                  className="w-full h-full relative cursor-zoom-in"
                >
                  <img
                    src={agent.portraitUrl}
                    alt={agent.fullNameAndAlias || 'Agent Portrait'}
                    referrerPolicy="no-referrer"
                    onError={() => setImgError(true)}
                    className="w-full h-full object-cover object-center"
                  />
                  <span className="absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded bg-[#0B0E0D]/90 border border-[#232B28] text-xs font-mono-tabular text-[#4ADE80] inline-flex items-center gap-1 shadow">
                    <ZoomIn size={12} />
                    <span>Zoom</span>
                  </span>
                </button>
              ) : (
                <div className="flex flex-col items-center justify-center p-6 text-center select-none">
                  <UserSquare2 size={56} strokeWidth={1.2} className="text-[#33403B] mb-3" />
                  <span className="font-mono-tabular text-xs font-semibold text-[#68736E]">
                    NO PHOTOGRAPH ON FILE
                  </span>
                  <span className="text-[11px] text-[#525C58] mt-1">
                    Upload an identification photo or paste an image URL below
                  </span>
                </div>
              )}

              {/* Subtle Corner Reticles */}
              <div className="pointer-events-none absolute inset-2 border border-[#E2E6E4]/10" />
            </div>
          </div>

          {/* Portrait Upload / URL / Clear Controls */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#121715] hover:bg-[#19221E] border border-[#232B28] hover:border-[#16A34A] text-xs font-mono-tabular text-[#E2E6E4] transition-colors cursor-pointer"
              >
                <Upload size={13} className="text-[#4ADE80]" />
                <span>Upload Photo</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePortraitUpload}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => setShowUrlInput((v) => !v)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-[#121715] hover:bg-[#19201E] border border-[#232B28] text-xs font-mono-tabular text-[#A5B0AC] hover:text-[#E2E6E4] transition-colors cursor-pointer"
              >
                <Link2 size={13} />
                <span>Image URL</span>
              </button>

              {agent.portraitUrl && (
                <button
                  type="button"
                  onClick={() => handleField('portraitUrl', '')}
                  title="Remove agent photograph"
                  className="p-1.5 rounded bg-[#121715] hover:bg-[#DC2626]/20 border border-[#232B28] hover:border-[#DC2626]/60 text-[#8C9692] hover:text-[#F87171] transition-colors cursor-pointer"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>

            {showUrlInput && (
              <form onSubmit={handleApplyUrl} className="flex gap-1.5">
                <input
                  type="url"
                  value={urlDraft}
                  onChange={(e) => setUrlDraft(e.target.value)}
                  placeholder="https://example.com/portrait.jpg"
                  className="flex-1 min-w-0 bg-[#0B0E0D] border border-[#232B28] focus:border-[#16A34A] rounded px-2.5 py-1 text-xs text-[#E2E6E4] focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-2.5 py-1 rounded bg-[#16A34A] hover:bg-[#15803D] text-xs font-mono-tabular font-semibold text-white cursor-pointer"
                >
                  Set
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
