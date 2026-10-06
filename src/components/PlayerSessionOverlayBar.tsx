import React, { useState } from 'react';
import {
  Radio,
  Eye,
  Dices,
  Clock,
  Swords,
  X,
  FileText,
  MessageSquare,
  Calendar,
} from 'lucide-react';
import {
  GameSession,
  GmAsset,
  SharedSessionItem,
} from '../types/deltaGreen';
import { SessionMessageBoard } from './SessionMessageBoard';

interface PlayerSessionOverlayBarProps {
  session: GameSession;
  currentUserName?: string;
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

export const PlayerSessionOverlayBar: React.FC<PlayerSessionOverlayBarProps> = ({
  session,
  currentUserName = 'Agent',
  returnLabel = 'Return to Character Sheet',
  onPostTimelineEntry,
  onSaveToGmLibrary,
}) => {
  const [showTableModal, setShowTableModal] = useState(false);

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

  return (
    <>
      <div className="mb-4 border border-[#16A34A] bg-[#0E1311] px-4 py-2.5 rounded flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap min-w-0">
          <span className="inline-flex items-center gap-1.5 font-mono-tabular text-xs font-semibold text-[#4ADE80]">
            <Radio size={14} className="animate-pulse" />
            <span>LIVE GM SESSION: {session.title}</span>
          </span>
          <span className="text-[#68736E]">·</span>
          <span className="text-xs text-[#E2E6E4] font-medium truncate">
            {session.sceneState.title} ({session.sceneState.location})
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
              Session Message Board & Timeline ({session.sharedItems?.length || 0})
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
                  {session.title} — Session Timeline, Handouts & Scribble Notes
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
                  currentUserName={currentUserName}
                  isGm={false}
                  isPlayerMode={true}
                  onPostTimelineEntry={async (entry) => {
                    if (onPostTimelineEntry) {
                      await onPostTimelineEntry(entry, false);
                    }
                  }}
                  onSaveToGmLibrary={onSaveToGmLibrary}
                />
              </div>

              {/* Right 4 Columns: Public Rolls, Combat Order & Clocks */}
              <div className="lg:col-span-4 space-y-4">
                {/* Public Dice Log */}
                <div className="bg-[#0B0E0D] border border-[#232B28] p-4 rounded space-y-2.5">
                  <div className="flex items-center gap-1.5 font-mono-tabular text-xs font-semibold text-[#4ADE80]">
                    <Dices size={14} />
                    <span>PUBLIC TABLE ROLLS ({session.publicRolls.length})</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1.5">
                    {session.publicRolls.length === 0 ? (
                      <div className="text-xs text-[#68736E] py-2">
                        No public dice rolls yet.
                      </div>
                    ) : (
                      session.publicRolls.map((r) => (
                        <div
                          key={r.id}
                          className="bg-[#121715] border border-[#232B28] rounded px-3 py-1.5 flex items-center justify-between gap-2 text-xs"
                        >
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
                          <span className="font-mono-tabular text-base font-bold text-[#4ADE80]">
                            {r.result}
                          </span>
                        </div>
                      ))
                    )}
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
                            {c.isActiveTurn ? '▶ ' : ''}DEX {c.dexOrInit} — {c.name}
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
                            {Array.from({ length: clk.segments }).map((_, idx) => (
                              <div
                                key={idx}
                                className={`flex-1 rounded-xs ${
                                  idx < clk.filled ? 'bg-[#16A34A]' : 'bg-[#121715]'
                                }`}
                              />
                            ))}
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
