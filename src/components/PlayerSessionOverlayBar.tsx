import React, { useState } from 'react';
import {
  Radio,
  Dices,
  Clock,
  Swords,
  X,
  FileText,
  MessageSquare,
  Calendar,
  UserSquare2,
  FolderOpen,
  Lock,
  Edit3,
} from 'lucide-react';
import {
  AgentCharacter,
  GameSession,
  GmAsset,
  SessionJoinedPlayer,
  SessionRollEntry,
  SharedSessionItem,
} from '../types/deltaGreen';
import { SessionMessageBoard } from './SessionMessageBoard';
import { CharacterProfileModal } from './CharacterProfileModal';

interface PlayerSessionOverlayBarProps {
  session: GameSession;
  currentUserId?: string;
  currentUserName?: string;
  /** Player's own characters to choose from in the session dropdown */
  playerCharacters?: AgentCharacter[];
  /** Currently selected character ID for this session */
  activeCharacterId?: string;
  /** All characters linked to this session (for viewing full profiles) */
  sessionCharacters?: AgentCharacter[];
  /** Called when the player selects which character they are playing in this session */
  onSelectCharacterForSession?: (characterId: string) => Promise<void> | void;
  /** Called when the owner edits their character from the profile modal */
  onUpdateOwnCharacter?: (
    characterId: string,
    updater: (prev: AgentCharacter) => AgentCharacter
  ) => void;
  /** Called when a player rolls dice publicly at the table */
  onPostPublicRoll?: (roll: SessionRollEntry) => Promise<void>;
  /** Called when a player clicks "Add to My Equipment" on an Item or Equipment card */
  onAddToCharacterEquipment?: (card: {
    category: 'item' | 'equipment';
    name: string;
    imageUrl: string;
    description: string;
    effect?: string;
  }) => Promise<void> | void;
  /** Exact label describing where closing the Session Message Board modal returns the user */
  returnLabel?: string;
  onPostTimelineEntry?: (
    entry: SharedSessionItem,
    asSpotlight?: boolean
  ) => Promise<void>;
  onSaveToGmLibrary?: (
    draft: Omit<GmAsset, 'id' | 'ownerId' | 'gameSystem' | 'updatedAt'>
  ) => Promise<string | void>;
  onLeaveSessionView?: () => void;
}

function rollPlayerDiceFormula(formula: string): {
  total: number;
  details: string;
} {
  const clean = formula.trim().toUpperCase();
  if (clean === 'LETHALITY') {
    const tens = Math.floor(Math.random() * 10);
    const ones = Math.floor(Math.random() * 10);
    const d100 = tens === 0 && ones === 0 ? 100 : tens * 10 + ones;
    const d1 = tens === 0 ? 10 : tens;
    const d2 = ones === 0 ? 10 : ones;
    return {
      total: d100,
      details: `d100=${d100}% (HP Damage if non-lethal: ${d1} + ${d2} = ${
        d1 + d2
      } HP)`,
    };
  }

  const match = clean.match(/^(\d*)D(\d+)([+-]\d+)?$/);
  if (!match) {
    const val = Math.floor(Math.random() * 100) + 1;
    return { total: val, details: `1D100 → [${val}]` };
  }

  const count = Math.min(20, Math.max(1, parseInt(match[1] || '1', 10)));
  const sides = Math.max(2, parseInt(match[2], 10));
  const mod = match[3] ? parseInt(match[3], 10) : 0;

  const rolls: number[] = [];
  for (let i = 0; i < count; i++) {
    rolls.push(Math.floor(Math.random() * sides) + 1);
  }
  const sum = rolls.reduce((a, b) => a + b, 0) + mod;
  const modText = mod !== 0 ? (mod > 0 ? `+${mod}` : `${mod}`) : '';
  return {
    total: sum,
    details: `${count}D${sides}${modText} → [${rolls.join(', ')}]${modText}`,
  };
}

export const PlayerSessionOverlayBar: React.FC<PlayerSessionOverlayBarProps> = ({
  session,
  currentUserId,
  currentUserName = 'Agent',
  playerCharacters = [],
  activeCharacterId = '',
  sessionCharacters = [],
  onSelectCharacterForSession,
  onUpdateOwnCharacter,
  onPostPublicRoll,
  onAddToCharacterEquipment,
  returnLabel = 'Return to Character Sheet',
  onPostTimelineEntry,
  onSaveToGmLibrary,
}) => {
  const [showTableModal, setShowTableModal] = useState(false);
  const [rollLabel, setRollLabel] = useState('');
  const [customFormula, setCustomFormula] = useState('1D100');
  const [inspectedProfileId, setInspectedProfileId] = useState<string | null>(
    null
  );

  const hasSpotlight =
    session.spotlightItem &&
    'title' in session.spotlightItem &&
    Boolean(session.spotlightItem.title);

  const spotlight = hasSpotlight
    ? (session.spotlightItem as SharedSessionItem)
    : null;

  const latestRoll = session.publicRolls?.[0] || null;
  const activeCombatant =
    session.combatTracker?.find((c) => c.isActiveTurn) || null;
  const publicClocks = (session.clocks || []).filter((c) => c.isPublic);

  // Determine the current player's joined record and active character for this session
  const myJoinedEntry = (session.joinedPlayers || []).find(
    (jp) => currentUserId && jp.uid === currentUserId
  );

  const selectedCharId =
    myJoinedEntry?.characterId ||
    activeCharacterId ||
    playerCharacters[0]?.id ||
    '';

  const allKnownCharacters: AgentCharacter[] = [
    ...playerCharacters,
    ...sessionCharacters.filter(
      (sc) => !playerCharacters.some((pc) => pc.id === sc.id)
    ),
  ];

  const myPlayingCharacter =
    allKnownCharacters.find((c) => c.id === selectedCharId) ||
    playerCharacters[0] ||
    null;

  const inspectedCharacter = inspectedProfileId
    ? allKnownCharacters.find((c) => c.id === inspectedProfileId) || null
    : null;

  // Resolve character info for a joined player or roll entry
  const resolveCharacterCardData = (params: {
    characterId?: string;
    rollerUid?: string;
    rollerName?: string;
    fallbackName?: string;
    fallbackPortrait?: string;
    fallbackProfession?: string;
  }) => {
    const byId = params.characterId
      ? allKnownCharacters.find((c) => c.id === params.characterId)
      : undefined;
    if (byId) {
      return {
        characterId: byId.id,
        name: byId.fullNameAndAlias || 'Unnamed Agent',
        portraitUrl: byId.portraitUrl || params.fallbackPortrait || '',
        profession: byId.professionAndRank || 'Unassigned Profession',
        ownerId: byId.ownerId,
        hasFullProfile: true,
      };
    }

    const joined = (session.joinedPlayers || []).find(
      (jp) =>
        (params.characterId && jp.characterId === params.characterId) ||
        (params.rollerUid && jp.uid === params.rollerUid) ||
        (params.rollerName &&
          (jp.characterName.toLowerCase() === params.rollerName.toLowerCase() ||
            jp.name.toLowerCase() === params.rollerName.toLowerCase()))
    );

    if (joined) {
      const linkedChar = allKnownCharacters.find(
        (c) => c.id === joined.characterId
      );
      return {
        characterId: joined.characterId,
        name:
          linkedChar?.fullNameAndAlias ||
          joined.characterName ||
          params.fallbackName ||
          joined.name,
        portraitUrl:
          linkedChar?.portraitUrl ||
          joined.characterPortraitUrl ||
          params.fallbackPortrait ||
          '',
        profession:
          linkedChar?.professionAndRank ||
          joined.characterProfession ||
          params.fallbackProfession ||
          'Agent',
        ownerId: linkedChar?.ownerId || joined.uid,
        hasFullProfile: Boolean(linkedChar),
      };
    }

    if (params.fallbackName) {
      return {
        characterId: params.characterId || '',
        name: params.fallbackName,
        portraitUrl: params.fallbackPortrait || '',
        profession: params.fallbackProfession || 'Operative',
        ownerId: params.rollerUid,
        hasFullProfile: false,
      };
    }

    return null;
  };

  const handlePlayerRoll = async (formulaToRoll: string, labelOverride?: string) => {
    if (!onPostPublicRoll) return;
    const outcome = rollPlayerDiceFormula(formulaToRoll);
    const charName =
      myPlayingCharacter?.fullNameAndAlias ||
      myJoinedEntry?.characterName ||
      currentUserName;
    const entry: SessionRollEntry = {
      id: `roll-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      rollerName: charName,
      rollerUid: currentUserId || '',
      characterId: myPlayingCharacter?.id || selectedCharId || '',
      characterName: charName,
      characterPortraitUrl: myPlayingCharacter?.portraitUrl || '',
      characterProfession:
        myPlayingCharacter?.professionAndRank || 'Unassigned Profession',
      label: labelOverride || rollLabel.trim() || `${formulaToRoll.toUpperCase()} Check`,
      formula: formulaToRoll.toUpperCase(),
      result: outcome.total,
      details: outcome.details,
      isPrivate: false,
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    };
    setRollLabel('');
    await onPostPublicRoll(entry);
  };

  const renderCharacterCard = (
    card: {
      characterId: string;
      name: string;
      portraitUrl: string;
      profession: string;
      ownerId?: string;
      hasFullProfile: boolean;
    },
    compact = false
  ) => {
    const isMine = Boolean(currentUserId && card.ownerId === currentUserId);
    return (
      <div
        className={`bg-[#0B0E0D] border border-[#16A34A]/60 rounded ${
          compact ? 'p-2' : 'p-2.5'
        } flex items-center justify-between gap-2.5`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`${
              compact ? 'w-9 h-11' : 'w-11 h-13'
            } rounded bg-[#121715] border border-[#232B28] overflow-hidden shrink-0 flex items-center justify-center`}
          >
            {card.portraitUrl ? (
              <img
                src={card.portraitUrl}
                alt={card.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : (
              <UserSquare2 size={18} className="text-[#525C58]" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-mono-tabular text-[9px] uppercase text-[#4ADE80] font-semibold">
                PLAYING CHARACTER
              </span>
              {isMine ? (
                <span className="text-[9px] font-mono-tabular text-[#4ADE80]">
                  · OWNER
                </span>
              ) : (
                <span className="text-[9px] font-mono-tabular text-[#8C9692]">
                  · READ-ONLY
                </span>
              )}
            </div>
            <div className="font-display text-xs sm:text-sm font-bold text-[#E2E6E4] truncate">
              {card.name || 'Unnamed Agent'}
            </div>
            <div className="text-[11px] text-[#8C9692] truncate">
              {card.profession || 'Unassigned Profession / Rank'}
            </div>
          </div>
        </div>

        {card.characterId && card.hasFullProfile && (
          <button
            type="button"
            onClick={() => setInspectedProfileId(card.characterId)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-[#121715] hover:bg-[#19201E] border border-[#16A34A] text-[10px] font-mono-tabular font-semibold text-[#4ADE80] cursor-pointer shrink-0"
            title={
              isMine
                ? 'Open and edit your full character profile'
                : 'View full character profile (Read-Only)'
            }
          >
            {isMine ? <Edit3 size={11} /> : <FolderOpen size={11} />}
            <span>{isMine ? 'Edit Profile' : 'Full Profile'}</span>
          </button>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Full Character Profile Modal (Editable for Owner, Read-Only for Others) */}
      {inspectedCharacter && (
        <CharacterProfileModal
          character={inspectedCharacter}
          currentUserId={currentUserId}
          onUpdateCharacter={
            currentUserId &&
            inspectedCharacter.ownerId === currentUserId &&
            onUpdateOwnCharacter
              ? (updater) => onUpdateOwnCharacter(inspectedCharacter.id, updater)
              : undefined
          }
          onClose={() => setInspectedProfileId(null)}
          returnLabel={`Return to ${session.title}`}
        />
      )}

      <div className="mb-4 border border-[#16A34A] bg-[#0E1311] px-4 py-2.5 rounded flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap min-w-0">
          <span className="inline-flex items-center gap-1.5 font-mono-tabular text-xs font-semibold text-[#4ADE80]">
            <Radio size={14} className="animate-pulse" />
            <span>LIVE GM SESSION: {session.title}</span>
          </span>
          <span className="text-[#68736E]">·</span>
          <span className="text-xs text-[#E2E6E4] font-medium truncate">
            {session.sceneState.title}
            {session.sceneState.location
              ? ` (${session.sceneState.location})`
              : ''}
          </span>
          {session.sceneState.dateTime && (
            <>
              <span className="text-[#68736E]">·</span>
              <span className="inline-flex items-center gap-1 font-mono-tabular text-xs text-[#FBBF24]">
                <Calendar size={12} />
                <span>{session.sceneState.dateTime}</span>
              </span>
            </>
          )}
          <span
            className={`px-2 py-0.5 rounded font-mono-tabular text-[10px] font-bold ${
              session.sceneState.alertLevel === 'CONTAINMENT BREACH' ||
              session.sceneState.alertLevel === 'COMBAT'
                ? 'bg-[#DC2626]/20 border border-[#DC2626] text-[#F87171]'
                : session.sceneState.alertLevel === 'SURVEILLANCE'
                ? 'bg-[#D97706]/20 border border-[#D97706] text-[#FBBF24]'
                : 'bg-[#121715] border border-[#232B28] text-[#A5B0AC]'
            }`}
          >
            ALERT: {session.sceneState.alertLevel}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Session Character Drop-Down Selector */}
          {playerCharacters.length > 0 && onSelectCharacterForSession && (
            <div className="inline-flex items-center gap-1.5 bg-[#0B0E0D] border border-[#232B28] rounded px-2 py-1">
              <span className="font-mono-tabular text-[10px] text-[#4ADE80] font-semibold">
                PLAYING AS:
              </span>
              <select
                value={selectedCharId}
                onChange={(e) => onSelectCharacterForSession(e.target.value)}
                aria-label="Select character playing in this session"
                className="bg-transparent text-xs font-mono-tabular text-[#E2E6E4] focus:outline-none cursor-pointer"
              >
                {playerCharacters.map((pc) => (
                  <option key={pc.id} value={pc.id} className="bg-[#0B0E0D]">
                    {pc.fullNameAndAlias || 'Unnamed Agent'} (
                    {pc.professionAndRank || 'No Rank'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {latestRoll && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0B0E0D] border border-[#232B28] font-mono-tabular text-xs text-[#E2E6E4]">
              <Dices size={12} className="text-[#4ADE80]" />
              <span>
                {latestRoll.label}:{' '}
                <strong className="text-[#4ADE80]">{latestRoll.result}</strong>
              </span>
            </span>
          )}

          {spotlight && (
            <button
              type="button"
              onClick={() => setShowTableModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[#D97706] hover:bg-[#B45309] text-white text-xs font-mono-tabular font-semibold cursor-pointer"
            >
              <FileText size={13} />
              <span>Spotlight: {spotlight.title}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowTableModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-mono-tabular font-semibold cursor-pointer"
          >
            <MessageSquare size={13} />
            <span>
              Session Message Board & Timeline (
              {session.sharedItems?.length || 0})
            </span>
          </button>
        </div>
      </div>

      {/* Modal for Session Message Board, Shared Handouts, Scribble Notes, Public Rolls, Combat Order, and Clocks */}
      {showTableModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-[#121715] border-2 border-[#16A34A] rounded max-w-6xl w-full p-4 sm:p-6 space-y-5 my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#232B28] pb-3">
              <div>
                <div className="font-mono-tabular text-xs text-[#4ADE80]">
                  SHARED TABLETOP MESSAGE BOARD // GM: {session.gmName}
                </div>
                <h2 className="font-display text-lg sm:text-xl font-bold text-[#E2E6E4]">
                  {session.title} — Session Timeline, Handouts & Public Rolls
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setShowTableModal(false)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-[#0B0E0D] border border-[#232B28] text-xs font-mono-tabular text-[#E2E6E4] cursor-pointer"
              >
                <X size={14} />
                <span>{returnLabel}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left 8 Columns: Interactive Session Message Board & Timeline */}
              <div className="lg:col-span-8">
                <SessionMessageBoard
                  session={session}
                  currentUserName={
                    myPlayingCharacter?.fullNameAndAlias || currentUserName
                  }
                  isGm={false}
                  isPlayerMode={true}
                  onPostTimelineEntry={async (entry) => {
                    if (onPostTimelineEntry) {
                      await onPostTimelineEntry(entry, false);
                    }
                  }}
                  onSaveToGmLibrary={onSaveToGmLibrary}
                  onAddToCharacterEquipment={onAddToCharacterEquipment}
                  equipTargetLabel={
                    myPlayingCharacter?.fullNameAndAlias?.split('//')[0].trim() ||
                    'My Agent'
                  }
                />
              </div>

              {/* Right 4 Columns: Character Card Over Public Table Rolls, Dice Roller, Combat Order & Clocks */}
              <div className="lg:col-span-4 space-y-4">
                <div className="bg-[#0B0E0D] border border-[#232B28] p-4 rounded space-y-3">
                  {/* 1. Player Character Selector Dropdown for This Session */}
                  {playerCharacters.length > 0 && onSelectCharacterForSession && (
                    <div className="space-y-1.5 pb-3 border-b border-[#232B28]">
                      <label className="block font-mono-tabular text-[10px] font-semibold text-[#4ADE80] uppercase">
                        CHARACTER PLAYING IN THIS SESSION
                      </label>
                      <select
                        value={selectedCharId}
                        onChange={(e) =>
                          onSelectCharacterForSession(e.target.value)
                        }
                        className="w-full bg-[#121715] border border-[#232B28] focus:border-[#16A34A] rounded px-2.5 py-1.5 text-xs text-[#E2E6E4] focus:outline-none cursor-pointer"
                      >
                        {playerCharacters.map((pc) => (
                          <option key={pc.id} value={pc.id}>
                            {pc.fullNameAndAlias || 'Unnamed Agent'} —{' '}
                            {pc.professionAndRank || 'Unassigned Profession'}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* 2. Active Character Card Displayed Over Public Table Rolls */}
                  {myPlayingCharacter && (
                    <div className="space-y-1.5">
                      <div className="font-mono-tabular text-[10px] text-[#8C9692] uppercase">
                        YOUR ACTIVE CHARACTER CARD
                      </div>
                      {renderCharacterCard({
                        characterId: myPlayingCharacter.id,
                        name:
                          myPlayingCharacter.fullNameAndAlias || 'Unnamed Agent',
                        portraitUrl: myPlayingCharacter.portraitUrl || '',
                        profession:
                          myPlayingCharacter.professionAndRank ||
                          'Unassigned Profession / Rank',
                        ownerId: myPlayingCharacter.ownerId || currentUserId,
                        hasFullProfile: true,
                      })}
                    </div>
                  )}

                  {/* Other Joined Session Players' Character Cards */}
                  {(session.joinedPlayers || []).filter(
                    (jp) => !currentUserId || jp.uid !== currentUserId
                  ).length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-[#232B28]">
                      <div className="font-mono-tabular text-[10px] text-[#8C9692] uppercase">
                        PARTY CHARACTER CARDS AT THE TABLE
                      </div>
                      <div className="space-y-1.5">
                        {(session.joinedPlayers || [])
                          .filter(
                            (jp) => !currentUserId || jp.uid !== currentUserId
                          )
                          .map((jp: SessionJoinedPlayer) => {
                            const cardInfo = resolveCharacterCardData({
                              characterId: jp.characterId,
                              rollerUid: jp.uid,
                              rollerName: jp.characterName,
                              fallbackName: jp.characterName || jp.name,
                              fallbackPortrait: jp.characterPortraitUrl,
                              fallbackProfession: jp.characterProfession,
                            });
                            if (!cardInfo) return null;
                            return (
                              <div key={jp.uid}>
                                {renderCharacterCard(cardInfo, true)}
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {/* 3. Player Public Table Dice Roller */}
                  {onPostPublicRoll && (
                    <div className="pt-2 border-t border-[#232B28] space-y-2">
                      <div className="font-mono-tabular text-[10px] text-[#8C9692] uppercase">
                        ROLL DICE TO PUBLIC TABLE
                      </div>
                      <input
                        type="text"
                        value={rollLabel}
                        onChange={(e) => setRollLabel(e.target.value)}
                        placeholder="Optional roll reason (e.g., Alertness, SAN)..."
                        className="w-full bg-[#121715] border border-[#232B28] focus:border-[#16A34A] rounded px-2.5 py-1.5 text-xs text-[#E2E6E4] focus:outline-none"
                      />
                      <div className="grid grid-cols-4 gap-1.5">
                        {[
                          '1D100',
                          '1D20',
                          '1D12',
                          '1D10',
                          '1D8',
                          '1D6',
                          '1D4',
                          'LETHALITY',
                        ].map((die) => (
                          <button
                            key={die}
                            type="button"
                            onClick={() => handlePlayerRoll(die)}
                            className={`py-1.5 px-1.5 rounded font-mono-tabular text-[11px] font-semibold border cursor-pointer ${
                              die === '1D100' || die === 'LETHALITY'
                                ? 'bg-[#16A34A] hover:bg-[#15803D] border-[#16A34A] text-white'
                                : 'bg-[#121715] hover:bg-[#19201E] border-[#232B28] text-[#E2E6E4]'
                            }`}
                          >
                            {die === 'LETHALITY' ? 'LETHAL%' : die}
                          </button>
                        ))}
                      </div>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handlePlayerRoll(customFormula);
                        }}
                        className="flex gap-1.5"
                      >
                        <input
                          type="text"
                          value={customFormula}
                          onChange={(e) => setCustomFormula(e.target.value)}
                          placeholder="e.g., 2D10+4"
                          className="flex-1 bg-[#121715] border border-[#232B28] rounded px-2.5 py-1 text-xs font-mono-tabular text-[#E2E6E4]"
                        />
                        <button
                          type="submit"
                          className="px-3 py-1 rounded bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-mono-tabular font-semibold cursor-pointer"
                        >
                          Roll
                        </button>
                      </form>
                    </div>
                  )}

                  {/* 4. Public Table Rolls Log with Character Card Over Player Rolls */}
                  <div className="pt-2 border-t border-[#232B28] space-y-2">
                    <div className="flex items-center gap-1.5 font-mono-tabular text-xs font-semibold text-[#4ADE80]">
                      <Dices size={14} />
                      <span>
                        PUBLIC TABLE ROLLS ({session.publicRolls.length})
                      </span>
                    </div>
                    <div className="max-h-72 overflow-y-auto space-y-2.5">
                      {session.publicRolls.length === 0 ? (
                        <div className="text-xs text-[#68736E] py-2">
                          No public dice rolls yet.
                        </div>
                      ) : (
                        session.publicRolls.map((r) => {
                          const rollerCard = resolveCharacterCardData({
                            characterId: r.characterId,
                            rollerUid: r.rollerUid,
                            rollerName: r.rollerName,
                            fallbackName: r.characterName,
                            fallbackPortrait: r.characterPortraitUrl,
                            fallbackProfession: r.characterProfession,
                          });

                          return (
                            <div
                              key={r.id}
                              className="bg-[#121715] border border-[#232B28] rounded p-2.5 space-y-2 text-xs"
                            >
                              {/* Character Card Displayed Over the Player's Public Roll */}
                              {rollerCard && renderCharacterCard(rollerCard, true)}

                              <div className="flex items-center justify-between gap-2 px-1">
                                <div className="min-w-0">
                                  <div className="font-semibold text-[#E2E6E4] truncate">
                                    {r.label}{' '}
                                    <span className="text-[10px] text-[#4ADE80] font-normal">
                                      ({r.rollerName})
                                    </span>
                                  </div>
                                  <div className="font-mono-tabular text-[10px] text-[#8C9692]">
                                    {r.details} · {r.timestamp}
                                  </div>
                                </div>
                                <span className="font-mono-tabular text-base font-bold text-[#4ADE80] shrink-0">
                                  {r.result}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

                {/* Active Combat Turn Order */}
                {session.combatTracker.length > 0 && (
                  <div className="bg-[#0B0E0D] border border-[#232B28] p-4 rounded space-y-2">
                    <div className="flex items-center justify-between font-mono-tabular text-xs font-semibold text-[#E2E6E4]">
                      <span className="inline-flex items-center gap-1.5">
                        <Swords size={14} className="text-[#4ADE80]" />
                        <span>INITIATIVE ORDER</span>
                      </span>
                      {activeCombatant && (
                        <span className="text-[#4ADE80]">
                          Turn: {activeCombatant.name}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1">
                      {session.combatTracker.map((c) => (
                        <div
                          key={c.id}
                          className={`px-2.5 py-1.5 rounded text-xs font-mono-tabular flex items-center justify-between gap-2 ${
                            c.isActiveTurn
                              ? 'bg-[#16A34A]/20 border border-[#16A34A] text-[#4ADE80] font-bold'
                              : 'bg-[#121715] text-[#A5B0AC]'
                          }`}
                        >
                          <span className="truncate">
                            {c.isActiveTurn ? '▶ ' : ''}DEX {c.dexOrInit} —{' '}
                            {c.name}
                          </span>
                          <span className="text-[11px] shrink-0">
                            {c.isHpPublic ? (
                              <span>
                                HP {c.hpCurrent}/{c.hpMax}
                              </span>
                            ) : (
                              <span className="text-[#68736E]">HP Hidden</span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Public Threat Clocks */}
                {publicClocks.length > 0 && (
                  <div className="bg-[#0B0E0D] border border-[#232B28] p-4 rounded space-y-2.5">
                    <div className="flex items-center gap-1.5 font-mono-tabular text-xs font-semibold text-[#E2E6E4]">
                      <Clock size={14} className="text-[#4ADE80]" />
                      <span>THREAT & PROGRESS CLOCKS</span>
                    </div>
                    <div className="space-y-2.5">
                      {publicClocks.map((clk) => (
                        <div key={clk.id} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[#E2E6E4] font-semibold">
                              {clk.name}
                            </span>
                            <span className="font-mono-tabular text-[#4ADE80]">
                              {clk.filled}/{clk.segments}
                            </span>
                          </div>
                          <div className="flex gap-1 h-2.5">
                            {Array.from({ length: clk.segments }).map(
                              (_, idx) => (
                                <div
                                  key={idx}
                                  className={`flex-1 rounded-xs ${
                                    idx < clk.filled
                                      ? 'bg-[#16A34A]'
                                      : 'bg-[#121715]'
                                  }`}
                                />
                              )
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
