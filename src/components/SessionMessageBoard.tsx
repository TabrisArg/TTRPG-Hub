import React, { useState } from 'react';
import {
  Send,
  Clock,
  Calendar,
  PenTool,
  FolderPlus,
  Trash2,
  Eye,
  MessageSquare,
  FileText,
  UserSquare2,
  MapPin,
  Image as ImageIcon,
  ZoomIn,
  Database,
  Plus,
  RotateCcw,
} from 'lucide-react';
import {
  GameSession,
  GmAsset,
  SharedSessionItem,
} from '../types/deltaGreen';
import { StyledHandoutRenderer } from './StyledHandoutRenderer';
import { ScribbleStudioModal } from './ScribbleStudioModal';
import { ImageZoomModal } from './ImageZoomModal';
import { AddToGmLibraryModal } from './AddToGmLibraryModal';
import { CampaignDateTimePicker } from './CampaignDateTimePicker';

interface SessionMessageBoardProps {
  session: GameSession;
  currentUserName: string;
  isGm: boolean;
  /** True when the GM is testing Player Mode so GM-only controls are hidden */
  isPlayerMode?: boolean;
  onPostTimelineEntry: (
    entry: SharedSessionItem,
    asSpotlight?: boolean
  ) => Promise<void>;
  onDeleteTimelineEntry?: (entryId: string) => Promise<void>;
  onSetSpotlightEntry?: (entry: SharedSessionItem) => Promise<void>;
  onUpdateSessionDate?: (
    newDate: string,
    insertSeparatorInTimeline: boolean
  ) => Promise<void>;
  onApplyTimeSkip?: (
    skipId: string,
    timelineText: string,
    isFlashback: boolean
  ) => Promise<void>;
  onReturnToPresent?: () => Promise<void>;
  onSaveToGmLibrary?: (
    draft: Omit<GmAsset, 'id' | 'ownerId' | 'gameSystem' | 'updatedAt'>
  ) => Promise<string | void>;
  onOpenGmDatabaseTab?: () => void;
  onOpenQuickCreateTab?: () => void;
}

const PAST_TIME_SKIP_BUTTONS: {
  id: string;
  buttonLabel: string;
  timelineText: string;
}[] = [
  { id: '-minutes', buttonLabel: '-minutes', timelineText: 'A few minutes ago' },
  { id: '-hours', buttonLabel: '-hours', timelineText: 'A few hours ago' },
  { id: '-1day', buttonLabel: '-1day', timelineText: 'The previous day' },
  { id: '-days', buttonLabel: '-days', timelineText: 'A few days ago' },
  { id: '-weeks', buttonLabel: '-weeks', timelineText: 'A few weeks ago' },
  { id: '-years', buttonLabel: '-years', timelineText: 'A few years ago' },
];

const FORWARD_TIME_SKIP_BUTTONS: {
  id: string;
  buttonLabel: string;
  timelineText: string;
}[] = [
  { id: '+minutes', buttonLabel: '+minutes', timelineText: 'Minutes have passed' },
  { id: '+hours', buttonLabel: '+hours', timelineText: 'Hours have passed' },
  { id: '+1day', buttonLabel: '+1day', timelineText: 'The next day' },
  { id: '+days', buttonLabel: '+days', timelineText: 'Days have passed' },
  { id: '+weeks', buttonLabel: '+weeks', timelineText: 'Weeks have passed' },
  { id: '+years', buttonLabel: '+years', timelineText: 'Years have passed' },
];

export const SessionMessageBoard: React.FC<SessionMessageBoardProps> = ({
  session,
  currentUserName,
  isGm,
  isPlayerMode = false,
  onPostTimelineEntry,
  onDeleteTimelineEntry,
  onSetSpotlightEntry,
  onUpdateSessionDate,
  onApplyTimeSkip,
  onReturnToPresent,
  onSaveToGmLibrary,
  onOpenGmDatabaseTab,
  onOpenQuickCreateTab,
}) => {
  const canUseGmControls = isGm && !isPlayerMode;

  const [messageText, setMessageText] = useState<string>('');
  const [isSendingMessage, setIsSendingMessage] = useState<boolean>(false);

  // Time Skip & Session Date Panel state (GM)
  const [showTimeSkipPanel, setShowTimeSkipPanel] = useState<boolean>(false);
  const [specificDateInput, setSpecificDateInput] = useState<string>(
    session.sceneState?.dateTime || ''
  );

  // Blank Note / Scribble Modal state (All Users)
  const [showBlankScribbleModal, setShowBlankScribbleModal] =
    useState<boolean>(false);

  // Image Zoom & Pen Scribble Modal state
  const [zoomItem, setZoomItem] = useState<SharedSessionItem | null>(null);

  // Add to GM Library Modal state
  const [libraryTargetItem, setLibraryTargetItem] =
    useState<SharedSessionItem | null>(null);

  const nowTimeString = () =>
    new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

  // 1. Send Text Message to Session History
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || isSendingMessage) return;

    const text = messageText.trim();
    setMessageText('');
    setIsSendingMessage(true);
    try {
      const entry: SharedSessionItem = {
        id: `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        entryType: 'message',
        category: 'document',
        title: currentUserName,
        subtitle: canUseGmControls ? 'GAME MASTER' : 'PLAYER',
        imageUrl: '',
        publicContent: text,
        docStyle: '',
        docFont: '',
        docSignature: '',
        sharedAt: nowTimeString(),
        authorName: currentUserName,
        authorRole: canUseGmControls ? 'GM' : 'PLAYER',
      };
      await onPostTimelineEntry(entry, false);
    } finally {
      setIsSendingMessage(false);
    }
  };

  // 2. Insert Time Skip Separator & Update Campaign Time in Session History
  const handleInsertTimeSkip = async (
    skipId: string,
    separatorText: string,
    isFlashback = false,
    subtitleTag = 'TIME SKIP'
  ) => {
    if (onApplyTimeSkip) {
      await onApplyTimeSkip(skipId, separatorText, isFlashback);
      return;
    }

    const entry: SharedSessionItem = {
      id: `timeskip-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      entryType: 'timeskip',
      category: 'document',
      title: separatorText,
      subtitle: subtitleTag,
      imageUrl: '',
      publicContent: '',
      docStyle: '',
      docFont: '',
      docSignature: '',
      sharedAt: nowTimeString(),
      authorName: currentUserName,
      authorRole: 'GM',
    };
    await onPostTimelineEntry(entry, false);
  };

  // 3. Return to Present Campaign Time (after a Flashback)
  const handleBackInThePresent = async () => {
    if (onReturnToPresent) {
      await onReturnToPresent();
      return;
    }
    await handleInsertTimeSkip('present', 'Back in the present', false, 'PRESENT TIME');
  };

  // 4. Apply Specific Session Date & Insert Separator in Session History
  const handleApplySpecificDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!specificDateInput.trim()) return;
    const cleanDate = specificDateInput.trim();
    if (onUpdateSessionDate) {
      await onUpdateSessionDate(cleanDate, true);
    } else {
      await handleInsertTimeSkip('custom-date', cleanDate, false, 'SESSION DATE');
    }
  };

  // 5. Share Blank Document / Annotated Image from Scribble Studio to Timeline
  const handleShareScribbleToTimeline = async (
    dataUrl: string,
    title: string
  ) => {
    const entry: SharedSessionItem = {
      id: `scribble-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      entryType: 'scribble',
      category: 'image',
      title: title.trim() || 'Shared Note / Sketch',
      subtitle: `Shared by ${currentUserName}`,
      imageUrl: dataUrl,
      publicContent: '',
      docStyle: '',
      docFont: '',
      docSignature: '',
      sharedAt: nowTimeString(),
      authorName: currentUserName,
      authorRole: canUseGmControls ? 'GM' : 'PLAYER',
    };
    await onPostTimelineEntry(entry, canUseGmControls);
  };

  const timelineItems = session.sharedItems || [];

  // Display latest messages and timeline entries on top
  const displayedTimelineItems = [...timelineItems].reverse();

  const hasFlashbackSavedPresent = Boolean(
    session.sceneState?.presentDateTime &&
      session.sceneState.presentDateTime.trim().length > 0
  );

  const hasSpotlight =
    session.spotlightItem &&
    'id' in session.spotlightItem &&
    Boolean(session.spotlightItem.id);
  const spotlightId = hasSpotlight
    ? (session.spotlightItem as SharedSessionItem).id
    : null;

  return (
    <div className="border border-[#232B28] bg-[#121715] flex flex-col">
      {/* Blank Document / Scribble Studio Modal */}
      {showBlankScribbleModal && (
        <ScribbleStudioModal
          initialTitle="Field Note / Sketch"
          returnLabel="Return to Session Timeline"
          onShareToTimeline={handleShareScribbleToTimeline}
          onSaveToGmLibrary={onSaveToGmLibrary}
          onClose={() => setShowBlankScribbleModal(false)}
        />
      )}

      {/* Image Zoom & Pen Scribble Modal */}
      {zoomItem && zoomItem.imageUrl && (
        <ImageZoomModal
          imageUrl={zoomItem.imageUrl}
          title={zoomItem.title}
          subtitle={zoomItem.subtitle}
          returnLabel="Return to Session Timeline"
          onShareScribbleToTimeline={handleShareScribbleToTimeline}
          onSaveToGmLibrary={onSaveToGmLibrary}
          onClose={() => setZoomItem(null)}
        />
      )}

      {/* Add to GM Library Modal */}
      {libraryTargetItem && onSaveToGmLibrary && (
        <AddToGmLibraryModal
          imageUrl={libraryTargetItem.imageUrl || ''}
          defaultTitle={libraryTargetItem.title}
          defaultCategory={libraryTargetItem.category || 'document'}
          defaultSubtitle={libraryTargetItem.subtitle || ''}
          defaultPublicContent={libraryTargetItem.publicContent || ''}
          defaultDocStyle={libraryTargetItem.docStyle || 'official-document'}
          defaultDocFont={libraryTargetItem.docFont || 'typewriter'}
          defaultDocSignature={libraryTargetItem.docSignature || ''}
          onSaveToGmLibrary={onSaveToGmLibrary}
          onClose={() => setLibraryTargetItem(null)}
        />
      )}

      {/* ====================================================================
          1. MESSAGE BOARD TOP HEADER BAR: SESSION DATE, TIME SKIP & ACTIONS
         ==================================================================== */}
      <div className="p-4 border-b border-[#232B28] bg-[#0E1311] flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono-tabular text-xs font-semibold text-[#4ADE80]">
              SESSION MESSAGE BOARD & CHRONOLOGICAL TIMELINE
            </span>
            <span className="text-[#68736E]">·</span>
            <span className="inline-flex items-center gap-1 font-mono-tabular text-xs text-[#FBBF24] font-semibold">
              <Calendar size={12} />
              <span>
                CAMPAIGN TIME: {session.sceneState?.dateTime || 'Date Not Set'}
              </span>
            </span>
            {hasFlashbackSavedPresent && (
              <span className="px-2 py-0.5 rounded bg-[#D97706]/20 border border-[#D97706] font-mono-tabular text-[10px] font-bold text-[#FBBF24]">
                FLASHBACK ACTIVE (Present: {session.sceneState.presentDateTime})
              </span>
            )}
          </div>
          <p className="text-xs text-[#8C9692]">
            Latest messages, shared cards, handouts, and annotated images displayed on top.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick "Back in the Present" Button when GM is in a Flashback and Time Skip panel is closed */}
          {canUseGmControls && hasFlashbackSavedPresent && !showTimeSkipPanel && (
            <button
              type="button"
              onClick={handleBackInThePresent}
              title={`Restore campaign time to present (${session.sceneState.presentDateTime}) and insert "Back in the present" in timeline`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#D97706] hover:bg-[#B45309] text-white text-xs font-mono-tabular font-semibold cursor-pointer shadow-sm"
            >
              <RotateCcw size={13} />
              <span>Back in the Present</span>
            </button>
          )}

          {/* Blank Document / Scribble Studio Button (Available to ALL Users: Players & GM) */}
          <button
            type="button"
            onClick={() => setShowBlankScribbleModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-mono-tabular font-semibold cursor-pointer"
          >
            <PenTool size={13} />
            <span>Create Blank Document / Scribble</span>
          </button>

          {/* GM Time Skip & Session Date Button */}
          {canUseGmControls && (
            <button
              type="button"
              onClick={() => {
                setSpecificDateInput(
                  session.sceneState?.dateTime || 'October 14, 1998 // 2200 HRS'
                );
                setShowTimeSkipPanel((v) => !v);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono-tabular font-semibold border transition-colors cursor-pointer ${
                showTimeSkipPanel
                  ? 'bg-[#D97706] border-[#D97706] text-white'
                  : 'bg-[#0B0E0D] hover:bg-[#19201E] border-[#D97706] text-[#FBBF24]'
              }`}
            >
              <Clock size={13} />
              <span>Time Skip / Session Date</span>
            </button>
          )}

          {canUseGmControls && onOpenQuickCreateTab && (
            <button
              type="button"
              onClick={onOpenQuickCreateTab}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-[#0B0E0D] hover:bg-[#19201E] border border-[#232B28] text-xs font-mono-tabular text-[#E2E6E4] cursor-pointer"
            >
              <Plus size={13} className="text-[#4ADE80]" />
              <span>Quick Create Handout</span>
            </button>
          )}

          {canUseGmControls && onOpenGmDatabaseTab && (
            <button
              type="button"
              onClick={onOpenGmDatabaseTab}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-[#0B0E0D] hover:bg-[#19201E] border border-[#232B28] text-xs font-mono-tabular text-[#4ADE80] cursor-pointer"
            >
              <Database size={13} />
              <span>Share from GM Library</span>
            </button>
          )}
        </div>
      </div>

      {/* ====================================================================
          2. GM TIME SKIP & SESSION DATE PANEL (COLLAPSIBLE)
         ==================================================================== */}
      {canUseGmControls && showTimeSkipPanel && (
        <div className="p-4 border-b-2 border-[#D97706] bg-[#17130E] space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-mono-tabular text-xs font-bold text-[#FBBF24]">
                GM TIME SKIP & CAMPAIGN TIME CONTROLLER
              </div>
              <p className="text-xs text-[#A5B0AC]">
                Picking any time skip updates the current time of the campaign and inserts a time skip line in the timeline. Use &ldquo;Back in the present&rdquo; after a flashback to return to present campaign time.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowTimeSkipPanel(false)}
                className="px-2.5 py-1.5 rounded bg-[#0B0E0D] border border-[#232B28] text-xs font-mono-tabular text-[#A5B0AC] hover:text-[#E2E6E4] cursor-pointer"
              >
                Close Time Skip Panel
              </button>
            </div>
          </div>

          {/* Specific Date & Time Picker */}
          <form
            onSubmit={handleApplySpecificDate}
            className="flex flex-col sm:flex-row items-stretch sm:items-end justify-between gap-3 bg-[#0B0E0D] border border-[#232B28] p-3 rounded"
          >
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <label className="block font-mono-tabular text-[11px] text-[#FBBF24]">
                  SET CAMPAIGN DATE & TIME / INSERT SPECIFIC DATE SEPARATOR
                </label>
                <span className="font-mono-tabular text-[11px] text-[#4ADE80]">
                  Selected: {specificDateInput || 'October 14, 1998 // 2200 HRS'}
                </span>
              </div>
              <CampaignDateTimePicker
                value={specificDateInput}
                onChange={(formatted) => setSpecificDateInput(formatted)}
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded bg-[#D97706] hover:bg-[#B45309] text-white text-xs font-mono-tabular font-semibold cursor-pointer shrink-0"
            >
              <Calendar size={13} />
              <span>Set Date & Add Timeline Line</span>
            </button>
          </form>

          {/* Past (-) and Forward (+) Time Skip Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Past / Flashback Buttons */}
            <div className="bg-[#0B0E0D] border border-[#232B28] p-3 rounded space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="font-mono-tabular text-[11px] text-[#A5B0AC] font-semibold">
                  PAST / FLASHBACK (&ldquo;A few X ago&rdquo; / &ldquo;The previous day&rdquo;)
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PAST_TIME_SKIP_BUTTONS.map((btn) => (
                  <button
                    key={btn.id}
                    type="button"
                    onClick={() =>
                      handleInsertTimeSkip(btn.id, btn.timelineText, true)
                    }
                    title={`Rewinds campaign time for flashback and inserts "${btn.timelineText}"`}
                    className="px-3 py-1.5 rounded bg-[#121715] hover:bg-[#19201E] border border-[#232B28] hover:border-[#FBBF24] text-xs font-mono-tabular text-[#E2E6E4] cursor-pointer transition-colors"
                  >
                    {btn.buttonLabel}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleBackInThePresent}
                  title="Return from flashback to the present campaign time"
                  className="px-3 py-1.5 rounded bg-[#D97706] hover:bg-[#B45309] border border-[#D97706] text-xs font-mono-tabular text-white font-semibold cursor-pointer transition-colors inline-flex items-center gap-1"
                >
                  <RotateCcw size={12} />
                  <span>Back in the present</span>
                </button>
              </div>
            </div>

            {/* Forward / Time Passed Buttons */}
            <div className="bg-[#0B0E0D] border border-[#232B28] p-3 rounded space-y-2">
              <div className="font-mono-tabular text-[11px] text-[#4ADE80] font-semibold">
                TIME PASSED (&ldquo;X have passed&rdquo; / &ldquo;The next day&rdquo;)
              </div>
              <div className="flex flex-wrap gap-1.5">
                {FORWARD_TIME_SKIP_BUTTONS.map((btn) => (
                  <button
                    key={btn.id}
                    type="button"
                    onClick={() =>
                      handleInsertTimeSkip(btn.id, btn.timelineText, false)
                    }
                    title={`Advances campaign time forward and inserts "${btn.timelineText}"`}
                    className="px-3 py-1.5 rounded bg-[#121715] hover:bg-[#19201E] border border-[#232B28] hover:border-[#4ADE80] text-xs font-mono-tabular text-[#4ADE80] font-semibold cursor-pointer transition-colors"
                  >
                    {btn.buttonLabel}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          3. MESSAGE INPUT BOX FOR ALL USERS (PLAYERS & GM)
         ==================================================================== */}
      <form
        onSubmit={handleSendMessage}
        className="p-4 border-b border-[#232B28] bg-[#0E1311] flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
      >
        <div className="flex-1 flex items-center gap-2">
          <span className="hidden md:inline-block font-mono-tabular text-xs text-[#4ADE80] shrink-0">
            [{currentUserName}]:
          </span>
          <input
            type="text"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Write a message, field report, or action to post in the session's history..."
            className="w-full bg-[#0B0E0D] border border-[#232B28] focus:border-[#16A34A] rounded px-3.5 py-2 text-xs sm:text-sm text-[#E2E6E4] focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowBlankScribbleModal(true)}
            title="Create a blank document or scribble note to share with the session"
            className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded bg-[#121715] hover:bg-[#19201E] border border-[#232B28] text-xs font-mono-tabular text-[#4ADE80] whitespace-nowrap shrink-0 cursor-pointer"
          >
            <PenTool size={13} />
            <span className="hidden sm:inline">Blank Scribble</span>
          </button>

          <button
            type="submit"
            disabled={!messageText.trim() || isSendingMessage}
            className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-50 text-white text-xs font-mono-tabular font-semibold whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Send size={13} />
            <span>{isSendingMessage ? 'Posting...' : 'Post Message'}</span>
          </button>
        </div>
      </form>

      {/* ====================================================================
          4. SESSION TIMELINE FEED (LATEST ON TOP)
         ==================================================================== */}
      <div className="p-4 sm:p-5 space-y-4 max-h-[680px] overflow-y-auto bg-[#0B0E0D]/60">
        {displayedTimelineItems.length === 0 ? (
          <div className="border border-[#232B28] bg-[#121715] p-8 text-center space-y-2">
            <MessageSquare size={26} className="mx-auto text-[#4ADE80] opacity-80" />
            <div className="font-display text-sm font-bold text-[#E2E6E4]">
              Session Timeline is Ready
            </div>
            <p className="text-xs text-[#8C9692] max-w-md mx-auto">
              Write a message above, create a blank scribble note, insert a time skip, or share NPC cards, locations, archive images, and styled documents to log them in the session timeline.
            </p>
          </div>
        ) : (
          displayedTimelineItems.map((item) => {
            const entryType = item.entryType || 'asset';
            const isSpotlighted = spotlightId === item.id;

            /* --------------------------------------------------------------
               CASE A: TIME SKIP OR SESSION DATE LINE SEPARATOR
               -------------------------------------------------------------- */
            if (entryType === 'timeskip') {
              return (
                <div
                  key={item.id}
                  className="py-3 flex items-center gap-3 select-none group"
                >
                  <div className="flex-1 border-t-2 border-dashed border-[#D97706]/70" />
                  <div className="px-4 py-1.5 rounded bg-[#19140E] border-2 border-[#D97706] flex items-center gap-2 shadow-md">
                    <Clock size={13} className="text-[#FBBF24] shrink-0" />
                    <span className="font-display text-xs sm:text-sm font-bold tracking-wide text-[#FBBF24]">
                      {item.title}
                    </span>
                    {item.sharedAt && item.sharedAt !== 'START' && (
                      <span className="font-mono-tabular text-[10px] text-[#8C9692]">
                        · {item.sharedAt}
                      </span>
                    )}
                    {canUseGmControls && onDeleteTimelineEntry && (
                      <button
                        type="button"
                        onClick={() => onDeleteTimelineEntry(item.id)}
                        title="Remove time skip separator"
                        className="ml-1 text-[#8C9692] hover:text-[#F87171] cursor-pointer"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                  <div className="flex-1 border-t-2 border-dashed border-[#D97706]/70" />
                </div>
              );
            }

            /* --------------------------------------------------------------
               CASE B: USER / GM TEXT MESSAGE IN TIMELINE
               -------------------------------------------------------------- */
            if (entryType === 'message') {
              const isGmAuthor = item.authorRole === 'GM';
              return (
                <div
                  key={item.id}
                  className={`border rounded p-3.5 transition-colors ${
                    isGmAuthor
                      ? 'bg-[#121916] border-[#16A34A]/60'
                      : 'bg-[#121715] border-[#232B28]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`font-mono-tabular text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                          isGmAuthor
                            ? 'bg-[#16A34A]/20 text-[#4ADE80] border border-[#16A34A]/50'
                            : 'bg-[#0B0E0D] text-[#A5B0AC] border border-[#232B28]'
                        }`}
                      >
                        {isGmAuthor ? 'GM' : 'PLAYER'}
                      </span>
                      <span className="font-display text-xs sm:text-sm font-bold text-[#E2E6E4]">
                        {item.authorName || item.title}
                      </span>
                      <span className="font-mono-tabular text-[10px] text-[#68736E]">
                        {item.sharedAt}
                      </span>
                    </div>

                    {canUseGmControls && onDeleteTimelineEntry && (
                      <button
                        type="button"
                        onClick={() => onDeleteTimelineEntry(item.id)}
                        title="Delete message from timeline"
                        className="p-1 text-[#68736E] hover:text-[#F87171] cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>

                  <p className="text-xs sm:text-sm text-[#E2E6E4] whitespace-pre-wrap leading-relaxed">
                    {item.publicContent}
                  </p>
                </div>
              );
            }

            /* --------------------------------------------------------------
               CASE C: SHARED ASSET (NPC, LOCATION, DOCUMENT, IMAGE) OR SCRIBBLE NOTE
               -------------------------------------------------------------- */
            return (
              <div
                key={item.id}
                className={`border rounded p-4 space-y-3 transition-colors ${
                  isSpotlighted
                    ? 'bg-[#131C18] border-2 border-[#16A34A]'
                    : 'bg-[#121715] border-[#232B28]'
                }`}
              >
                {/* Timeline Entry Header Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#232B28] pb-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 font-mono-tabular text-[10px] font-semibold uppercase text-[#4ADE80]">
                      {item.category === 'npc' && <UserSquare2 size={12} />}
                      {item.category === 'location' && <MapPin size={12} />}
                      {item.category === 'image' && <ImageIcon size={12} />}
                      {item.category === 'document' && <FileText size={12} />}
                      <span>
                        {entryType === 'scribble'
                          ? 'SHARED NOTE / SCRIBBLE'
                          : `SHARED ${item.category.toUpperCase()}`}
                      </span>
                    </span>
                    <span className="text-[#68736E]">·</span>
                    <span className="font-display text-sm font-bold text-[#E2E6E4]">
                      {item.title}
                    </span>
                    {item.authorName && (
                      <span className="font-mono-tabular text-[10px] text-[#8C9692]">
                        by {item.authorName}
                      </span>
                    )}
                    <span className="font-mono-tabular text-[10px] text-[#68736E]">
                      · {item.sharedAt}
                    </span>
                    {isSpotlighted && (
                      <span className="font-mono-tabular text-[10px] font-bold text-[#FBBF24]">
                        ★ ACTIVE SPOTLIGHT
                      </span>
                    )}
                  </div>

                  {/* Entry Actions: Zoom & Scribble, Add to GM Library, Spotlight, Delete */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {item.imageUrl && (
                      <button
                        type="button"
                        onClick={() => setZoomItem(item)}
                        title="Zoom into image or press Pen icon to scribble on it"
                        className="inline-flex items-center justify-center gap-1 h-7 px-2.5 rounded bg-[#0B0E0D] hover:bg-[#19201E] border border-[#232B28] text-[11px] font-mono-tabular text-[#4ADE80] whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <ZoomIn size={12} />
                        <span>Zoom / Pen Scribble</span>
                      </button>
                    )}

                    {onSaveToGmLibrary && (
                      <button
                        type="button"
                        onClick={() => setLibraryTargetItem(item)}
                        title="Save this shared handout or image to your GM Library"
                        className="inline-flex items-center justify-center gap-1 h-7 px-2.5 rounded bg-[#0B0E0D] hover:bg-[#19201E] border border-[#232B28] text-[11px] font-mono-tabular text-[#E2E6E4] hover:text-[#4ADE80] whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <FolderPlus size={12} className="text-[#4ADE80] shrink-0" />
                        <span>Add to GM Library</span>
                      </button>
                    )}

                    {canUseGmControls && onSetSpotlightEntry && (
                      <button
                        type="button"
                        onClick={() => onSetSpotlightEntry(item)}
                        className={`inline-flex items-center justify-center gap-1 h-7 px-2.5 rounded text-[11px] font-mono-tabular border whitespace-nowrap shrink-0 cursor-pointer ${
                          isSpotlighted
                            ? 'bg-[#16A34A] border-[#16A34A] text-white font-semibold'
                            : 'bg-[#0B0E0D] hover:bg-[#19201E] border-[#232B28] text-[#A5B0AC]'
                        }`}
                      >
                        <Eye size={12} />
                        <span>{isSpotlighted ? 'Spotlighted' : 'Spotlight'}</span>
                      </button>
                    )}

                    {canUseGmControls && onDeleteTimelineEntry && (
                      <button
                        type="button"
                        onClick={() => onDeleteTimelineEntry(item.id)}
                        title="Remove from session timeline"
                        className="inline-flex items-center justify-center h-7 w-7 rounded bg-[#0B0E0D] hover:bg-[#DC2626]/20 border border-[#232B28] text-[#68736E] hover:text-[#F87171] shrink-0 cursor-pointer"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Rendered Handout or Scribble Note */}
                <StyledHandoutRenderer
                  category={item.category}
                  title={item.title}
                  subtitle={item.subtitle}
                  imageUrl={item.imageUrl}
                  publicContent={item.publicContent}
                  docStyle={item.docStyle}
                  docFont={item.docFont}
                  docSignature={item.docSignature}
                  showGmSecrets={false}
                  compact={true}
                  onShareScribbleToTimeline={handleShareScribbleToTimeline}
                  onSaveToGmLibrary={onSaveToGmLibrary}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
