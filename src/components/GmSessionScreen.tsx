import React, { useState } from 'react';
import {
  Users,
  Dices,
  Eye,
  EyeOff,
  Send,
  Plus,
  Trash2,
  ShieldAlert,
  Clock,
  Swords,
  Database,
  Mail,
  ChevronLeft,
  FolderOpen,
  X,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Zap,
  ZoomIn,
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  AgentCharacter,
  CombatantEntry,
  DocumentFontStyle,
  DocumentVisualStyle,
  DossierPage,
  GameSession,
  GmAsset,
  GmAssetCategory,
  SessionRollEntry,
  SharedSessionItem,
  ThreatClockEntry,
  VisualTheme,
} from '../types/deltaGreen';
import { ThemeSelectorDropdown } from './ThemeSelectorDropdown';
import {
  DOCUMENT_FONT_OPTIONS,
  DOCUMENT_VISUAL_STYLES,
  StyledHandoutRenderer,
} from './StyledHandoutRenderer';
import { GmAssetManager } from './GmAssetManager';
import { PlayerSessionOverlayBar } from './PlayerSessionOverlayBar';
import { ImageZoomModal } from './ImageZoomModal';
import { SessionMessageBoard } from './SessionMessageBoard';
import { PersonalDataSection } from './PersonalDataSection';
import { StatisticalAndPsychSection } from './StatisticalAndPsychSection';
import { ApplicableSkillSetsSection } from './ApplicableSkillSetsSection';
import { InjuriesAndEquipmentSection } from './InjuriesAndEquipmentSection';
import { RemarksSection } from './RemarksSection';

interface GmSessionScreenProps {
  user: User;
  visualTheme: VisualTheme;
  onChangeTheme: (theme: VisualTheme) => void;
  session: GameSession;
  sessionCharacters: AgentCharacter[];
  gmAssets: GmAsset[];
  onUpdateSession: (updated: GameSession) => Promise<void>;
  onCreateGmAsset: (
    draft: Omit<GmAsset, 'id' | 'ownerId' | 'gameSystem' | 'updatedAt'>
  ) => Promise<string | void>;
  onUpdateGmAsset: (asset: GmAsset) => Promise<void>;
  onDeleteGmAsset: (assetId: string) => Promise<void>;
  onRestoreStarterAssets?: () => Promise<void>;
  onBackToHub: () => void;
  isSyncing: boolean;
}

function rollDiceFormula(formula: string): { total: number; details: string } {
  const clean = formula.trim().toUpperCase();
  if (clean === 'LETHALITY') {
    const tens = Math.floor(Math.random() * 10);
    const ones = Math.floor(Math.random() * 10);
    const d100 = tens === 0 && ones === 0 ? 100 : tens * 10 + ones;
    const d1 = tens === 0 ? 10 : tens;
    const d2 = ones === 0 ? 10 : ones;
    return {
      total: d100,
      details: `d100=${d100}% (HP Damage if non-lethal: ${d1} + ${d2} = ${d1 + d2} HP)`,
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
  const modText = mod > 0 ? ` + ${mod}` : mod < 0 ? ` - ${Math.abs(mod)}` : '';
  return {
    total: sum,
    details: `${count}D${sides}${modText} → [${rolls.join(', ')}]${modText}`,
  };
}

function applyTimeSkipToCampaignDate(
  currentDateStr: string,
  skipId: string,
  timelineText: string
): string {
  const raw = (currentDateStr || 'October 14, 1998 // 2200 HRS')
    .replace(/\s*\((?:Flashback:.*|.*?have passed|The next day|The previous day|A few .*? ago)\)\s*$/i, '')
    .trim();

  // Try matching "Month DD, YYYY // HHMM HRS" or "Month DD, YYYY"
  const milMatch = raw.match(
    /^([A-Za-z]+\s+\d{1,2},?\s+\d{4})(?:\s*\/\/\s*(\d{2})(\d{2})\s*HRS)?/i
  );

  let parsedDate: Date | null = null;
  let hasMilitaryTime = false;

  if (milMatch) {
    const baseDatePart = milMatch[1];
    const hours = milMatch[2] ? parseInt(milMatch[2], 10) : 12;
    const mins = milMatch[3] ? parseInt(milMatch[3], 10) : 0;
    hasMilitaryTime = Boolean(milMatch[2]);
    const candidate = new Date(`${baseDatePart} 12:00:00`);
    if (!isNaN(candidate.getTime())) {
      candidate.setHours(hours, mins, 0, 0);
      parsedDate = candidate;
    }
  } else {
    const fallbackTimestamp = Date.parse(raw);
    if (!isNaN(fallbackTimestamp)) {
      parsedDate = new Date(fallbackTimestamp);
      hasMilitaryTime = /\d{1,2}:\d{2}|\d{4}\s*HRS/i.test(raw);
    }
  }

  if (parsedDate) {
    const d = new Date(parsedDate.getTime());
    switch (skipId) {
      case '-minutes':
        d.setMinutes(d.getMinutes() - 20);
        hasMilitaryTime = true;
        break;
      case '+minutes':
        d.setMinutes(d.getMinutes() + 20);
        hasMilitaryTime = true;
        break;
      case '-hours':
        d.setHours(d.getHours() - 3);
        hasMilitaryTime = true;
        break;
      case '+hours':
        d.setHours(d.getHours() + 3);
        hasMilitaryTime = true;
        break;
      case '-1day':
        d.setDate(d.getDate() - 1);
        break;
      case '+1day':
        d.setDate(d.getDate() + 1);
        break;
      case '-days':
        d.setDate(d.getDate() - 3);
        break;
      case '+days':
        d.setDate(d.getDate() + 3);
        break;
      case '-weeks':
        d.setDate(d.getDate() - 14);
        break;
      case '+weeks':
        d.setDate(d.getDate() + 14);
        break;
      case '-years':
        d.setFullYear(d.getFullYear() - 1);
        break;
      case '+years':
        d.setFullYear(d.getFullYear() + 1);
        break;
      default:
        break;
    }

    const dateFormatted = d.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    if (hasMilitaryTime) {
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      return `${dateFormatted} // ${hh}${mm} HRS`;
    }
    return dateFormatted;
  }

  return `${raw} (${timelineText})`;
}

export const GmSessionScreen: React.FC<GmSessionScreenProps> = ({
  user,
  visualTheme,
  onChangeTheme,
  session,
  sessionCharacters,
  gmAssets,
  onUpdateSession,
  onCreateGmAsset,
  onUpdateGmAsset,
  onDeleteGmAsset,
  onRestoreStarterAssets,
  onBackToHub,
  isSyncing,
}) => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'quick-create' | 'gm-database' | 'combat-clocks'
  >('overview');
  const [isPlayerMode, setIsPlayerMode] = useState<boolean>(false);
  const [zoomPortraitAgent, setZoomPortraitAgent] =
    useState<AgentCharacter | null>(null);

  // Inspecting a joined player's character sheet
  const [inspectedAgentId, setInspectedAgentId] = useState<string | null>(null);
  const [inspectPage, setInspectPage] = useState<DossierPage>('personal');

  // Invite player email input
  const [emailInput, setEmailInput] = useState('');

  // Dice Roller state
  const [rollIsPrivate, setRollIsPrivate] = useState<boolean>(false);
  const [rollLabel, setRollLabel] = useState<string>('');
  const [customFormula, setCustomFormula] = useState<string>('1D100');

  // Quick-Create Handout on the Go state
  const [qcCategory, setQcCategory] = useState<GmAssetCategory>('document');
  const [qcTitle, setQcTitle] = useState('');
  const [qcSubtitle, setQcSubtitle] = useState('');
  const [qcImageUrl, setQcImageUrl] = useState('');
  const [qcContent, setQcContent] = useState('');
  const [qcSecret, setQcSecret] = useState('');
  const [qcDocStyle, setQcDocStyle] = useState<DocumentVisualStyle>('official-document');
  const [qcDocFont, setQcDocFont] = useState<DocumentFontStyle>('typewriter');
  const [qcSignature, setQcSignature] = useState('');
  const [qcSaveToDb, setQcSaveToDb] = useState<boolean>(true);

  // Combat & Clocks inputs
  const [newCombatantName, setNewCombatantName] = useState('');
  const [newCombatantDex, setNewCombatantDex] = useState(10);
  const [newCombatantHp, setNewCombatantHp] = useState(10);
  const [newCombatantHpPublic, setNewCombatantHpPublic] = useState<boolean>(false);
  const [newClockName, setNewClockName] = useState('');
  const [newClockSegments, setNewClockSegments] = useState(6);

  const inspectedAgent =
    sessionCharacters.find((c) => c.id === inspectedAgentId) || null;

  // 1. Invite Player by Gmail
  const handleAddInviteEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = emailInput.trim().toLowerCase();
    if (!cleaned || !cleaned.includes('@')) return;
    if (session.invitedEmails.includes(cleaned)) {
      setEmailInput('');
      return;
    }
    await onUpdateSession({
      ...session,
      invitedEmails: [...session.invitedEmails, cleaned].slice(0, 20),
    });
    setEmailInput('');
  };

  const handleRemoveInviteEmail = async (targetEmail: string) => {
    await onUpdateSession({
      ...session,
      invitedEmails: session.invitedEmails.filter((e) => e !== targetEmail),
    });
  };

  // 2. Roll Dice (Public or Private GM Roll)
  const handleExecuteRoll = async (formula: string, defaultLabel?: string) => {
    const { total, details } = rollDiceFormula(formula);
    const entry: SessionRollEntry = {
      id: `roll-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      rollerName: `GM (${user.displayName || 'Handler'})`,
      label: rollLabel.trim() || defaultLabel || `${formula} Roll`,
      formula,
      result: total,
      details,
      isPrivate: rollIsPrivate,
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    };

    if (rollIsPrivate) {
      await onUpdateSession({
        ...session,
        privateRolls: [entry, ...(session.privateRolls || [])].slice(0, 50),
      });
    } else {
      await onUpdateSession({
        ...session,
        publicRolls: [entry, ...(session.publicRolls || [])].slice(0, 50),
      });
    }
  };

  // 3. Share Asset from GM Database or Quick-Create to Session Timeline
  const handleShareAssetToSession = async (
    asset: GmAsset,
    asSpotlight = true
  ) => {
    const sharedItem: SharedSessionItem = {
      id: `shared-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      entryType: 'asset',
      category: asset.category,
      title: asset.title,
      subtitle: asset.subtitle,
      imageUrl: asset.imageUrl,
      publicContent: asset.publicContent,
      docStyle: asset.docStyle,
      docFont: asset.docFont,
      docSignature: asset.docSignature,
      sharedAt: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      authorName: user.displayName || user.email || 'Handler',
      authorRole: 'GM',
    };

    await onUpdateSession({
      ...session,
      spotlightItem: asSpotlight ? sharedItem : session.spotlightItem,
      sharedItems: [...(session.sharedItems || []), sharedItem].slice(-100),
    });
  };

  const handlePostTimelineEntry = async (
    entry: SharedSessionItem,
    asSpotlight = false
  ) => {
    await onUpdateSession({
      ...session,
      spotlightItem: asSpotlight ? entry : session.spotlightItem,
      sharedItems: [...(session.sharedItems || []), entry].slice(-100),
    });
  };

  const handleDeleteTimelineEntry = async (entryId: string) => {
    const remaining = (session.sharedItems || []).filter(
      (item) => item.id !== entryId
    );
    const isCurrentSpotlight =
      (session.spotlightItem as SharedSessionItem)?.id === entryId;
    await onUpdateSession({
      ...session,
      sharedItems: remaining,
      spotlightItem: isCurrentSpotlight ? {} : session.spotlightItem,
    });
  };

  const handleUpdateSessionDate = async (
    newDate: string,
    insertSeparatorInTimeline: boolean
  ) => {
    const cleanDate = newDate.trim();
    if (!cleanDate) return;

    const nextShared = insertSeparatorInTimeline
      ? [
          ...(session.sharedItems || []),
          {
            id: `timeskip-date-${Date.now()}`,
            entryType: 'timeskip' as const,
            category: 'document' as const,
            title: cleanDate,
            subtitle: 'SESSION DATE',
            imageUrl: '',
            publicContent: '',
            docStyle: '' as const,
            docFont: '' as const,
            docSignature: '',
            sharedAt: new Date().toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            }),
            authorName: user.displayName || 'Handler',
            authorRole: 'GM' as const,
          },
        ].slice(-100)
      : session.sharedItems;

    await onUpdateSession({
      ...session,
      sceneState: {
        ...session.sceneState,
        dateTime: cleanDate,
        presentDateTime: '',
      },
      sharedItems: nextShared,
    });
  };

  const handleApplyTimeSkip = async (
    skipId: string,
    timelineText: string,
    isFlashback: boolean
  ) => {
    const currentDateTime =
      session.sceneState.dateTime || 'October 14, 1998 // 2200 HRS';
    const updatedDateTime = applyTimeSkipToCampaignDate(
      currentDateTime,
      skipId,
      timelineText
    );

    const savedPresent = isFlashback
      ? session.sceneState.presentDateTime || currentDateTime
      : session.sceneState.presentDateTime || '';

    const separatorEntry: SharedSessionItem = {
      id: `timeskip-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      entryType: 'timeskip',
      category: 'document',
      title: `${timelineText} — ${updatedDateTime}`,
      subtitle: isFlashback ? 'FLASHBACK' : 'TIME SKIP',
      imageUrl: '',
      publicContent: '',
      docStyle: '',
      docFont: '',
      docSignature: '',
      sharedAt: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      authorName: user.displayName || 'Handler',
      authorRole: 'GM',
    };

    await onUpdateSession({
      ...session,
      sceneState: {
        ...session.sceneState,
        dateTime: updatedDateTime,
        presentDateTime: savedPresent,
      },
      sharedItems: [...(session.sharedItems || []), separatorEntry].slice(-100),
    });
  };

  const handleReturnToPresent = async () => {
    const restoredDate =
      session.sceneState.presentDateTime?.trim() ||
      session.sceneState.dateTime ||
      'October 14, 1998 // 2200 HRS';

    const separatorEntry: SharedSessionItem = {
      id: `timeskip-present-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      entryType: 'timeskip',
      category: 'document',
      title: `Back in the present — ${restoredDate}`,
      subtitle: 'PRESENT TIME',
      imageUrl: '',
      publicContent: '',
      docStyle: '',
      docFont: '',
      docSignature: '',
      sharedAt: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      authorName: user.displayName || 'Handler',
      authorRole: 'GM',
    };

    await onUpdateSession({
      ...session,
      sceneState: {
        ...session.sceneState,
        dateTime: restoredDate,
        presentDateTime: '',
      },
      sharedItems: [...(session.sharedItems || []), separatorEntry].slice(-100),
    });
  };

  const handleQuickCreateAndBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qcTitle.trim()) return;

    const draft = {
      category: qcCategory,
      title: qcTitle.trim(),
      subtitle: qcSubtitle.trim(),
      imageUrl: qcImageUrl.trim(),
      publicContent: qcContent,
      gmSecretNotes: qcSecret,
      docStyle: qcCategory === 'document' ? qcDocStyle : ('' as const),
      docFont: qcCategory === 'document' ? qcDocFont : ('' as const),
      docSignature: qcCategory === 'document' ? qcSignature.trim() : '',
    };

    if (qcSaveToDb) {
      await onCreateGmAsset(draft);
    }

    await handleShareAssetToSession(
      {
        ...draft,
        id: `qc-${Date.now()}`,
        ownerId: user.uid,
        gameSystem: 'delta-green',
        updatedAt: new Date().toISOString(),
      },
      true
    );

    setQcTitle('');
    setQcSubtitle('');
    setQcImageUrl('');
    setQcContent('');
    setQcSecret('');
    setQcSignature('');
    setActiveTab('overview');
  };

  // 4. Combat Tracker & Threat Clocks Helpers
  const handleImportJoinedPlayersToCombat = async () => {
    const existingNames = new Set(session.combatTracker.map((c) => c.name));
    const added: CombatantEntry[] = sessionCharacters
      .filter((ch) => !existingNames.has(ch.fullNameAndAlias || 'Agent'))
      .map((ch) => ({
        id: `cb-${ch.id}`,
        name: ch.fullNameAndAlias || 'Unnamed Agent',
        dexOrInit: ch.statistics?.DEX?.score || 10,
        hpCurrent: ch.derived?.hp?.current || 10,
        hpMax: ch.derived?.hp?.max || 10,
        status: 'READY',
        isNpc: false,
        isActiveTurn: false,
        isHpPublic: true,
      }));

    const merged = [...session.combatTracker, ...added].sort(
      (a, b) => b.dexOrInit - a.dexOrInit
    );
    await onUpdateSession({
      ...session,
      combatTracker: merged.slice(0, 30),
    });
  };

  const handleAddCombatant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCombatantName.trim()) return;
    const entry: CombatantEntry = {
      id: `cb-${Date.now()}`,
      name: newCombatantName.trim(),
      dexOrInit: Number(newCombatantDex) || 10,
      hpCurrent: Number(newCombatantHp) || 10,
      hpMax: Number(newCombatantHp) || 10,
      status: 'ACTIVE',
      isNpc: true,
      isActiveTurn: session.combatTracker.length === 0,
      isHpPublic: newCombatantHpPublic,
    };
    const next = [...session.combatTracker, entry].sort(
      (a, b) => b.dexOrInit - a.dexOrInit
    );
    await onUpdateSession({
      ...session,
      combatTracker: next.slice(0, 30),
    });
    setNewCombatantName('');
  };

  const handleNextCombatTurn = async () => {
    if (session.combatTracker.length === 0) return;
    const currentIdx = session.combatTracker.findIndex((c) => c.isActiveTurn);
    const nextIdx =
      currentIdx === -1 ? 0 : (currentIdx + 1) % session.combatTracker.length;
    const updated = session.combatTracker.map((c, idx) => ({
      ...c,
      isActiveTurn: idx === nextIdx,
    }));
    await onUpdateSession({
      ...session,
      combatTracker: updated,
    });
  };

  const handleAddClock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClockName.trim()) return;
    const clock: ThreatClockEntry = {
      id: `clk-${Date.now()}`,
      name: newClockName.trim(),
      filled: 0,
      segments: Math.max(2, Math.min(12, Number(newClockSegments) || 6)),
      isPublic: true,
    };
    await onUpdateSession({
      ...session,
      clocks: [...session.clocks, clock].slice(0, 15),
    });
    setNewClockName('');
  };

  return (
    <div
      data-theme={visualTheme}
      className="min-h-screen bg-[#0B0E0D] text-[#E2E6E4] flex flex-col"
    >
      {/* Portrait Zoom Modal */}
      {zoomPortraitAgent && zoomPortraitAgent.portraitUrl && (
        <ImageZoomModal
          imageUrl={zoomPortraitAgent.portraitUrl}
          title={zoomPortraitAgent.fullNameAndAlias || 'Agent Portrait'}
          subtitle={zoomPortraitAgent.professionAndRank}
          returnLabel={`Return to GM Command Console (${session.title})`}
          onClose={() => setZoomPortraitAgent(null)}
        />
      )}

      {/* Top Bar */}
      <header className="sticky top-0 z-30 bg-[#070908]/95 backdrop-blur-md border-b border-[#232B28] px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBackToHub}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-[#121715] hover:bg-[#19201E] border border-[#232B28] text-xs font-mono-tabular text-[#A5B0AC] hover:text-[#E2E6E4] cursor-pointer shrink-0"
          >
            <ChevronLeft size={14} className="text-[#4ADE80]" />
            <span>Return to Delta Green Hub</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 min-w-0">
            <span className="font-mono-tabular text-xs text-[#4ADE80] font-semibold">
              {isPlayerMode ? 'PLAYER MODE PREVIEW' : 'GM COMMAND CONSOLE'}
            </span>
            <span className="text-[#68736E]">·</span>
            <span className="font-display text-sm font-bold text-[#E2E6E4] truncate">
              {session.title}
            </span>
          </div>
        </div>

        {/* Navigation Tabs (Hidden when in Player Mode) */}
        {!isPlayerMode && (
          <nav className="hidden lg:flex items-center gap-2">
            {(
              [
                { id: 'overview', label: '01. Live Table & Players' },
                { id: 'quick-create', label: '02. Quick Create Handout' },
                { id: 'gm-database', label: `03. GM Database (${gmAssets.length})` },
                { id: 'combat-clocks', label: '04. Combat & Threat Clocks' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`px-3 py-1.5 rounded text-xs font-mono-tabular transition-colors cursor-pointer ${
                  activeTab === t.id
                    ? 'bg-[#16A34A] text-white font-semibold'
                    : 'text-[#A5B0AC] hover:text-[#E2E6E4] bg-[#121715] border border-[#232B28]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-2.5 shrink-0">
          {/* Player Mode Toggle Button */}
          <button
            type="button"
            onClick={() => setIsPlayerMode((v) => !v)}
            title="Toggle Player Mode to test what joined players see in this session"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono-tabular font-semibold border transition-colors cursor-pointer ${
              isPlayerMode
                ? 'bg-[#D97706] hover:bg-[#B45309] border-[#D97706] text-white'
                : 'bg-[#121715] hover:bg-[#19201E] border-[#16A34A] text-[#4ADE80]'
            }`}
          >
            <Eye size={13} />
            <span>{isPlayerMode ? 'Exit Player Mode' : 'Player Mode'}</span>
          </button>

          <ThemeSelectorDropdown
            theme={visualTheme}
            onChangeTheme={onChangeTheme}
          />
          <span className="hidden md:inline-block text-xs font-medium text-[#E2E6E4] truncate max-w-[140px]">
            {user.displayName || user.email}
          </span>
        </div>
      </header>

      {/* Mobile Tab Switcher */}
      {!isPlayerMode && (
        <div className="lg:hidden bg-[#0E1311] border-b border-[#232B28] px-3 py-2 flex gap-1.5 overflow-x-auto">
          {(
            [
              { id: 'overview', label: 'Live Table' },
              { id: 'quick-create', label: 'Quick Create' },
              { id: 'gm-database', label: `GM DB (${gmAssets.length})` },
              { id: 'combat-clocks', label: 'Combat & Clocks' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`px-3 py-1.5 rounded text-xs font-mono-tabular whitespace-nowrap cursor-pointer ${
                activeTab === t.id
                  ? 'bg-[#16A34A] text-white font-semibold'
                  : 'bg-[#121715] text-[#A5B0AC] border border-[#232B28]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Main GM or Player Testing Workspace */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto p-4 sm:p-6 space-y-6">
        {isPlayerMode ? (
          <div className="space-y-6">
            {/* Player Mode Testing Banner */}
            <div className="border-2 border-[#D97706] bg-[#191510] px-4 py-3 rounded flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="inline-flex items-center gap-1.5 font-mono-tabular text-xs font-bold text-[#FBBF24]">
                  <Eye size={14} />
                  <span>
                    PLAYER MODE PREVIEW ACTIVE — SEEING EXACTLY WHAT JOINED PLAYERS SEE
                  </span>
                </div>
                <p className="text-xs text-[#E2E6E4]">
                  GM secret notes, unshared GM database assets, and private GM dice rolls are hidden in this view. Click any image to test the image zoom magnifier.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsPlayerMode(false)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-mono-tabular font-semibold cursor-pointer shrink-0"
              >
                <ChevronLeft size={14} />
                <span>Return to GM Command Console</span>
              </button>
            </div>

            {/* Exact Live Player Session Overlay Bar shown on Player Character Sheets */}
            <PlayerSessionOverlayBar
              session={session}
              currentUserName={user.displayName || user.email || 'Player'}
              returnLabel="Return to Player Mode Preview"
              onPostTimelineEntry={handlePostTimelineEntry}
              onSaveToGmLibrary={onCreateGmAsset}
            />

            {/* Player Tabletop Feed: Session Message Board, Public Dice, Combat & Clocks */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left 8 Columns: Interactive Session Message Board & Chronological Timeline */}
              <div className="lg:col-span-8">
                <SessionMessageBoard
                  session={session}
                  currentUserName={user.displayName || user.email || 'Player (Test)'}
                  isGm={true}
                  isPlayerMode={true}
                  onPostTimelineEntry={handlePostTimelineEntry}
                  onSaveToGmLibrary={onCreateGmAsset}
                />
              </div>

              {/* Right 4 Columns: Public Rolls, Combat Order & Public Clocks */}
              <div className="lg:col-span-4 space-y-4">
                {/* Public Dice Log */}
                <div className="border border-[#232B28] bg-[#121715] p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-[#232B28] pb-2">
                    <span className="inline-flex items-center gap-1.5 font-mono-tabular text-xs font-semibold text-[#4ADE80]">
                      <Dices size={14} />
                      <span>PUBLIC TABLE ROLLS ({session.publicRolls.length})</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleExecuteRoll('1D100', 'Player Test Roll (d100)')}
                      className="px-2.5 py-1 rounded bg-[#16A34A] hover:bg-[#15803D] text-white text-[11px] font-mono-tabular font-semibold cursor-pointer"
                    >
                      Test Roll d100
                    </button>
                  </div>

                  <div className="max-h-52 overflow-y-auto space-y-1.5">
                    {session.publicRolls.length === 0 ? (
                      <div className="text-xs text-[#68736E] py-3 text-center">
                        No public dice rolls yet. Private GM rolls are hidden from players.
                      </div>
                    ) : (
                      session.publicRolls.map((r) => (
                        <div
                          key={r.id}
                          className="bg-[#0B0E0D] border border-[#232B28] rounded px-3 py-2 flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="min-w-0">
                            <div className="font-semibold text-[#E2E6E4] truncate">
                              {r.label}{' '}
                              <span className="text-[10px] text-[#8C9692]">
                                ({r.rollerName})
                              </span>
                            </div>
                            <div className="font-mono-tabular text-[10px] text-[#68736E]">
                              {r.details} · {r.timestamp}
                            </div>
                          </div>
                          <span className="font-mono-tabular text-sm font-bold text-[#4ADE80] shrink-0">
                            {r.result}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Combat Initiative Order */}
                <div className="border border-[#232B28] bg-[#121715] p-4 space-y-2.5">
                  <div className="flex items-center gap-1.5 font-mono-tabular text-xs font-semibold text-[#4ADE80] border-b border-[#232B28] pb-2">
                    <Swords size={14} />
                    <span>INITIATIVE / COMBAT ORDER ({session.combatTracker.length})</span>
                  </div>
                  {session.combatTracker.length === 0 ? (
                    <div className="text-xs text-[#68736E] py-2">
                      No active combat tracker.
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {session.combatTracker.map((c) => (
                        <div
                          key={c.id}
                          className={`px-3 py-2 rounded border flex items-center justify-between gap-2 text-xs ${
                            c.isActiveTurn
                              ? 'bg-[#16A34A]/15 border-[#16A34A] text-[#E2E6E4] font-bold'
                              : 'bg-[#0B0E0D] border-[#232B28] text-[#A5B0AC]'
                          }`}
                        >
                          <span className="truncate">
                            {c.isActiveTurn ? '▶ ' : ''}
                            {c.name} (DEX {c.dexOrInit})
                          </span>
                          <span className="font-mono-tabular text-[11px] shrink-0">
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
                  )}
                </div>

                {/* Public Threat Clocks */}
                <div className="border border-[#232B28] bg-[#121715] p-4 space-y-2.5">
                  <div className="flex items-center gap-1.5 font-mono-tabular text-xs font-semibold text-[#4ADE80] border-b border-[#232B28] pb-2">
                    <Clock size={14} />
                    <span>
                      PUBLIC PROGRESS & THREAT CLOCKS (
                      {session.clocks.filter((c) => c.isPublic).length})
                    </span>
                  </div>
                  {session.clocks.filter((c) => c.isPublic).length === 0 ? (
                    <div className="text-xs text-[#68736E] py-2">
                      No public clocks displayed.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {session.clocks
                        .filter((c) => c.isPublic)
                        .map((clk) => (
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
                                    idx < clk.filled ? 'bg-[#16A34A]' : 'bg-[#0B0E0D]'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
        {/* Scene Broadcast & Invitation Banner */}
        <section className="border border-[#232B28] bg-[#121715] p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left: Scene & Atmosphere Broadcast */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 font-mono-tabular text-xs font-semibold text-[#4ADE80]">
                <Radio size={14} />
                <span>LIVE SCENE BROADCAST (SHOWN TO ALL JOINED PLAYERS)</span>
              </span>
              <span className="font-mono-tabular text-[11px] text-[#8C9692]">
                {isSyncing ? 'Syncing...' : 'Live Sync Active'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="block font-mono-tabular text-[10px] text-[#8C9692] mb-1">
                  CURRENT SCENE TITLE
                </label>
                <input
                  type="text"
                  value={session.sceneState.title}
                  onChange={(e) =>
                    onUpdateSession({
                      ...session,
                      sceneState: { ...session.sceneState, title: e.target.value },
                    })
                  }
                  placeholder="Scene title..."
                  className="w-full bg-[#0B0E0D] border border-[#232B28] focus:border-[#16A34A] rounded px-2.5 py-1.5 text-xs text-[#E2E6E4] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-mono-tabular text-[10px] text-[#8C9692] mb-1">
                  LOCATION
                </label>
                <input
                  type="text"
                  value={session.sceneState.location}
                  onChange={(e) =>
                    onUpdateSession({
                      ...session,
                      sceneState: { ...session.sceneState, location: e.target.value },
                    })
                  }
                  placeholder="Current location..."
                  className="w-full bg-[#0B0E0D] border border-[#232B28] focus:border-[#16A34A] rounded px-2.5 py-1.5 text-xs text-[#E2E6E4] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-mono-tabular text-[10px] text-[#FBBF24] mb-1">
                  SESSION DATE / TIME
                </label>
                <input
                  type="text"
                  value={session.sceneState.dateTime || ''}
                  onChange={(e) =>
                    onUpdateSession({
                      ...session,
                      sceneState: {
                        ...session.sceneState,
                        dateTime: e.target.value,
                      },
                    })
                  }
                  placeholder="e.g., October 14, 1998"
                  className="w-full bg-[#0B0E0D] border border-[#232B28] focus:border-[#FBBF24] rounded px-2.5 py-1.5 text-xs text-[#E2E6E4] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-mono-tabular text-[10px] text-[#8C9692] mb-1">
                  ALERT STATUS
                </label>
                <select
                  value={session.sceneState.alertLevel}
                  onChange={(e) =>
                    onUpdateSession({
                      ...session,
                      sceneState: {
                        ...session.sceneState,
                        alertLevel: e.target.value as any,
                      },
                    })
                  }
                  className="w-full bg-[#0B0E0D] border border-[#232B28] focus:border-[#16A34A] rounded px-2.5 py-1.5 text-xs font-mono-tabular text-[#E2E6E4] focus:outline-none"
                >
                  <option value="NORMAL">NORMAL</option>
                  <option value="SURVEILLANCE">SURVEILLANCE</option>
                  <option value="COMBAT">COMBAT</option>
                  <option value="CONTAINMENT BREACH">CONTAINMENT BREACH</option>
                </select>
              </div>
            </div>
          </div>

          {/* Right: Invite Players via Gmail */}
          <div className="lg:col-span-5 lg:border-l lg:border-[#232B28] lg:pl-5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 font-mono-tabular text-xs font-semibold text-[#E2E6E4]">
                <Mail size={14} className="text-[#4ADE80]" />
                <span>INVITED PLAYER GMAILS ({session.invitedEmails.length})</span>
              </span>
            </div>

            <form onSubmit={handleAddInviteEmail} className="flex gap-2">
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="player@gmail.com"
                className="flex-1 bg-[#0B0E0D] border border-[#232B28] focus:border-[#16A34A] rounded px-3 py-1.5 text-xs text-[#E2E6E4] focus:outline-none"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-[#16A34A] hover:bg-[#15803D] text-xs font-mono-tabular font-semibold text-white cursor-pointer shrink-0"
              >
                <Plus size={13} />
                <span>Invite</span>
              </button>
            </form>

            <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
              {session.invitedEmails.length === 0 ? (
                <span className="text-[11px] text-[#68736E]">
                  No players invited yet. Add a player&apos;s Gmail address so this session appears on their game page.
                </span>
              ) : (
                session.invitedEmails.map((email) => {
                  const hasJoined = session.joinedPlayers.some(
                    (jp) => jp.email.toLowerCase() === email.toLowerCase()
                  );
                  return (
                    <span
                      key={email}
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono-tabular border ${
                        hasJoined
                          ? 'bg-[#16A34A]/15 border-[#16A34A] text-[#4ADE80]'
                          : 'bg-[#0B0E0D] border-[#232B28] text-[#A5B0AC]'
                      }`}
                    >
                      <span>{email}</span>
                      {hasJoined && <CheckCircle2 size={11} />}
                      <button
                        type="button"
                        onClick={() => handleRemoveInviteEmail(email)}
                        className="text-[#68736E] hover:text-[#F87171] cursor-pointer"
                        title="Revoke invitation"
                      >
                        <X size={11} />
                      </button>
                    </span>
                  );
                })
              )}
            </div>
          </div>
        </section>

        {/* TAB 1: LIVE TABLE, JOINED PLAYER DOSSIERS, DICE ROLLER & SPOTLIGHT */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 8 Columns: Joined Players' Character Sheets + Active Spotlight & Shared Feed */}
            <div className="lg:col-span-8 space-y-6">
              {/* 1. Joined Player Character Profiles */}
              <div className="border border-[#232B28] bg-[#121715] p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-[#232B28] pb-3">
                  <div>
                    <h2 className="font-display text-base sm:text-lg font-bold text-[#E2E6E4] flex items-center gap-2">
                      <Users size={18} className="text-[#4ADE80]" />
                      <span>
                        Joined Player Character Profiles ({sessionCharacters.length})
                      </span>
                    </h2>
                    <p className="text-xs text-[#8C9692]">
                      Real-time character sheets synced from players who joined this session
                    </p>
                  </div>
                </div>

                {sessionCharacters.length === 0 ? (
                  <div className="bg-[#0B0E0D] border border-[#232B28] p-6 text-center space-y-1">
                    <p className="text-xs sm:text-sm text-[#A5B0AC]">
                      No player characters linked to this session yet.
                    </p>
                    <p className="text-xs text-[#68736E]">
                      Once an invited player signs in with their Gmail account and clicks &quot;Join Session&quot; on the Delta Green page, their full character dossier will appear here automatically.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {sessionCharacters.map((ag) => {
                      const isBpReached =
                        ag.derived.san.max > 0 &&
                        ag.derived.san.current <= ag.derived.bp.current;
                      const trainedSkills = (ag.skills || [])
                        .filter((s) => s.value > s.base)
                        .sort((a, b) => b.value - a.value)
                        .slice(0, 4);

                      return (
                        <div
                          key={ag.id}
                          className="bg-[#0B0E0D] border border-[#232B28] p-3.5 rounded flex flex-col justify-between gap-3"
                        >
                          <div className="space-y-2.5">
                            <div className="flex gap-3">
                              <div className="w-14 h-18 bg-[#121715] border border-[#232B28] rounded overflow-hidden shrink-0 flex items-center justify-center">
                                {ag.portraitUrl ? (
                                  <button
                                    type="button"
                                    onClick={() => setZoomPortraitAgent(ag)}
                                    title="Click to zoom into player portrait"
                                    className="relative w-full h-full cursor-zoom-in"
                                  >
                                    <img
                                      src={ag.portraitUrl}
                                      alt={ag.fullNameAndAlias}
                                      referrerPolicy="no-referrer"
                                      className="w-full h-full object-cover"
                                    />
                                    <span className="absolute bottom-0.5 right-0.5 p-0.5 rounded bg-black/75 text-[#4ADE80]">
                                      <ZoomIn size={10} />
                                    </span>
                                  </button>
                                ) : (
                                  <span className="font-mono-tabular text-[10px] text-[#525C58]">
                                    NO ID
                                  </span>
                                )}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="font-mono-tabular text-[10px] text-[#4ADE80] truncate">
                                  PLAYER: {ag.ownerName || 'Operative'}
                                </div>
                                <h3 className="font-display text-sm font-bold text-[#E2E6E4] truncate">
                                  {ag.fullNameAndAlias || 'UNNAMED AGENT'}
                                </h3>
                                <p className="text-xs text-[#8C9692] truncate">
                                  {ag.professionAndRank || 'Unassigned Profession'} ·{' '}
                                  {ag.employer || 'No Agency'}
                                </p>
                              </div>
                            </div>

                            {/* Live Vital Bars */}
                            <div className="grid grid-cols-4 gap-1.5 bg-[#121715] border border-[#232B28] p-2 rounded text-center font-mono-tabular text-xs">
                              <div>
                                <div className="text-[10px] text-[#8C9692]">HP</div>
                                <div
                                  className={
                                    ag.derived.hp.current <= 2
                                      ? 'text-[#F87171] font-bold'
                                      : 'text-[#E2E6E4] font-semibold'
                                  }
                                >
                                  {ag.derived.hp.current}/{ag.derived.hp.max}
                                </div>
                              </div>
                              <div>
                                <div className="text-[10px] text-[#8C9692]">WP</div>
                                <div className="text-[#E2E6E4] font-semibold">
                                  {ag.derived.wp.current}/{ag.derived.wp.max}
                                </div>
                              </div>
                              <div>
                                <div className="text-[10px] text-[#8C9692]">SAN</div>
                                <div
                                  className={
                                    isBpReached
                                      ? 'text-[#F87171] font-bold'
                                      : 'text-[#4ADE80] font-semibold'
                                  }
                                >
                                  {ag.derived.san.current}/{ag.derived.san.max}
                                </div>
                              </div>
                              <div>
                                <div className="text-[10px] text-[#8C9692]">BP</div>
                                <div
                                  className={
                                    isBpReached
                                      ? 'text-[#F87171] font-bold'
                                      : 'text-[#E2E6E4] font-semibold'
                                  }
                                >
                                  {ag.derived.bp.current}
                                </div>
                              </div>
                            </div>

                            {/* Core Stats Row */}
                            <div className="flex items-center justify-between text-[11px] font-mono-tabular text-[#A5B0AC] px-1">
                              <span>STR {ag.statistics.STR.score}</span>
                              <span>CON {ag.statistics.CON.score}</span>
                              <span>DEX {ag.statistics.DEX.score}</span>
                              <span>INT {ag.statistics.INT.score}</span>
                              <span>POW {ag.statistics.POW.score}</span>
                              <span>CHA {ag.statistics.CHA.score}</span>
                            </div>

                            {/* Top Trained Skills */}
                            {trainedSkills.length > 0 && (
                              <div className="text-[11px] text-[#8C9692] truncate">
                                <strong className="text-[#A5B0AC]">Top Skills: </strong>
                                {trainedSkills
                                  .map((s) => `${s.name} ${s.value}%`)
                                  .join(' · ')}
                              </div>
                            )}

                            {ag.woundsAndAilments && (
                              <div className="text-[11px] text-[#F87171] bg-[#DC2626]/10 border border-[#DC2626]/30 rounded px-2 py-1 truncate">
                                <strong>Wounds:</strong> {ag.woundsAndAilments}
                              </div>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setInspectedAgentId(ag.id);
                              setInspectPage('personal');
                            }}
                            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-mono-tabular font-semibold cursor-pointer"
                          >
                            <FolderOpen size={13} />
                            <span>Inspect Full 5-Page Character Sheet</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 2. Session Message Board, Chronological Timeline, Time Skips & Scribble Studio */}
              <SessionMessageBoard
                session={session}
                currentUserName={user.displayName || user.email || 'Handler'}
                isGm={true}
                isPlayerMode={false}
                onPostTimelineEntry={handlePostTimelineEntry}
                onDeleteTimelineEntry={handleDeleteTimelineEntry}
                onSetSpotlightEntry={async (entry) =>
                  onUpdateSession({ ...session, spotlightItem: entry })
                }
                onUpdateSessionDate={handleUpdateSessionDate}
                onApplyTimeSkip={handleApplyTimeSkip}
                onReturnToPresent={handleReturnToPresent}
                onSaveToGmLibrary={onCreateGmAsset}
                onOpenGmDatabaseTab={() => setActiveTab('gm-database')}
                onOpenQuickCreateTab={() => setActiveTab('quick-create')}
              />
            </div>

            {/* Right 4 Columns: GM Public & Private Dice Roller */}
            <div className="lg:col-span-4 space-y-6">
              <div className="border border-[#232B28] bg-[#121715] p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-[#232B28] pb-3">
                  <div className="flex items-center gap-2">
                    <Dices size={18} className="text-[#4ADE80]" />
                    <h2 className="font-display text-base font-bold text-[#E2E6E4]">
                      GM Dice Roller
                    </h2>
                  </div>

                  {/* Public vs Private Toggle */}
                  <button
                    type="button"
                    onClick={() => setRollIsPrivate((v) => !v)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono-tabular font-semibold border transition-colors cursor-pointer ${
                      rollIsPrivate
                        ? 'bg-[#D97706]/20 border-[#D97706] text-[#FBBF24]'
                        : 'bg-[#16A34A]/20 border-[#16A34A] text-[#4ADE80]'
                    }`}
                  >
                    {rollIsPrivate ? (
                      <>
                        <EyeOff size={13} />
                        <span>PRIVATE (GM ONLY)</span>
                      </>
                    ) : (
                      <>
                        <Eye size={13} />
                        <span>PUBLIC (ALL PLAYERS)</span>
                      </>
                    )}
                  </button>
                </div>

                <div>
                  <label className="block font-mono-tabular text-[10px] text-[#8C9692] mb-1">
                    OPTIONAL ROLL LABEL / REASON
                  </label>
                  <input
                    type="text"
                    value={rollLabel}
                    onChange={(e) => setRollLabel(e.target.value)}
                    placeholder="e.g., Cultist Alertness, SAN Loss, Shotgun..."
                    className="w-full bg-[#0B0E0D] border border-[#232B28] focus:border-[#16A34A] rounded px-3 py-1.5 text-xs text-[#E2E6E4] focus:outline-none"
                  />
                </div>

                {/* Quick Die Buttons */}
                <div className="grid grid-cols-4 gap-2">
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
                      onClick={() => handleExecuteRoll(die)}
                      className={`py-2 px-2 rounded font-mono-tabular text-xs font-semibold border transition-colors cursor-pointer ${
                        die === '1D100' || die === 'LETHALITY'
                          ? 'bg-[#16A34A] hover:bg-[#15803D] border-[#16A34A] text-white'
                          : 'bg-[#0B0E0D] hover:bg-[#19201E] border-[#232B28] text-[#E2E6E4]'
                      }`}
                    >
                      {die === 'LETHALITY' ? 'LETHAL%' : die}
                    </button>
                  ))}
                </div>

                {/* Custom Formula Input */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleExecuteRoll(customFormula);
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={customFormula}
                    onChange={(e) => setCustomFormula(e.target.value)}
                    placeholder="e.g., 2D10+4, 3D6"
                    className="flex-1 bg-[#0B0E0D] border border-[#232B28] focus:border-[#16A34A] rounded px-3 py-1.5 text-xs font-mono-tabular text-[#E2E6E4] focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 rounded bg-[#16A34A] hover:bg-[#15803D] text-xs font-mono-tabular font-semibold text-white cursor-pointer"
                  >
                    Roll
                  </button>
                </form>

                {/* Private GM Rolls Log */}
                <div className="space-y-2 pt-2 border-t border-[#232B28]">
                  <div className="flex items-center justify-between">
                    <span className="font-mono-tabular text-[11px] font-semibold text-[#FBBF24]">
                      PRIVATE GM ROLLS ({session.privateRolls.length})
                    </span>
                    {session.privateRolls.length > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateSession({ ...session, privateRolls: [] })
                        }
                        className="text-[10px] font-mono-tabular text-[#68736E] hover:text-[#F87171] cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1.5">
                    {session.privateRolls.length === 0 ? (
                      <div className="text-[11px] text-[#68736E] py-2">
                        No private GM rolls recorded yet.
                      </div>
                    ) : (
                      session.privateRolls.map((r) => (
                        <div
                          key={r.id}
                          className="bg-[#0B0E0D] border border-[#D97706]/40 rounded px-2.5 py-1.5 flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="min-w-0">
                            <div className="font-semibold text-[#FBBF24] truncate">
                              {r.label}
                            </div>
                            <div className="font-mono-tabular text-[10px] text-[#8C9692]">
                              {r.details} · {r.timestamp}
                            </div>
                          </div>
                          <span className="font-mono-tabular text-base font-bold text-[#FBBF24] shrink-0">
                            {r.result}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Public Table Rolls Log */}
                <div className="space-y-2 pt-2 border-t border-[#232B28]">
                  <div className="flex items-center justify-between">
                    <span className="font-mono-tabular text-[11px] font-semibold text-[#4ADE80]">
                      PUBLIC TABLE ROLLS ({session.publicRolls.length})
                    </span>
                    {session.publicRolls.length > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateSession({ ...session, publicRolls: [] })
                        }
                        className="text-[10px] font-mono-tabular text-[#68736E] hover:text-[#F87171] cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="max-h-56 overflow-y-auto space-y-1.5">
                    {session.publicRolls.length === 0 ? (
                      <div className="text-[11px] text-[#68736E] py-2">
                        No public rolls yet.
                      </div>
                    ) : (
                      session.publicRolls.map((r) => (
                        <div
                          key={r.id}
                          className="bg-[#0B0E0D] border border-[#232B28] rounded px-2.5 py-1.5 flex items-center justify-between gap-2 text-xs"
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
                          <span className="font-mono-tabular text-base font-bold text-[#4ADE80] shrink-0">
                            {r.result}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: QUICK CREATE & BROADCAST HANDOUT ON THE GO */}
        {activeTab === 'quick-create' && (
          <section className="border-2 border-[#16A34A] bg-[#121715] p-5 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#232B28] pb-3">
              <div>
                <span className="font-mono-tabular text-xs text-[#4ADE80] font-semibold">
                  QUICK SESSION HANDOUT CREATOR
                </span>
                <h2 className="font-display text-xl font-bold text-[#E2E6E4]">
                  Quick Create & Share on the Go
                </h2>
                <p className="text-xs text-[#8C9692]">
                  Instantly create an unplanned NPC, Location, Archive Image, or Styled Document and project it to all players in the session.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setActiveTab('overview')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#0B0E0D] hover:bg-[#19201E] border border-[#16A34A] text-xs font-mono-tabular font-semibold text-[#4ADE80] cursor-pointer"
                >
                  <ChevronLeft size={14} />
                  <span>Return to Live Session Table ({session.title})</span>
                </button>

                {(['document', 'npc', 'location', 'image'] as GmAssetCategory[]).map(
                  (cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setQcCategory(cat)}
                      className={`px-3 py-1.5 rounded text-xs font-mono-tabular uppercase cursor-pointer ${
                        qcCategory === cat
                          ? 'bg-[#16A34A] text-white font-semibold'
                          : 'bg-[#0B0E0D] text-[#A5B0AC] border border-[#232B28]'
                      }`}
                    >
                      {cat}
                    </button>
                  )
                )}
              </div>
            </div>

            <form
              onSubmit={handleQuickCreateAndBroadcast}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6"
            >
              <div className="lg:col-span-6 space-y-3.5">
                <div>
                  <label className="block font-mono-tabular text-[11px] text-[#8C9692] mb-1">
                    TITLE / NAME *
                  </label>
                  <input
                    type="text"
                    required
                    value={qcTitle}
                    onChange={(e) => setQcTitle(e.target.value)}
                    placeholder="e.g., Stained Motel Note / Deputy Sheriff Miller..."
                    className="w-full bg-[#0B0E0D] border border-[#232B28] focus:border-[#16A34A] rounded px-3 py-2 text-sm text-[#E2E6E4] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-mono-tabular text-[11px] text-[#8C9692] mb-1">
                    SUBTITLE / ROLE / CLASSIFICATION / COORDINATES
                  </label>
                  <input
                    type="text"
                    value={qcSubtitle}
                    onChange={(e) => setQcSubtitle(e.target.value)}
                    placeholder="Optional subtitle or stamp..."
                    className="w-full bg-[#0B0E0D] border border-[#232B28] focus:border-[#16A34A] rounded px-3 py-1.5 text-xs text-[#E2E6E4] focus:outline-none"
                  />
                </div>

                {qcCategory === 'document' ? (
                  <div className="bg-[#0B0E0D] border border-[#232B28] p-3.5 rounded space-y-3">
                    <div>
                      <label className="block font-mono-tabular text-[11px] font-semibold text-[#4ADE80] mb-2">
                        DOCUMENT VISUAL STYLE
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {DOCUMENT_VISUAL_STYLES.map((st) => (
                          <button
                            key={st.id}
                            type="button"
                            onClick={() => {
                              setQcDocStyle(st.id);
                              setQcDocFont(st.defaultFont);
                            }}
                            className={`p-2 rounded border text-left text-xs cursor-pointer ${
                              qcDocStyle === st.id
                                ? 'border-[#16A34A] bg-[#16A34A]/15 text-[#E2E6E4] font-semibold'
                                : 'border-[#232B28] bg-[#121715] text-[#A5B0AC]'
                            }`}
                          >
                            {st.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-mono-tabular text-[11px] text-[#8C9692] mb-1">
                          DOCUMENT FONT
                        </label>
                        <select
                          value={qcDocFont}
                          onChange={(e) =>
                            setQcDocFont(e.target.value as DocumentFontStyle)
                          }
                          className="w-full bg-[#121715] border border-[#232B28] rounded px-2.5 py-1.5 text-xs text-[#E2E6E4]"
                        >
                          {DOCUMENT_FONT_OPTIONS.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block font-mono-tabular text-[11px] text-[#8C9692] mb-1">
                          SIGNATURE / FOOTER
                        </label>
                        <input
                          type="text"
                          value={qcSignature}
                          onChange={(e) => setQcSignature(e.target.value)}
                          placeholder="Optional signature..."
                          className="w-full bg-[#121715] border border-[#232B28] rounded px-2.5 py-1.5 text-xs text-[#E2E6E4]"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block font-mono-tabular text-[11px] text-[#8C9692] mb-1">
                      IMAGE URL (OPTIONAL)
                    </label>
                    <input
                      type="text"
                      value={qcImageUrl}
                      onChange={(e) => setQcImageUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full bg-[#0B0E0D] border border-[#232B28] rounded px-3 py-1.5 text-xs text-[#E2E6E4]"
                    />
                  </div>
                )}

                <div>
                  <label className="block font-mono-tabular text-[11px] text-[#8C9692] mb-1">
                    PUBLIC CONTENT / DOCUMENT TEXT
                  </label>
                  <textarea
                    rows={5}
                    value={qcContent}
                    onChange={(e) => setQcContent(e.target.value)}
                    placeholder="Write the handout text or NPC/Location description..."
                    className="w-full bg-[#0B0E0D] border border-[#232B28] focus:border-[#16A34A] rounded px-3 py-2 text-xs sm:text-sm text-[#E2E6E4] focus:outline-none"
                  />
                </div>

                <label className="inline-flex items-center gap-2 text-xs text-[#A5B0AC] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={qcSaveToDb}
                    onChange={(e) => setQcSaveToDb(e.target.checked)}
                    className="w-4 h-4 accent-[#16A34A] rounded"
                  />
                  <span>Also save this handout to my permanent GM Database for future sessions</span>
                </label>
              </div>

              <div className="lg:col-span-6 flex flex-col justify-between bg-[#0B0E0D] border border-[#232B28] p-4 rounded">
                <div className="space-y-3">
                  <div className="font-mono-tabular text-xs text-[#8C9692] border-b border-[#232B28] pb-2">
                    LIVE HANDOUT PREVIEW
                  </div>
                  <StyledHandoutRenderer
                    category={qcCategory}
                    title={qcTitle || 'Improvised Handout'}
                    subtitle={qcSubtitle}
                    imageUrl={qcImageUrl}
                    publicContent={qcContent || 'Type content on the left to preview...'}
                    docStyle={qcDocStyle}
                    docFont={qcDocFont}
                    docSignature={qcSignature}
                    compact={true}
                  />
                </div>

                <div className="mt-6 pt-3 border-t border-[#232B28] flex flex-wrap justify-between items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('overview')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded bg-[#121715] hover:bg-[#19201E] border border-[#232B28] text-xs font-mono-tabular text-[#A5B0AC] hover:text-[#E2E6E4] cursor-pointer"
                  >
                    <ChevronLeft size={14} className="text-[#4ADE80]" />
                    <span>Return to Live Session Table</span>
                  </button>

                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-mono-tabular font-semibold cursor-pointer"
                  >
                    <Send size={14} />
                    <span>Broadcast to Players & Return to Live Session Table</span>
                  </button>
                </div>
              </div>
            </form>
          </section>
        )}

        {/* TAB 3: GM PREPARED DATABASE */}
        {activeTab === 'gm-database' && (
          <GmAssetManager
            gmAssets={gmAssets}
            onCreateAsset={onCreateGmAsset}
            onUpdateAsset={onUpdateGmAsset}
            onDeleteAsset={onDeleteGmAsset}
            onShareAssetToSession={handleShareAssetToSession}
            onReturnToSession={() => setActiveTab('overview')}
            returnToSessionLabel={`Return to Live Session Table (${session.title})`}
            onRestoreStarterAssets={onRestoreStarterAssets}
            hasActiveSession={true}
            isSyncing={isSyncing}
          />
        )}

        {/* TAB 4: COMBAT INITIATIVE TRACKER & OPERATION THREAT CLOCKS */}
        {activeTab === 'combat-clocks' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Combat & Initiative Tracker */}
            <div className="lg:col-span-7 border border-[#232B28] bg-[#121715] p-4 sm:p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#232B28] pb-3">
                <div className="flex items-center gap-2">
                  <Swords size={18} className="text-[#4ADE80]" />
                  <div>
                    <h3 className="font-display text-base font-bold text-[#E2E6E4]">
                      Initiative & Tactical Combat Tracker
                    </h3>
                    <p className="text-xs text-[#8C9692]">
                      Ordered by DEX score · Pick whether each enemy&apos;s HP is Public or Hidden from players
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleImportJoinedPlayersToCombat}
                    className="px-2.5 py-1.5 rounded bg-[#0B0E0D] hover:bg-[#19201E] border border-[#232B28] text-xs font-mono-tabular text-[#4ADE80] cursor-pointer"
                  >
                    + Import Joined PCs
                  </button>
                  <button
                    type="button"
                    onClick={handleNextCombatTurn}
                    className="px-3 py-1.5 rounded bg-[#16A34A] hover:bg-[#15803D] text-xs font-mono-tabular font-semibold text-white cursor-pointer"
                  >
                    Next Turn →
                  </button>
                </div>
              </div>

              <form onSubmit={handleAddCombatant} className="grid grid-cols-12 gap-2">
                <input
                  type="text"
                  value={newCombatantName}
                  onChange={(e) => setNewCombatantName(e.target.value)}
                  placeholder="NPC / Enemy Name..."
                  className="col-span-12 sm:col-span-4 bg-[#0B0E0D] border border-[#232B28] rounded px-3 py-1.5 text-xs text-[#E2E6E4]"
                />
                <input
                  type="number"
                  value={newCombatantDex}
                  onChange={(e) => setNewCombatantDex( parseInt(e.target.value, 10) || 0 )}
                  placeholder="DEX"
                  title="DEX Score"
                  className="col-span-3 sm:col-span-2 bg-[#0B0E0D] border border-[#232B28] rounded px-2 py-1.5 text-xs font-mono-tabular text-center text-[#E2E6E4]"
                />
                <input
                  type="number"
                  value={newCombatantHp}
                  onChange={(e) => setNewCombatantHp( parseInt(e.target.value, 10) || 0 )}
                  placeholder="HP"
                  title="Hit Points"
                  className="col-span-3 sm:col-span-2 bg-[#0B0E0D] border border-[#232B28] rounded px-2 py-1.5 text-xs font-mono-tabular text-center text-[#E2E6E4]"
                />
                <button
                  type="button"
                  onClick={() => setNewCombatantHpPublic((v) => !v)}
                  title="Choose whether players can see this enemy's HP"
                  className={`col-span-3 sm:col-span-2 inline-flex items-center justify-center gap-1 rounded px-2 py-1.5 text-[11px] font-mono-tabular font-semibold border cursor-pointer ${
                    newCombatantHpPublic
                      ? 'bg-[#16A34A]/15 border-[#16A34A] text-[#4ADE80]'
                      : 'bg-[#0B0E0D] border-[#D97706] text-[#FBBF24]'
                  }`}
                >
                  {newCombatantHpPublic ? <Eye size={12} /> : <EyeOff size={12} />}
                  <span>{newCombatantHpPublic ? 'HP Public' : 'HP Hidden'}</span>
                </button>
                <button
                  type="submit"
                  className="col-span-3 sm:col-span-2 rounded bg-[#16A34A] hover:bg-[#15803D] text-xs font-mono-tabular font-semibold text-white cursor-pointer"
                >
                  + Add
                </button>
              </form>

              <div className="space-y-2">
                {session.combatTracker.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[#68736E] bg-[#0B0E0D] border border-[#232B28] rounded">
                    No combatants in tracker. Click &quot;+ Import Joined PCs&quot; or add an NPC above.
                  </div>
                ) : (
                  session.combatTracker.map((cb) => (
                    <div
                      key={cb.id}
                      className={`p-3 rounded border flex flex-wrap items-center justify-between gap-3 ${
                        cb.isActiveTurn
                          ? 'border-[#16A34A] bg-[#16A34A]/15'
                          : 'border-[#232B28] bg-[#0B0E0D]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-mono-tabular text-xs px-2 py-1 rounded bg-[#121715] border border-[#232B28] text-[#4ADE80] font-bold">
                          DEX {cb.dexOrInit}
                        </span>
                        <div className="min-w-0">
                          <div className="text-xs sm:text-sm font-bold text-[#E2E6E4] truncate">
                            {cb.name}
                            {cb.isActiveTurn && (
                              <span className="ml-2 text-[10px] font-mono-tabular text-[#4ADE80]">
                                ● ACTIVE TURN
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateSession({
                              ...session,
                              combatTracker: session.combatTracker.map((item) =>
                                item.id === cb.id
                                  ? { ...item, isHpPublic: !item.isHpPublic }
                                  : item
                              ),
                            })
                          }
                          title="Toggle whether this combatant's HP is visible to players"
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-mono-tabular font-semibold cursor-pointer ${
                            cb.isHpPublic
                              ? 'bg-[#16A34A]/15 border-[#16A34A] text-[#4ADE80]'
                              : 'bg-[#121715] border-[#D97706] text-[#FBBF24]'
                          }`}
                        >
                          {cb.isHpPublic ? <Eye size={11} /> : <EyeOff size={11} />}
                          <span>{cb.isHpPublic ? 'HP Public' : 'HP Hidden'}</span>
                        </button>

                        <span className="font-mono-tabular text-xs text-[#E2E6E4] font-semibold">
                          HP: {cb.hpCurrent}/{cb.hpMax}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateSession({
                              ...session,
                              combatTracker: session.combatTracker.map((item) =>
                                item.id === cb.id
                                  ? { ...item, hpCurrent: Math.max(0, item.hpCurrent - 1) }
                                  : item
                              ),
                            })
                          }
                          className="px-2 py-0.5 rounded bg-[#121715] border border-[#232B28] text-xs font-mono-tabular text-[#E2E6E4] cursor-pointer"
                        >
                          −1 HP
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateSession({
                              ...session,
                              combatTracker: session.combatTracker.map((item) =>
                                item.id === cb.id
                                  ? { ...item, hpCurrent: item.hpCurrent + 1 }
                                  : item
                              ),
                            })
                          }
                          className="px-2 py-0.5 rounded bg-[#121715] border border-[#232B28] text-xs font-mono-tabular text-[#E2E6E4] cursor-pointer"
                        >
                          +1 HP
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateSession({
                              ...session,
                              combatTracker: session.combatTracker.filter(
                                (item) => item.id !== cb.id
                              ),
                            })
                          }
                          className="p-1 text-[#68736E] hover:text-[#F87171] cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Operational Threat & Doom Clocks */}
            <div className="lg:col-span-5 border border-[#232B28] bg-[#121715] p-4 sm:p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-[#232B28] pb-3">
                <Clock size={18} className="text-[#4ADE80]" />
                <div>
                  <h3 className="font-display text-base font-bold text-[#E2E6E4]">
                    Operation Countdown & Threat Clocks
                  </h3>
                  <p className="text-xs text-[#8C9692]">
                    Track investigation pressure, containment breaches, or ritual progress
                  </p>
                </div>
              </div>

              <form onSubmit={handleAddClock} className="flex gap-2">
                <input
                  type="text"
                  value={newClockName}
                  onChange={(e) => setNewClockName(e.target.value)}
                  placeholder="Clock name (e.g., Containment Breach)..."
                  className="flex-1 bg-[#0B0E0D] border border-[#232B28] rounded px-3 py-1.5 text-xs text-[#E2E6E4]"
                />
                <select
                  value={newClockSegments}
                  onChange={(e) => setNewClockSegments(parseInt(e.target.value, 10))}
                  className="bg-[#0B0E0D] border border-[#232B28] rounded px-2 py-1.5 text-xs font-mono-tabular text-[#E2E6E4]"
                >
                  <option value={4}>4 Seg</option>
                  <option value={6}>6 Seg</option>
                  <option value={8}>8 Seg</option>
                  <option value={10}>10 Seg</option>
                </select>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded bg-[#16A34A] hover:bg-[#15803D] text-xs font-mono-tabular font-semibold text-white cursor-pointer"
                >
                  + Clock
                </button>
              </form>

              <div className="space-y-3">
                {session.clocks.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[#68736E] bg-[#0B0E0D] border border-[#232B28] rounded">
                    No active countdown clocks.
                  </div>
                ) : (
                  session.clocks.map((clk) => (
                    <div
                      key={clk.id}
                      className="p-3 rounded bg-[#0B0E0D] border border-[#232B28] space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#E2E6E4]">
                          {clk.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono-tabular text-xs text-[#4ADE80]">
                            {clk.filled}/{clk.segments}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateSession({
                                ...session,
                                clocks: session.clocks.filter((c) => c.id !== clk.id),
                              })
                            }
                            className="text-[#68736E] hover:text-[#F87171] cursor-pointer"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      {/* Segmented Bar */}
                      <div className="flex gap-1 h-3">
                        {Array.from({ length: clk.segments }).map((_, idx) => (
                          <div
                            key={idx}
                            className={`flex-1 rounded-xs transition-colors ${
                              idx < clk.filled
                                ? clk.filled >= clk.segments
                                  ? 'bg-[#DC2626]'
                                  : 'bg-[#16A34A]'
                                : 'bg-[#19201E]'
                            }`}
                          />
                        ))}
                      </div>

                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateSession({
                              ...session,
                              clocks: session.clocks.map((c) =>
                                c.id === clk.id
                                  ? { ...c, filled: Math.max(0, c.filled - 1) }
                                  : c
                              ),
                            })
                          }
                          className="px-2 py-0.5 rounded bg-[#121715] border border-[#232B28] text-xs font-mono-tabular text-[#A5B0AC] cursor-pointer"
                        >
                          −1
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateSession({
                              ...session,
                              clocks: session.clocks.map((c) =>
                                c.id === clk.id
                                  ? {
                                      ...c,
                                      filled: Math.min(c.segments, c.filled + 1),
                                    }
                                  : c
                              ),
                            })
                          }
                          className="px-2 py-0.5 rounded bg-[#121715] border border-[#232B28] text-xs font-mono-tabular text-[#4ADE80] cursor-pointer"
                        >
                          +1 Advance
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
          </>
        )}
      </main>

      {/* Full 5-Page Player Character Dossier Inspector Modal */}
      {inspectedAgent && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex flex-col overflow-y-auto p-3 sm:p-6">
          <div className="max-w-[1320px] w-full mx-auto bg-[#0B0E0D] border-2 border-[#16A34A] rounded p-4 sm:p-6 space-y-4 my-auto">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#232B28] pb-3">
              <div>
                <div className="font-mono-tabular text-xs text-[#4ADE80]">
                  GM LIVE DOSSIER INSPECTION · PLAYER: {inspectedAgent.ownerName}
                </div>
                <h2 className="font-display text-xl font-bold text-[#E2E6E4]">
                  {inspectedAgent.fullNameAndAlias || 'UNNAMED AGENT'}
                </h2>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {(
                  [
                    { id: 'personal', label: '01. Personal' },
                    { id: 'stats-psych', label: '02. Stats & Psyche' },
                    { id: 'skills', label: '03. Skill Sets' },
                    { id: 'injuries-equipment', label: '04. Injuries & Gear' },
                    { id: 'remarks', label: '05. Remarks' },
                  ] as const
                ).map((pg) => (
                  <button
                    key={pg.id}
                    type="button"
                    onClick={() => setInspectPage(pg.id)}
                    className={`px-3 py-1.5 rounded text-xs font-mono-tabular cursor-pointer ${
                      inspectPage === pg.id
                        ? 'bg-[#16A34A] text-white font-semibold'
                        : 'bg-[#121715] text-[#A5B0AC] border border-[#232B28]'
                    }`}
                  >
                    {pg.label}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setInspectedAgentId(null)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-mono-tabular font-semibold cursor-pointer"
                >
                  <X size={14} />
                  <span>Return to GM Command Console ({session.title})</span>
                </button>
              </div>
            </div>

            <div className="pointer-events-none opacity-95">
              {inspectPage === 'personal' && (
                <PersonalDataSection agent={inspectedAgent} onUpdate={() => {}} />
              )}
              {inspectPage === 'stats-psych' && (
                <StatisticalAndPsychSection
                  agent={inspectedAgent}
                  onUpdate={() => {}}
                  onResetBreakingPoint={() => {}}
                />
              )}
              {inspectPage === 'skills' && (
                <ApplicableSkillSetsSection
                  agent={inspectedAgent}
                  onUpdate={() => {}}
                  onSessionAdvancePlusOne={() => {}}
                  onClearAllSkillChecks={() => {}}
                />
              )}
              {inspectPage === 'injuries-equipment' && (
                <InjuriesAndEquipmentSection
                  agent={inspectedAgent}
                  onUpdate={() => {}}
                />
              )}
              {inspectPage === 'remarks' && (
                <RemarksSection agent={inspectedAgent} onUpdate={() => {}} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
