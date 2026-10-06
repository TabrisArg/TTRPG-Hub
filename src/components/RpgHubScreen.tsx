import React, { useState } from 'react';
import {
  FolderOpen,
  LogIn,
  LogOut,
  Plus,
  Trash2,
  Lock,
  Database,
  UserCheck,
  Radio,
  Shield,
  Users,
  Mail,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  LayoutGrid,
  ZoomIn,
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  AgentCharacter,
  GameSession,
  GmAsset,
  VisualTheme,
} from '../types/deltaGreen';
import { ThemeSelectorDropdown } from './ThemeSelectorDropdown';
import { getThemeMeta } from '../utils/themes';
import { GmAssetManager } from './GmAssetManager';
import { ImageZoomModal } from './ImageZoomModal';
import { D20Icon } from './D20Icon';
import { CampaignDateTimePicker } from './CampaignDateTimePicker';

export type SelectedGameTab = 'characters' | 'sessions' | 'gm-section';

interface RpgHubScreenProps {
  user: User | null;
  authLoading: boolean;
  dbLoading: boolean;
  visualTheme: VisualTheme;
  onChangeTheme: (theme: VisualTheme) => void;
  onSignIn: () => void;
  onSignOut: () => void;
  agents: AgentCharacter[];
  activeAgentId: string;
  onSelectAgentAndOpenGame: (agentId: string) => void;
  onCreateBlankAgent: () => void;
  onDeleteAgent: (agentId: string) => void;
  // Game Master Sessions & Assets
  hostedSessions: GameSession[];
  invitedSessions: GameSession[];
  gmAssets: GmAsset[];
  onCreateGmSession: (params: {
    title: string;
    description: string;
    invitedEmails: string[];
    sessionDate?: string;
  }) => Promise<void>;
  onOpenGmSession: (sessionId: string) => void;
  onDeleteGmSession: (sessionId: string) => Promise<void>;
  onJoinInvitedSession: (session: GameSession, characterId: string) => Promise<void>;
  onCreateGmAsset: (
    draft: Omit<GmAsset, 'id' | 'ownerId' | 'gameSystem' | 'updatedAt'>
  ) => Promise<string | void>;
  onUpdateGmAsset: (asset: GmAsset) => Promise<void>;
  onDeleteGmAsset: (assetId: string) => Promise<void>;
  activeGmSession?: GameSession | null;
  onShareAssetToActiveSession?: (asset: GmAsset, asSpotlight: boolean) => Promise<void>;
  onRestoreStarterAssets?: () => Promise<void>;
  isSyncing: boolean;
}

const UPCOMING_SYSTEMS = [
  {
    id: 'call-of-cthulhu',
    title: 'Call of Cthulhu (7th Edition)',
    formCode: 'INVESTIGATOR DOSSIER // 1920s & MODERN',
    description:
      'Classic Lovecraftian investigative roleplaying across percentile skill matrices, sanity thresholds, and mythos tomes.',
  },
  {
    id: 'dnd-5e',
    title: 'Dungeons & Dragons (5th Edition)',
    formCode: 'ADVENTURER GRIMOIRE // HEROIC FANTASY',
    description:
      'High-fantasy character chronicle supporting ability modifiers, spell slots, class features, and equipment inventories.',
  },
  {
    id: 'mothership',
    title: 'Mothership Sci-Fi Horror RPG (1e)',
    formCode: 'CREW MANIFEST // STRESS & PANIC TRACKER',
    description:
      'Industrial deep-space survival horror character contractor profile with stress, wounds, and loadout tracking.',
  },
];

export const RpgHubScreen: React.FC<RpgHubScreenProps> = ({
  user,
  authLoading,
  dbLoading,
  visualTheme,
  onChangeTheme,
  onSignIn,
  onSignOut,
  agents,
  activeAgentId,
  onSelectAgentAndOpenGame,
  onCreateBlankAgent,
  onDeleteAgent,
  hostedSessions,
  invitedSessions,
  gmAssets,
  onCreateGmSession,
  onOpenGmSession,
  onDeleteGmSession,
  onJoinInvitedSession,
  onCreateGmAsset,
  onUpdateGmAsset,
  onDeleteGmAsset,
  activeGmSession,
  onShareAssetToActiveSession,
  onRestoreStarterAssets,
  isSyncing,
}) => {
  const themeMeta = getThemeMeta(visualTheme);

  // Whether the user is viewing the RPG Systems hub or is inside the selected game (Delta Green)
  const [selectedGame, setSelectedGame] = useState<'delta-green' | null>('delta-green');
  // Separated section tabs inside the selected game (rendered one page at a time, NOT all on the same page)
  const [activeGameTab, setActiveGameTab] = useState<SelectedGameTab>('characters');

  // Create GM Session form state
  const [showNewSessionModal, setShowNewSessionModal] = useState(false);
  const [sessionTitle, setSessionTitle] = useState('');
  const [sessionDesc, setSessionDesc] = useState('');
  const [sessionDate, setSessionDate] = useState('');
  const [sessionEmailsRaw, setSessionEmailsRaw] = useState('');

  // Selected character per invited session
  const [selectedCharForSession, setSelectedCharForSession] = useState<
    Record<string, string>
  >({});
  const [zoomPortraitAgent, setZoomPortraitAgent] =
    useState<AgentCharacter | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [signInErrorMsg, setSignInErrorMsg] = useState<string | null>(null);

  const handleSignInClick = async () => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    setSignInErrorMsg(null);
    try {
      await onSignIn();
    } catch (err) {
      const code = (err as { code?: string })?.code || '';
      const msg = err instanceof Error ? err.message : String(err || '');
      if (
        code === 'auth/unauthorized-domain' ||
        msg.includes('auth/unauthorized-domain')
      ) {
        const host =
          typeof window !== 'undefined'
            ? window.location.hostname
            : 'your-site.netlify.app';
        setSignInErrorMsg(
          `This domain (${host}) is not yet authorized in Firebase Authentication. Add "${host}" under Firebase Console → Authentication → Settings → Authorized domains.`
        );
      } else {
        setSignInErrorMsg(
          msg || 'Unable to complete Google Sign-In. Please try again.'
        );
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleOpenGameTab = (tab: SelectedGameTab) => {
    setSelectedGame('delta-green');
    setActiveGameTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCreateSessionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionTitle.trim()) return;
    const emails = sessionEmailsRaw
      .split(/[\s,;]+/)
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.includes('@'));

    await onCreateGmSession({
      title: sessionTitle.trim(),
      description: sessionDesc.trim(),
      invitedEmails: emails,
      sessionDate: sessionDate.trim(),
    });
    setSessionTitle('');
    setSessionDesc('');
    setSessionDate('');
    setSessionEmailsRaw('');
    setShowNewSessionModal(false);
  };

  const GAME_SECTION_TABS: {
    id: SelectedGameTab;
    label: string;
    shortLabel: string;
    badge?: string;
  }[] = [
    {
      id: 'characters',
      label: '01. Character Roster',
      shortLabel: '01. Characters',
      badge: user ? `${agents.length}` : undefined,
    },
    {
      id: 'sessions',
      label: '02. Sessions & Invites',
      shortLabel: '02. Sessions',
      badge: user ? `${hostedSessions.length + invitedSessions.length}` : undefined,
    },
    {
      id: 'gm-section',
      label: '03. Game Master Section',
      shortLabel: '03. GM Section',
      badge: user ? `${gmAssets.length}` : undefined,
    },
  ];

  const currentTabIndex = GAME_SECTION_TABS.findIndex(
    (t) => t.id === activeGameTab
  );
  const prevTab =
    currentTabIndex > 0 ? GAME_SECTION_TABS[currentTabIndex - 1] : null;
  const nextTab =
    currentTabIndex < GAME_SECTION_TABS.length - 1
      ? GAME_SECTION_TABS[currentTabIndex + 1]
      : null;

  if (!user) {
    return (
      <div
        data-theme={visualTheme}
        className="min-h-screen bg-[#0B0E0D] text-[#E2E6E4] flex flex-col justify-between"
      >
        <header className="bg-[#070908]/95 border-b border-[#232B28] px-4 sm:px-8 h-16 flex items-center justify-between gap-4">
          <div className="inline-flex items-center gap-2.5">
            <D20Icon size={24} className="text-[#4ADE80] shrink-0" />
            <span className="font-display text-lg sm:text-xl font-extrabold tracking-tight text-[#E2E6E4]">
              TTRPG Hub
            </span>
          </div>
          <ThemeSelectorDropdown
            theme={visualTheme}
            onChangeTheme={onChangeTheme}
          />
        </header>

        <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
          <div className="max-w-md w-full border-2 border-[#16A34A] bg-[#121715] p-6 sm:p-8 space-y-6 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded bg-[#0B0E0D] border border-[#232B28] text-[#4ADE80] mx-auto">
              <D20Icon size={32} />
            </div>

            <div className="space-y-2">
              <div className="font-mono-tabular text-xs text-[#4ADE80] font-semibold uppercase tracking-wider">
                AUTHENTICATION REQUIRED
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-[#E2E6E4]">
                TTRPG Hub
              </h1>
              <p className="text-xs sm:text-sm text-[#A5B0AC] leading-relaxed">
                Sign in with your Google account to access your tabletop RPG systems, character sheets, and Game Master sessions.
              </p>
            </div>

            {authLoading ? (
              <div className="py-3 px-4 rounded bg-[#0B0E0D] border border-[#232B28] font-mono-tabular text-xs text-[#8C9692]">
                Verifying Google session...
              </div>
            ) : (
              <button
                type="button"
                disabled={isSigningIn}
                onClick={handleSignInClick}
                className="w-full inline-flex items-center justify-center gap-2.5 px-5 py-3 text-sm font-mono-tabular font-semibold text-white bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-60 rounded transition-colors cursor-pointer"
              >
                <LogIn size={16} />
                <span>
                  {isSigningIn
                    ? 'Completing Google Sign-In...'
                    : 'Sign in with Google'}
                </span>
              </button>
            )}

            {signInErrorMsg && (
              <div className="p-3 rounded bg-[#0B0E0D] border border-[#DC2626] text-left text-xs font-mono-tabular text-[#FCA5A5] leading-relaxed">
                {signInErrorMsg}
              </div>
            )}
          </div>
        </main>

        <div className="h-8" />
      </div>
    );
  }

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
          returnLabel="Return to Character Roster"
          onClose={() => setZoomPortraitAgent(null)}
        />
      )}

      {/* Top Bar Contract: 3 Zones */}
      <header className="sticky top-0 z-30 bg-[#070908]/95 backdrop-blur-md border-b border-[#232B28] px-4 sm:px-8 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Brand Title + RPG Systems Switcher */}
        <div className="flex items-center gap-3 shrink-0">
          <a
            href="#hub"
            onClick={(e) => {
              e.preventDefault();
              setSelectedGame(null);
            }}
            className="inline-flex items-center gap-2 font-display text-lg sm:text-xl font-extrabold tracking-tight text-[#E2E6E4] whitespace-nowrap"
          >
            <D20Icon size={24} className="text-[#4ADE80] shrink-0" />
            <span>TTRPG Hub</span>
          </a>

          {selectedGame === 'delta-green' && (
            <button
              type="button"
              onClick={() => setSelectedGame(null)}
              title="Switch RPG System"
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#121715] hover:bg-[#19201E] border border-[#232B28] text-xs font-mono-tabular text-[#A5B0AC] hover:text-[#E2E6E4] transition-colors cursor-pointer"
            >
              <LayoutGrid size={12} className="text-[#4ADE80]" />
              <span>RPG Systems</span>
            </button>
          )}
        </div>

        {/* Zone 2: True Page-Switching Section Tabs (NOT anchor jump-to links) */}
        <nav className="hidden lg:flex items-center gap-2 text-xs font-medium">
          {GAME_SECTION_TABS.map((tab) => {
            const isActive =
              selectedGame === 'delta-green' && activeGameTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleOpenGameTab(tab.id)}
                className={`px-3.5 py-2 rounded font-mono-tabular transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                  isActive
                    ? 'bg-[#16A34A] text-white font-semibold'
                    : 'text-[#A5B0AC] hover:text-[#E2E6E4] hover:bg-[#121715] border border-transparent'
                }`}
              >
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] ${
                      isActive
                        ? 'bg-black/25 text-white'
                        : 'bg-[#121715] border border-[#232B28] text-[#4ADE80]'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Visual Theme Dropdown (left of user name) + User Name & Account Action */}
        <div className="flex items-center gap-3 shrink-0">
          <ThemeSelectorDropdown
            theme={visualTheme}
            onChangeTheme={onChangeTheme}
          />

          {authLoading ? (
            <span className="font-mono-tabular text-xs text-[#68736E]">
              Verifying...
            </span>
          ) : user ? (
            <div className="flex items-center gap-2.5">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-xs font-semibold text-[#E2E6E4] truncate max-w-[160px]">
                  {user.displayName || user.email}
                </span>
                <span className="font-mono-tabular text-[10px] text-[#4ADE80]">
                  {isSyncing ? 'Syncing Database...' : 'Database Connected'}
                </span>
              </div>
              <button
                type="button"
                onClick={onSignOut}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#A5B0AC] hover:text-[#E2E6E4] bg-[#121715] hover:bg-[#19201E] border border-[#232B28] rounded transition-colors cursor-pointer whitespace-nowrap"
              >
                <LogOut size={13} />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onSignIn}
              className="inline-flex items-center gap-2 px-4 py-1.5 text-xs font-semibold text-white bg-[#16A34A] hover:bg-[#15803D] rounded transition-colors cursor-pointer whitespace-nowrap"
            >
              <LogIn size={14} />
              <span>Sign in with Google</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Viewport */}
      <main className="flex-1 max-w-[1280px] w-full mx-auto px-4 sm:px-8 py-6 sm:py-10 flex flex-col justify-between gap-8">
        {selectedGame === null ? (
          /* ==================================================================
             VIEW A: RPG SYSTEMS SELECTOR HUB
             ================================================================== */
          <div className="space-y-10">
            {/* Hero / Account Status Banner */}
            <section className="border border-[#232B28] bg-[#121715] p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="max-w-2xl space-y-2">
                <div className="flex items-center gap-2 font-mono-tabular text-xs text-[#8C9692]">
                  <span>{themeMeta.classificationBanner}</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-[#4ADE80]">{themeMeta.shortName}</span>
                </div>
                <h1 className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-[#E2E6E4] text-balance">
                  Store, track, and manage your tabletop RPG character sheets and Game Master sessions.
                </h1>
                <p className="text-sm sm:text-base text-[#A5B0AC] leading-relaxed">
                  Select a tabletop RPG system below to open its Character Roster, Live Game Master Sessions, and Game Master Handout Studio.
                </p>
              </div>

              <div className="bg-[#0B0E0D] border border-[#232B28] p-5 rounded flex flex-col gap-2 min-w-[260px] shrink-0">
                {user ? (
                  <>
                    <div className="flex items-center gap-2 text-xs font-mono-tabular text-[#4ADE80]">
                      <UserCheck size={15} />
                      <span>AUTHENTICATED PLAYER / GM</span>
                    </div>
                    <div className="text-xs text-[#A5B0AC]">
                      Signed in as <strong className="text-[#E2E6E4]">{user.email}</strong>
                    </div>
                    <div className="text-xs font-mono-tabular text-[#8C9692]">
                      Characters: <strong className="text-[#E2E6E4]">{agents.length}</strong> · GM Assets:{' '}
                      <strong className="text-[#E2E6E4]">{gmAssets.length}</strong>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-xs font-mono-tabular text-[#FBBF24]">
                      <Database size={15} />
                      <span>CLOUD DATABASE VAULT</span>
                    </div>
                    <p className="text-xs text-[#8C9692] leading-relaxed">
                      Characters and Game Master sessions are stored in the Firestore database under your Google account.
                    </p>
                  </>
                )}
              </div>
            </section>

            {/* RPG System Cards */}
            <section className="space-y-4">
              <div className="flex items-baseline justify-between border-b border-[#232B28] pb-3">
                <div>
                  <h2 className="font-display text-lg sm:text-xl font-bold text-[#E2E6E4]">
                    Select Tabletop RPG System
                  </h2>
                  <p className="text-xs text-[#8C9692] mt-0.5">
                    Choose a game system to enter its dedicated workspace
                  </p>
                </div>
                <span className="font-mono-tabular text-xs text-[#4ADE80]">
                  1 Active System · 3 Planned
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Active Game Card: DELTA GREEN */}
                <div className="lg:col-span-6 border-2 border-[#16A34A] bg-[#121715] p-6 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-mono-tabular">
                      <span className="text-[#4ADE80] font-semibold">
                        ACTIVE SYSTEM · AVAILABLE NOW
                      </span>
                      <span className="text-[#8C9692]">DD FORM 315 // 112382</span>
                    </div>

                    <h3 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-[#E2E6E4]">
                      DELTA GREEN
                    </h3>

                    <p className="text-xs sm:text-sm text-[#A5B0AC] leading-relaxed">
                      Official DD Form 315 Agent Documentation Sheet, Live Game Master Sessions with Gmail invitations, and Game Master Handout Studio for NPCs, Locations, Archive Images, and Styled Documents.
                    </p>

                    <div className="pt-2 flex items-center gap-3 text-xs font-mono-tabular text-[#8C9692] flex-wrap">
                      <span>01. Character Roster ({agents.length})</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        02. Sessions & Invites ({hostedSessions.length + invitedSessions.length})
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>03. GM Section ({gmAssets.length})</span>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-[#232B28] flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleOpenGameTab('characters')}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-mono-tabular font-semibold rounded transition-colors cursor-pointer"
                    >
                      <span>Open Delta Green</span>
                      <ArrowRight size={14} />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenGameTab('sessions')}
                      className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-[#0B0E0D] hover:bg-[#19201E] border border-[#232B28] text-[#E2E6E4] text-xs font-mono-tabular rounded transition-colors cursor-pointer"
                    >
                      <Radio size={13} className="text-[#4ADE80]" />
                      <span>GM Sessions</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenGameTab('gm-section')}
                      className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-[#0B0E0D] hover:bg-[#19201E] border border-[#232B28] text-[#E2E6E4] text-xs font-mono-tabular rounded transition-colors cursor-pointer"
                    >
                      <Shield size={13} className="text-[#4ADE80]" />
                      <span>GM Section</span>
                    </button>
                  </div>
                </div>

                {/* Upcoming RPG Systems */}
                <div className="lg:col-span-6 grid grid-cols-1 gap-3">
                  {UPCOMING_SYSTEMS.map((sys) => (
                    <div
                      key={sys.id}
                      className="border border-[#232B28] bg-[#0E1210] p-4 flex flex-col justify-between opacity-65 select-none"
                    >
                      <div>
                        <div className="flex items-center justify-between text-[11px] font-mono-tabular text-[#68736E]">
                          <span>{sys.formCode}</span>
                          <span className="inline-flex items-center gap-1">
                            <Lock size={11} />
                            <span>COMING SOON</span>
                          </span>
                        </div>
                        <h4 className="font-display text-base font-bold text-[#A5B0AC] mt-1">
                          {sys.title}
                        </h4>
                        <p className="text-xs text-[#68736E] mt-1 leading-relaxed">
                          {sys.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        ) : (
          /* ==================================================================
             VIEW B: INSIDE SELECTED GAME (DELTA GREEN) — SEPARATED PAGES
             ================================================================== */
          <div className="space-y-6">
            {/* Selected Game Header Bar */}
            <div className="border border-[#232B28] bg-[#121715] px-5 py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-mono-tabular text-xs text-[#4ADE80]">
                  <span>SELECTED GAME SYSTEM // DD FORM 315</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-[#8C9692]">
                    PAGE {currentTabIndex + 1} OF {GAME_SECTION_TABS.length}
                  </span>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-[#E2E6E4]">
                    DELTA GREEN
                  </h1>
                  <span className="px-2.5 py-0.5 rounded bg-[#0B0E0D] border border-[#232B28] font-mono-tabular text-xs text-[#4ADE80]">
                    {GAME_SECTION_TABS[currentTabIndex]?.label}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedGame(null)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded bg-[#0B0E0D] hover:bg-[#19201E] border border-[#232B28] text-xs font-mono-tabular text-[#A5B0AC] hover:text-[#E2E6E4] cursor-pointer"
                >
                  <ChevronLeft size={14} className="text-[#4ADE80]" />
                  <span>Return to RPG Systems Hub</span>
                </button>
              </div>
            </div>

            {/* Mobile & Tablet Section Tab Bar (Visible on screens < lg) */}
            <div className="lg:hidden overflow-x-auto">
              <div className="inline-flex items-center gap-1 p-1 bg-[#121715] border border-[#232B28] rounded min-w-full">
                {GAME_SECTION_TABS.map((tab) => {
                  const isActive = activeGameTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => handleOpenGameTab(tab.id)}
                      className={`flex-1 px-3 py-2 text-xs font-mono-tabular font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                        isActive
                          ? 'bg-[#16A34A] text-white font-semibold'
                          : 'text-[#A5B0AC] hover:text-[#E2E6E4] hover:bg-[#19201E]'
                      }`}
                    >
                      {tab.shortLabel}
                      {tab.badge !== undefined ? ` (${tab.badge})` : ''}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ==============================================================
                TAB 1: CHARACTER ROSTER PAGE (ONLY RENDERED WHEN SELECTED)
               ============================================================== */}
            {activeGameTab === 'characters' && (
              <section className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#232B28] pb-3">
                  <div>
                    <h2 className="font-display text-lg sm:text-xl font-bold text-[#E2E6E4]">
                      01. Delta Green Character Roster
                    </h2>
                    <p className="text-xs text-[#8C9692] mt-0.5">
                      {user
                        ? `Characters stored in Firestore for ${user.displayName || user.email}`
                        : 'Sign in with your Google account to view and manage your saved characters'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={onCreateBlankAgent}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-mono-tabular font-semibold rounded transition-colors cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Create New Blank Agent</span>
                  </button>
                </div>

                {!user ? (
                  <div className="border border-[#232B28] bg-[#121715] p-8 text-center space-y-2">
                    <Database size={28} className="mx-auto text-[#4ADE80] opacity-80" />
                    <h3 className="font-display text-base font-bold text-[#E2E6E4]">
                      Sign in to View Your Saved Characters
                    </h3>
                    <p className="text-xs text-[#8C9692] max-w-md mx-auto leading-relaxed">
                      All character sheets are stored in the Firestore database linked to your Google account so each player has their own private roster.
                    </p>
                  </div>
                ) : dbLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map((n) => (
                      <div
                        key={n}
                        className="border border-[#232B28] bg-[#121715] p-4 h-44 animate-pulse flex flex-col justify-between"
                      >
                        <div className="flex gap-3.5">
                          <div className="w-16 h-20 bg-[#19201E] rounded" />
                          <div className="flex-1 space-y-2 py-1">
                            <div className="h-3 bg-[#19201E] rounded w-1/3" />
                            <div className="h-4 bg-[#19201E] rounded w-3/4" />
                            <div className="h-3 bg-[#19201E] rounded w-1/2" />
                          </div>
                        </div>
                        <div className="h-8 bg-[#19201E] rounded w-full" />
                      </div>
                    ))}
                  </div>
                ) : agents.length === 0 ? (
                  <div className="border border-[#232B28] bg-[#121715] p-8 text-center space-y-3">
                    <p className="text-sm text-[#A5B0AC]">
                      Your cloud character roster is currently empty. Click &ldquo;Create New Blank Agent&rdquo; above to create your first Delta Green agent.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {agents.map((ag) => {
                      const isSelected = ag.id === activeAgentId;
                      const isBpBreached =
                        ag.derived.san.max > 0 &&
                        ag.derived.san.current <= ag.derived.bp.current;

                      return (
                        <div
                          key={ag.id}
                          className={`border bg-[#121715] p-4 flex flex-col justify-between transition-colors ${
                            isSelected
                              ? 'border-[#16A34A]'
                              : 'border-[#232B28] hover:border-[#36423D]'
                          }`}
                        >
                          <div className="flex gap-3.5">
                            <div className="w-16 h-20 bg-[#0B0E0D] border border-[#232B28] rounded overflow-hidden shrink-0 flex items-center justify-center">
                              {ag.portraitUrl ? (
                                <button
                                  type="button"
                                  onClick={() => setZoomPortraitAgent(ag)}
                                  title="Click to zoom into portrait"
                                  className="relative w-full h-full cursor-zoom-in group"
                                >
                                  <img
                                    src={ag.portraitUrl}
                                    alt={ag.fullNameAndAlias || 'Agent Portrait'}
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
                              <div className="font-mono-tabular text-[10px] text-[#4ADE80]">
                                DELTA GREEN · DD-315
                              </div>
                              <h3 className="font-display text-sm font-bold text-[#E2E6E4] truncate mt-0.5">
                                {ag.fullNameAndAlias || 'BLANK AGENT DOSSIER'}
                              </h3>
                              <p className="text-xs text-[#8C9692] truncate mt-0.5">
                                {ag.professionAndRank || 'Unassigned Profession'}
                              </p>
                              <p className="text-[11px] text-[#68736E] truncate">
                                {ag.employer || 'No Employer Listed'}
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 pt-3 border-t border-[#232B28] flex items-center justify-between text-xs font-mono-tabular text-[#A5B0AC]">
                            <span>
                              HP:{' '}
                              <strong className="text-[#E2E6E4]">
                                {ag.derived.hp.current}/{ag.derived.hp.max}
                              </strong>
                            </span>
                            <span>·</span>
                            <span>
                              WP:{' '}
                              <strong className="text-[#E2E6E4]">
                                {ag.derived.wp.current}/{ag.derived.wp.max}
                              </strong>
                            </span>
                            <span>·</span>
                            <span>
                              SAN:{' '}
                              <strong
                                className={
                                  isBpBreached ? 'text-[#F87171]' : 'text-[#4ADE80]'
                                }
                              >
                                {ag.derived.san.current}/{ag.derived.san.max}
                              </strong>
                            </span>
                            <span>·</span>
                            <span>
                              BP:{' '}
                              <strong className="text-[#E2E6E4]">
                                {ag.derived.bp.current}
                              </strong>
                            </span>
                          </div>

                          <div className="mt-3 pt-3 border-t border-[#232B28] flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => onSelectAgentAndOpenGame(ag.id)}
                              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-mono-tabular font-semibold transition-colors cursor-pointer"
                            >
                              <FolderOpen size={13} />
                              <span>Open Character Sheet</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => onDeleteAgent(ag.id)}
                              title="Delete character from database"
                              className="p-1.5 rounded bg-[#0B0E0D] hover:bg-[#DC2626]/20 border border-[#232B28] hover:border-[#DC2626]/60 text-[#68736E] hover:text-[#F87171] transition-colors cursor-pointer"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            )}

            {/* ==============================================================
                TAB 2: SESSIONS & INVITES PAGE (ONLY RENDERED WHEN SELECTED)
               ============================================================== */}
            {activeGameTab === 'sessions' && (
              <section className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#232B28] pb-3">
                  <div>
                    <h2 className="font-display text-lg sm:text-xl font-bold text-[#E2E6E4] flex items-center gap-2">
                      <Radio size={18} className="text-[#4ADE80]" />
                      <span>02. Game Master Sessions & Player Invitations</span>
                    </h2>
                    <p className="text-xs text-[#8C9692] mt-0.5">
                      Host a live Delta Green session as Game Master by inviting players via Gmail, or join a session you have been invited to
                    </p>
                  </div>

                  {user && (
                    <button
                      type="button"
                      onClick={() => setShowNewSessionModal((v) => !v)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-mono-tabular font-semibold cursor-pointer"
                    >
                      <Plus size={14} />
                      <span>Create Session as Game Master</span>
                    </button>
                  )}
                </div>

                {showNewSessionModal && user && (
                  <form
                    onSubmit={handleCreateSessionSubmit}
                    className="border-2 border-[#16A34A] bg-[#121715] p-5 space-y-4"
                  >
                    <div className="flex items-center justify-between border-b border-[#232B28] pb-2">
                      <h3 className="font-display text-base font-bold text-[#E2E6E4]">
                        Launch New Delta Green Game Master Session
                      </h3>
                      <button
                        type="button"
                        onClick={() => setShowNewSessionModal(false)}
                        className="text-xs font-mono-tabular text-[#8C9692] hover:text-[#E2E6E4] cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div>
                          <label className="block font-mono-tabular text-[11px] text-[#8C9692] mb-1">
                            OPERATION / SESSION NAME *
                          </label>
                          <input
                            type="text"
                            required
                            value={sessionTitle}
                            onChange={(e) => setSessionTitle(e.target.value)}
                            placeholder="e.g., OPERATION NIGHT FLOORS // R-CELL"
                            className="w-full bg-[#0B0E0D] border border-[#232B28] focus:border-[#16A34A] rounded px-3 py-2 text-sm text-[#E2E6E4] focus:outline-none"
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <label className="block font-mono-tabular text-[11px] text-[#FBBF24]">
                              SESSION DATE / STARTING TIMELINE DATE & TIME
                            </label>
                            <span className="font-mono-tabular text-[10px] text-[#4ADE80]">
                              {sessionDate}
                            </span>
                          </div>
                          <CampaignDateTimePicker
                            value={sessionDate}
                            onChange={(formatted) => setSessionDate(formatted)}
                          />
                        </div>

                        <div>
                          <label className="block font-mono-tabular text-[11px] text-[#8C9692] mb-1">
                            BRIEFING SUMMARY / CASE NOTES
                          </label>
                          <textarea
                            rows={3}
                            value={sessionDesc}
                            onChange={(e) => setSessionDesc(e.target.value)}
                            placeholder="Initial mission briefing or operational location..."
                            className="w-full bg-[#0B0E0D] border border-[#232B28] focus:border-[#16A34A] rounded px-3 py-2 text-xs text-[#E2E6E4] focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="space-y-3 flex flex-col justify-between">
                        <div>
                          <label className="block font-mono-tabular text-[11px] text-[#8C9692] mb-1">
                            INVITE PLAYERS BY GMAIL (COMMA OR LINE SEPARATED)
                          </label>
                          <textarea
                            rows={4}
                            value={sessionEmailsRaw}
                            onChange={(e) => setSessionEmailsRaw(e.target.value)}
                            placeholder="player1@gmail.com, player2@gmail.com..."
                            className="w-full bg-[#0B0E0D] border border-[#232B28] focus:border-[#16A34A] rounded px-3 py-2 text-xs font-mono-tabular text-[#E2E6E4] focus:outline-none"
                          />
                          <p className="text-[11px] text-[#68736E] mt-1">
                            Invited players will automatically see this session under Sessions & Invites and can join with their character sheet.
                          </p>
                        </div>

                        <div className="flex justify-end">
                          <button
                            type="submit"
                            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-mono-tabular font-semibold cursor-pointer"
                          >
                            <Radio size={14} />
                            <span>Create & Open GM Session Console</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </form>
                )}

                {!user ? (
                  <div className="border border-[#232B28] bg-[#121715] p-6 text-center text-xs text-[#8C9692]">
                    Sign in with Google to create a Game Master session or view sessions you have been invited to join.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left 6 Cols: Sessions You Host as Game Master */}
                    <div className="lg:col-span-6 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-mono-tabular text-xs font-semibold text-[#4ADE80] flex items-center gap-1.5">
                          <Shield size={14} />
                          <span>SESSIONS YOU HOST AS GAME MASTER ({hostedSessions.length})</span>
                        </span>
                      </div>

                      {hostedSessions.length === 0 ? (
                        <div className="border border-[#232B28] bg-[#121715] p-6 text-center text-xs text-[#8C9692]">
                          You haven&apos;t created any Game Master sessions yet. Click &quot;Create Session as Game Master&quot; above to start an operation.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {hostedSessions.map((sess) => (
                            <div
                              key={sess.id}
                              className="border border-[#232B28] bg-[#121715] p-4 flex flex-col justify-between gap-3"
                            >
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-[10px] font-mono-tabular text-[#4ADE80]">
                                  <span>GAME MASTER SESSION · DELTA GREEN</span>
                                  <span>
                                    {sess.joinedPlayers.length} Joined / {sess.invitedEmails.length} Invited
                                  </span>
                                </div>
                                <h3 className="font-display text-base font-bold text-[#E2E6E4]">
                                  {sess.title}
                                </h3>
                                {sess.description && (
                                  <p className="text-xs text-[#8C9692] line-clamp-2">
                                    {sess.description}
                                  </p>
                                )}
                              </div>

                              <div className="pt-3 border-t border-[#232B28] flex items-center justify-between gap-2">
                                <button
                                  type="button"
                                  onClick={() => onOpenGmSession(sess.id)}
                                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-mono-tabular font-semibold cursor-pointer"
                                >
                                  <Radio size={13} />
                                  <span>Open GM Command Console</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onDeleteGmSession(sess.id)}
                                  title="Delete GM Session"
                                  className="p-2 rounded bg-[#0B0E0D] hover:bg-[#DC2626]/20 border border-[#232B28] text-[#68736E] hover:text-[#F87171] cursor-pointer"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Right 6 Cols: Sessions You Were Invited To Join */}
                    <div className="lg:col-span-6 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-mono-tabular text-xs font-semibold text-[#E2E6E4] flex items-center gap-1.5">
                          <Mail size={14} className="text-[#4ADE80]" />
                          <span>
                            SESSIONS INVITING YOUR GMAIL ({invitedSessions.length})
                          </span>
                        </span>
                      </div>

                      {invitedSessions.length === 0 ? (
                        <div className="border border-[#232B28] bg-[#121715] p-6 text-center text-xs text-[#8C9692]">
                          No Game Master invitations found for <strong>{user.email}</strong> yet. When a GM invites your Gmail address, the session will appear here to join.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {invitedSessions.map((sess) => {
                            const chosenCharId =
                              selectedCharForSession[sess.id] || agents[0]?.id || '';
                            const alreadyLinkedChar = agents.find(
                              (a) => a.sessionId === sess.id
                            );

                            return (
                              <div
                                key={sess.id}
                                className="border border-[#16A34A]/60 bg-[#121715] p-4 space-y-3"
                              >
                                <div>
                                  <div className="flex items-center justify-between text-[10px] font-mono-tabular text-[#4ADE80]">
                                    <span>INVITED BY GM: {sess.gmName}</span>
                                    <span>ALERT: {sess.sceneState.alertLevel}</span>
                                  </div>
                                  <h3 className="font-display text-base font-bold text-[#E2E6E4] mt-0.5">
                                    {sess.title}
                                  </h3>
                                  {sess.description && (
                                    <p className="text-xs text-[#A5B0AC] mt-1">
                                      {sess.description}
                                    </p>
                                  )}
                                </div>

                                {agents.length === 0 ? (
                                  <div className="text-xs text-[#FBBF24] bg-[#0B0E0D] border border-[#232B28] p-2.5 rounded flex items-center justify-between gap-2">
                                    <span>
                                      Create an agent in the Character Roster first to join this session.
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenGameTab('characters')}
                                      className="px-2.5 py-1 rounded bg-[#16A34A] text-white font-mono-tabular font-semibold cursor-pointer shrink-0"
                                    >
                                      Go to Character Roster
                                    </button>
                                  </div>
                                ) : (
                                  <div className="pt-2 border-t border-[#232B28] flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                    <select
                                      value={alreadyLinkedChar?.id || chosenCharId}
                                      onChange={(e) =>
                                        setSelectedCharForSession((prev) => ({
                                          ...prev,
                                          [sess.id]: e.target.value,
                                        }))
                                      }
                                      className="flex-1 bg-[#0B0E0D] border border-[#232B28] rounded px-2.5 py-2 text-xs text-[#E2E6E4]"
                                    >
                                      {agents.map((ag) => (
                                        <option key={ag.id} value={ag.id}>
                                          Agent: {ag.fullNameAndAlias || 'Unnamed Agent'}
                                        </option>
                                      ))}
                                    </select>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        onJoinInvitedSession(
                                          sess,
                                          alreadyLinkedChar?.id || chosenCharId
                                        )
                                      }
                                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-mono-tabular font-semibold cursor-pointer shrink-0"
                                    >
                                      <Users size={13} />
                                      <span>
                                        {alreadyLinkedChar
                                          ? 'Re-Enter Session'
                                          : 'Join Session with Agent'}
                                      </span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* ==============================================================
                TAB 3: GAME MASTER SECTION PAGE (ONLY RENDERED WHEN SELECTED)
               ============================================================== */}
            {activeGameTab === 'gm-section' && (
              <section className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#232B28] pb-3">
                  <div>
                    <h2 className="font-display text-lg sm:text-xl font-bold text-[#E2E6E4] flex items-center gap-2">
                      <Shield size={18} className="text-[#4ADE80]" />
                      <span>03. Game Master Section — NPCs, Locations, Images & Styled Documents</span>
                    </h2>
                    <p className="text-xs text-[#8C9692] mt-0.5">
                      Prepare NPC character cards, locations, archive images, and custom-styled documents (Official Document, Bloody Letter, Note in a Napkin, Old School Computer Text, Small Sign, Large Sign) stored in your database to share during sessions
                    </p>
                  </div>
                </div>

                {!user ? (
                  <div className="border border-[#232B28] bg-[#121715] p-6 text-center text-xs text-[#8C9692]">
                    Sign in with Google to create and store Game Master NPC cards, locations, archive images, and styled documents in the database.
                  </div>
                ) : (
                  <GmAssetManager
                    gmAssets={gmAssets}
                    onCreateAsset={onCreateGmAsset}
                    onUpdateAsset={onUpdateGmAsset}
                    onDeleteAsset={onDeleteGmAsset}
                    hasActiveSession={false}
                    onRestoreStarterAssets={onRestoreStarterAssets}
                    isSyncing={isSyncing}
                  />
                )}
              </section>
            )}

            {/* Bottom Page Switcher Bar inside the Selected Game */}
            <div className="pt-4 border-t border-[#232B28] flex items-center justify-between gap-3">
              {prevTab ? (
                <button
                  type="button"
                  onClick={() => handleOpenGameTab(prevTab.id)}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded bg-[#121715] hover:bg-[#19201E] border border-[#232B28] text-xs font-mono-tabular text-[#E2E6E4] transition-colors cursor-pointer"
                >
                  <ChevronLeft size={14} className="text-[#4ADE80]" />
                  <span>Return to {prevTab.label}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setSelectedGame(null)}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded bg-[#121715] hover:bg-[#19201E] border border-[#232B28] text-xs font-mono-tabular text-[#A5B0AC] hover:text-[#E2E6E4] transition-colors cursor-pointer"
                >
                  <ChevronLeft size={14} className="text-[#4ADE80]" />
                  <span>Return to RPG Systems Hub</span>
                </button>
              )}

              <div className="hidden sm:flex items-center gap-2 font-mono-tabular text-xs text-[#68736E]">
                <span>
                  SECTION {currentTabIndex + 1} OF {GAME_SECTION_TABS.length}
                </span>
                <span aria-hidden="true">·</span>
                <span className="text-[#A5B0AC]">
                  {GAME_SECTION_TABS[currentTabIndex]?.label.toUpperCase()}
                </span>
              </div>

              {nextTab ? (
                <button
                  type="button"
                  onClick={() => handleOpenGameTab(nextTab.id)}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded bg-[#121715] hover:bg-[#19201E] border border-[#232B28] text-xs font-mono-tabular text-[#E2E6E4] transition-colors cursor-pointer"
                >
                  <span>Next: {nextTab.label}</span>
                  <ChevronRight size={14} className="text-[#4ADE80]" />
                </button>
              ) : (
                <div />
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
