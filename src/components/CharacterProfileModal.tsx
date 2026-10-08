import React, { useState } from 'react';
import { X, Lock, Edit3, UserSquare2, ZoomIn } from 'lucide-react';
import { AgentCharacter, DossierPage } from '../types/deltaGreen';
import { PersonalDataSection } from './PersonalDataSection';
import { StatisticalAndPsychSection } from './StatisticalAndPsychSection';
import { ApplicableSkillSetsSection } from './ApplicableSkillSetsSection';
import { InjuriesAndEquipmentSection } from './InjuriesAndEquipmentSection';
import { RemarksSection } from './RemarksSection';
import { ImageZoomModal } from './ImageZoomModal';
import { recalculateDerivedMax } from '../utils/diceAndRules';

interface CharacterProfileModalProps {
  character: AgentCharacter;
  currentUserId?: string;
  onUpdateCharacter?: (updater: (prev: AgentCharacter) => AgentCharacter) => void;
  onClose: () => void;
  returnLabel?: string;
}

const PROFILE_PAGES: { id: DossierPage; label: string }[] = [
  { id: 'personal', label: '01. Personal' },
  { id: 'stats-psych', label: '02. Stats & Psyche' },
  { id: 'skills', label: '03. Skill Sets' },
  { id: 'injuries-equipment', label: '04. Injuries & Gear' },
  { id: 'remarks', label: '05. Remarks' },
];

export const CharacterProfileModal: React.FC<CharacterProfileModalProps> = ({
  character,
  currentUserId,
  onUpdateCharacter,
  onClose,
  returnLabel = 'Return to Session',
}) => {
  const [activePage, setActivePage] = useState<DossierPage>('personal');
  const [zoomPortrait, setZoomPortrait] = useState(false);

  const isOwner = Boolean(
    currentUserId &&
      character.ownerId &&
      character.ownerId === currentUserId &&
      onUpdateCharacter
  );

  const handleUpdate = (updater: (prev: AgentCharacter) => AgentCharacter) => {
    if (!isOwner || !onUpdateCharacter) return;
    onUpdateCharacter(updater);
  };

  const handleResetBreakingPoint = () => {
    if (!isOwner || !onUpdateCharacter) return;
    const pow = character.statistics.POW.score;
    const currentSan = character.derived.san.current;
    const newBp = Math.max(0, currentSan - pow);
    onUpdateCharacter((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      derived: {
        ...prev.derived,
        bp: {
          max: newBp,
          current: newBp,
        },
      },
    }));
  };

  const handleSessionAdvancePlusOne = () => {
    if (!isOwner || !onUpdateCharacter) return;
    onUpdateCharacter((prev) => {
      const nextSkills = prev.skills.map((s) => {
        if (!s.checked || s.isUnnatural) return s;
        return { ...s, value: Math.min(99, s.value + 1), checked: false };
      });
      const nextCustom = prev.foreignLanguagesAndOther.map((c) => {
        if (!c.checked) return c;
        return { ...c, value: Math.min(99, c.value + 1), checked: false };
      });
      return recalculateDerivedMax({
        ...prev,
        updatedAt: new Date().toISOString(),
        skills: nextSkills,
        foreignLanguagesAndOther: nextCustom,
      });
    });
  };

  const handleClearAllSkillChecks = () => {
    if (!isOwner || !onUpdateCharacter) return;
    onUpdateCharacter((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      skills: prev.skills.map((s) => ({ ...s, checked: false })),
      foreignLanguagesAndOther: prev.foreignLanguagesAndOther.map((c) => ({
        ...c,
        checked: false,
      })),
    }));
  };

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/85 backdrop-blur-sm flex flex-col overflow-y-auto p-3 sm:p-6"
      onClick={onClose}
    >
      {zoomPortrait && character.portraitUrl && (
        <ImageZoomModal
          imageUrl={character.portraitUrl}
          title={character.fullNameAndAlias || 'Agent Portrait'}
          subtitle={character.professionAndRank}
          returnLabel="Return to Character Profile"
          onClose={() => setZoomPortrait(false)}
        />
      )}

      <div
        className="max-w-[1320px] w-full mx-auto bg-[#0B0E0D] border-2 border-[#16A34A] rounded p-4 sm:p-6 space-y-4 my-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header with Character Summary & Edit/Read-Only Badge */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#232B28] pb-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-14 h-16 rounded bg-[#121715] border border-[#232B28] overflow-hidden shrink-0 flex items-center justify-center">
              {character.portraitUrl ? (
                <button
                  type="button"
                  onClick={() => setZoomPortrait(true)}
                  className="relative w-full h-full cursor-zoom-in"
                  title="Zoom into character portrait"
                >
                  <img
                    src={character.portraitUrl}
                    alt={character.fullNameAndAlias || 'Character Portrait'}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-0.5 right-0.5 p-0.5 rounded bg-black/75 text-[#4ADE80]">
                    <ZoomIn size={10} />
                  </span>
                </button>
              ) : (
                <UserSquare2 size={24} className="text-[#525C58]" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono-tabular text-xs text-[#4ADE80]">
                  CHARACTER DOSSIER · PLAYER: {character.ownerName || 'Operative'}
                </span>
                {isOwner ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#16A34A]/20 border border-[#16A34A] text-[10px] font-mono-tabular font-bold text-[#4ADE80]">
                    <Edit3 size={10} />
                    <span>OWNER — EDITABLE</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#D97706]/20 border border-[#D97706] text-[10px] font-mono-tabular font-bold text-[#FBBF24]">
                    <Lock size={10} />
                    <span>READ-ONLY VIEW</span>
                  </span>
                )}
              </div>

              <h2 className="font-display text-lg sm:text-xl font-bold text-[#E2E6E4] truncate mt-0.5">
                {character.fullNameAndAlias || 'UNNAMED AGENT'}
              </h2>
              <p className="text-xs text-[#8C9692] truncate">
                {character.professionAndRank || 'Unassigned Profession / Rank'}
                {character.employer ? ` · ${character.employer}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {PROFILE_PAGES.map((pg) => (
              <button
                key={pg.id}
                type="button"
                onClick={() => setActivePage(pg.id)}
                className={`px-3 py-1.5 rounded text-xs font-mono-tabular cursor-pointer ${
                  activePage === pg.id
                    ? 'bg-[#16A34A] text-white font-semibold'
                    : 'bg-[#121715] text-[#A5B0AC] hover:text-[#E2E6E4] border border-[#232B28]'
                }`}
              >
                {pg.label}
              </button>
            ))}

            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-mono-tabular font-semibold cursor-pointer"
            >
              <X size={14} />
              <span>{returnLabel}</span>
            </button>
          </div>
        </div>

        {/* Read-Only Notice Banner for Non-Owners */}
        {!isOwner && (
          <div className="bg-[#191510] border border-[#D97706]/50 px-3.5 py-2 rounded flex items-center justify-between gap-2 text-xs text-[#FBBF24]">
            <span className="inline-flex items-center gap-1.5 font-mono-tabular">
              <Lock size={13} />
              <span>
                Read-Only Character Sheet: Only{' '}
                <strong>{character.ownerName || 'the character owner'}</strong> can edit this dossier.
              </span>
            </span>
          </div>
        )}

        {/* 5-Page Sheet Content (Editable for Owner, Read-Only for Others) */}
        <fieldset
          disabled={!isOwner}
          className={`border-0 p-0 m-0 min-w-0 ${
            !isOwner ? 'pointer-events-none opacity-95 select-none' : ''
          }`}
        >
          {activePage === 'personal' && (
            <PersonalDataSection agent={character} onUpdate={handleUpdate} />
          )}
          {activePage === 'stats-psych' && (
            <StatisticalAndPsychSection
              agent={character}
              onUpdate={handleUpdate}
              onResetBreakingPoint={handleResetBreakingPoint}
            />
          )}
          {activePage === 'skills' && (
            <ApplicableSkillSetsSection
              agent={character}
              onUpdate={handleUpdate}
              onSessionAdvancePlusOne={handleSessionAdvancePlusOne}
              onClearAllSkillChecks={handleClearAllSkillChecks}
            />
          )}
          {activePage === 'injuries-equipment' && (
            <InjuriesAndEquipmentSection
              agent={character}
              onUpdate={handleUpdate}
            />
          )}
          {activePage === 'remarks' && (
            <RemarksSection agent={character} onUpdate={handleUpdate} />
          )}
        </fieldset>
      </div>
    </div>
  );
};
