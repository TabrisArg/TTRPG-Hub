/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Download,
  Upload,
  Users,
  Printer,
  ChevronLeft,
  ChevronRight,
  LogOut,
  CloudCheck,
  CloudUpload,
  LayoutGrid,
  Trash2,
  AlertTriangle,
  X,
} from 'lucide-react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import {
  AgentCharacter,
  DossierPage,
  EquippedCardItem,
  GameSession,
  GmAsset,
  SessionRollEntry,
  SharedSessionItem,
  VisualTheme,
} from './types/deltaGreen';
import { createBlankAgent } from './data/presets';
import { recalculateDerivedMax } from './utils/diceAndRules';
import { getThemeMeta, VISUAL_THEMES } from './utils/themes';
import {
  auth,
  db,
  signInWithGoogle,
  isBenignPopupAuthError,
  signOutUser,
  createCloudCharacter,
  updateCloudCharacter,
  deleteCloudCharacter,
  mapFirestoreDocToAgent,
  createGmAsset,
  updateGmAsset,
  deleteGmAsset,
  seedStarterGmAssetsInDatabase,
  mapFirestoreDocToGmAsset,
  createGameSession,
  updateGameSessionByGm,
  joinGameSessionAsPlayer,
  postPlayerTimelineEntryToSession,
  postPlayerPublicRollToSession,
  deleteGameSession,
  mapFirestoreDocToSession,
  handleFirestoreError,
  OperationType,
} from './lib/firebase';
import { RpgHubScreen } from './components/RpgHubScreen';
import { GmSessionScreen } from './components/GmSessionScreen';
import { PlayerSessionOverlayBar } from './components/PlayerSessionOverlayBar';
import { D20Icon } from './components/D20Icon';
import { ThemeSelectorDropdown } from './components/ThemeSelectorDropdown';
import { PersonalDataSection } from './components/PersonalDataSection';
import { StatisticalAndPsychSection } from './components/StatisticalAndPsychSection';
import { ApplicableSkillSetsSection } from './components/ApplicableSkillSetsSection';
import { InjuriesAndEquipmentSection } from './components/InjuriesAndEquipmentSection';
import { RemarksSection } from './components/RemarksSection';

const STORAGE_KEY_VISUAL_THEME = 'rpg_vault_visual_theme_v1';

const DOSSIER_PAGES: {
  id: DossierPage;
  label: string;
  shortLabel: string;
  sectionRange: string;
}[] = [
  {
    id: 'personal',
    label: 'Personal Data',
    shortLabel: '01. Personal',
    sectionRange: 'Sections 1–7',
  },
  {
    id: 'stats-psych',
    label: 'Stats & Psyche',
    shortLabel: '02. Stats & Psyche',
    sectionRange: 'Sections 8–13',
  },
  {
    id: 'skills',
    label: 'Skill Sets',
    shortLabel: '03. Skill Sets',
    sectionRange: 'Applicable Skill Sets',
  },
  {
    id: 'injuries-equipment',
    label: 'Injuries & Equipment',
    shortLabel: '04. Injuries & Gear',
    sectionRange: 'Sections 14–16',
  },
  {
    id: 'remarks',
    label: 'Remarks',
    shortLabel: '05. Remarks',
    sectionRange: 'Sections 17–21',
  },
];

export default function App() {
  const [viewMode, setViewMode] = useState<'hub' | 'delta-green' | 'gm-session'>('hub');

  // Visual Theme state
  const [visualTheme, setVisualTheme] = useState<VisualTheme>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_VISUAL_THEME) as VisualTheme | null;
      if (saved && VISUAL_THEMES.some((t) => t.id === saved)) {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'default-dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', visualTheme);
    try {
      localStorage.setItem(STORAGE_KEY_VISUAL_THEME, visualTheme);
    } catch {
      // ignore
    }
  }, [visualTheme]);

  // Firebase Auth & Firestore state
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [dbLoading, setDbLoading] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Database-backed character list
  const [agents, setAgents] = useState<AgentCharacter[]>([]);
  const [activeAgentId, setActiveAgentId] = useState<string>('');
  const [activePage, setActivePage] = useState<DossierPage>('personal');
  const [showRosterModal, setShowRosterModal] = useState<boolean>(false);

  // Game Master Assets & Sessions state
  const [gmAssets, setGmAssets] = useState<GmAsset[]>([]);
  const [hostedSessions, setHostedSessions] = useState<GameSession[]>([]);
  const [invitedSessions, setInvitedSessions] = useState<GameSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [sessionCharacters, setSessionCharacters] = useState<AgentCharacter[]>([]);
  const [pendingDeleteConfirm, setPendingDeleteConfirm] = useState<
    | { type: 'character'; id: string; title: string }
    | { type: 'session'; id: string; title: string }
    | null
  >(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const saveTimeoutRef = useRef<number | null>(null);

  // Clean up legacy localStorage keys
  useEffect(() => {
    try {
      localStorage.removeItem('dg_dd315_agents_v1');
      localStorage.removeItem('dg_dd315_active_agent_v1');
    } catch {
      // ignore
    }
  }, []);

  // Native iPadOS Finger Touch (default virtual keyboard) vs. Apple Pencil handler
  // - When using the Apple Pencil (pointerType === 'pen'): sets inputmode="none" so the virtual keyboard is NEVER shown.
  // - When using Finger Touch (pointerType === 'touch') on a text box: sets inputmode="text"/"numeric" so the virtual keyboard pops up.
  useEffect(() => {
    let lastPointerType = 'mouse';

    const isKeyboardTextInput = (
      el: Element | null
    ): el is HTMLInputElement | HTMLTextAreaElement => {
      if (!el) return false;
      if (el instanceof HTMLTextAreaElement) {
        return !el.readOnly && !el.disabled;
      }
      if (el instanceof HTMLInputElement) {
        if (el.readOnly || el.disabled) return false;
        const nonKeyboardTypes = new Set([
          'checkbox',
          'radio',
          'file',
          'button',
          'submit',
          'reset',
          'range',
          'color',
          'date',
          'time',
          'datetime-local',
          'month',
          'week',
          'hidden',
        ]);
        return !nonKeyboardTypes.has(el.type);
      }
      return false;
    };

    const getDesiredInputMode = (
      el: HTMLInputElement | HTMLTextAreaElement
    ): string => {
      if (
        el.getAttribute('data-numpad') === 'true' ||
        el.dataset.originalInputMode === 'numeric' ||
        el.inputMode === 'numeric' ||
        (el instanceof HTMLInputElement && el.type === 'number')
      ) {
        el.dataset.originalInputMode = 'numeric';
        return 'numeric';
      }
      if (el instanceof HTMLInputElement && el.type === 'email') {
        return 'email';
      }
      return 'text';
    };

    const handlePointerDown = (e: PointerEvent) => {
      lastPointerType = e.pointerType || 'mouse';
      const targetEl = e.target instanceof Element ? e.target : null;
      const editable = targetEl?.closest('input, textarea') || null;
      const activeEl = document.activeElement;

      if (e.pointerType === 'pen') {
        // Hide the virtual keyboard whenever the user uses the Apple Pencil
        if (isKeyboardTextInput(activeEl)) {
          getDesiredInputMode(activeEl); // preserve dataset.originalInputMode if numeric
          activeEl.setAttribute('inputmode', 'none');
          activeEl.inputMode = 'none';
          if (activeEl !== editable) {
            activeEl.blur();
          }
        }
        if (isKeyboardTextInput(editable)) {
          getDesiredInputMode(editable); // preserve dataset.originalInputMode if numeric
          editable.setAttribute('inputmode', 'none');
          editable.inputMode = 'none';
          if (document.activeElement === editable) {
            // Force iPadOS to dismiss any open virtual keyboard while keeping Pencil focus
            editable.blur();
            editable.focus();
          }
        } else {
          window.getSelection()?.removeAllRanges();
        }
        return;
      }

      if (e.pointerType === 'touch' && isKeyboardTextInput(editable)) {
        const desired = getDesiredInputMode(editable);
        // Prime an inputmode change so WebKit calls reloadInputViews on touchend/click
        editable.setAttribute(
          'inputmode',
          desired === 'numeric' ? 'tel' : 'search'
        );
      }
    };

    const handleFocusIn = (e: FocusEvent) => {
      const targetEl = e.target instanceof Element ? e.target : null;
      if (!isKeyboardTextInput(targetEl)) return;
      if (lastPointerType === 'pen') {
        getDesiredInputMode(targetEl);
        targetEl.setAttribute('inputmode', 'none');
        targetEl.inputMode = 'none';
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (lastPointerType !== 'touch') return;
      const targetEl = e.target instanceof Element ? e.target : null;
      const editable = targetEl?.closest('input, textarea') || null;
      if (!isKeyboardTextInput(editable)) return;

      const desired = getDesiredInputMode(editable);
      if (document.activeElement === editable) {
        editable.blur();
      }
      editable.setAttribute('inputmode', desired);
      editable.inputMode = desired;
      editable.focus();
    };

    const handleClick = (e: MouseEvent) => {
      if (lastPointerType !== 'touch') return;
      const targetEl = e.target instanceof Element ? e.target : null;
      const editable = targetEl?.closest('input, textarea') || null;
      if (!isKeyboardTextInput(editable)) return;

      const desired = getDesiredInputMode(editable);
      editable.setAttribute('inputmode', desired);
      editable.inputMode = desired;
      if (document.activeElement !== editable) {
        editable.focus();
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      const targetEl = e.target instanceof Element ? e.target : null;
      if (
        lastPointerType === 'pen' ||
        targetEl?.closest('canvas') ||
        !targetEl?.closest('input, textarea')
      ) {
        e.preventDefault();
      }
    };

    const handleSelectStart = (e: Event) => {
      const targetEl = e.target instanceof Element ? e.target : null;
      if (!targetEl?.closest('input, textarea, [contenteditable="true"]')) {
        e.preventDefault();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('focusin', handleFocusIn, true);
    document.addEventListener('touchend', handleTouchEnd, false);
    document.addEventListener('click', handleClick, false);
    document.addEventListener('contextmenu', handleContextMenu, true);
    document.addEventListener('selectstart', handleSelectStart, true);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('focusin', handleFocusIn, true);
      document.removeEventListener('touchend', handleTouchEnd, false);
      document.removeEventListener('click', handleClick, false);
      document.removeEventListener('contextmenu', handleContextMenu, true);
      document.removeEventListener('selectstart', handleSelectStart, true);
    };
  }, []);

  // Track Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      if (!currentUser) {
        setAgents([]);
        setGmAssets([]);
        setHostedSessions([]);
        setInvitedSessions([]);
        setSessionCharacters([]);
        setActiveAgentId('');
        setActiveSessionId('');
        setViewMode('hub');
      }
    });
    return () => unsubscribe();
  }, []);

  // 1. Subscribe to the user's own Firestore characters
  useEffect(() => {
    if (authLoading || !user) return;

    setDbLoading(true);
    const q = query(
      collection(db, 'characters'),
      where('ownerId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loaded: AgentCharacter[] = [];
        snapshot.docs.forEach((docSnap) => {
          loaded.push(mapFirestoreDocToAgent(docSnap.id, docSnap.data()));
        });

        setAgents(loaded);
        setActiveAgentId((prevId) => {
          if (loaded.some((a) => a.id === prevId)) return prevId;
          return loaded[0]?.id || '';
        });
        setDbLoading(false);
      },
      (error) => {
        setDbLoading(false);
        handleFirestoreError(error, OperationType.LIST, 'characters');
      }
    );

    return () => unsubscribe();
  }, [user, authLoading]);

  // 2. Subscribe to the user's Game Master Assets (/gmAssets) — empty by default
  useEffect(() => {
    if (authLoading || !user) return;

    const q = query(
      collection(db, 'gmAssets'),
      where('ownerId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loaded: GmAsset[] = [];
        snapshot.docs.forEach((docSnap) => {
          loaded.push(mapFirestoreDocToGmAsset(docSnap.id, docSnap.data()));
        });
        setGmAssets(loaded);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'gmAssets');
      }
    );

    return () => unsubscribe();
  }, [user, authLoading]);

  // 3. Subscribe to Sessions hosted by the user as Game Master
  useEffect(() => {
    if (authLoading || !user) return;

    const q = query(
      collection(db, 'sessions'),
      where('gmId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loaded: GameSession[] = [];
        snapshot.docs.forEach((docSnap) => {
          loaded.push(mapFirestoreDocToSession(docSnap.id, docSnap.data()));
        });
        setHostedSessions(loaded);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'sessions');
      }
    );

    return () => unsubscribe();
  }, [user, authLoading]);

  // 4. Subscribe to Sessions where the user's Gmail is invited
  useEffect(() => {
    if (authLoading || !user || !user.email) return;

    const q = query(
      collection(db, 'sessions'),
      where('invitedEmails', 'array-contains', user.email)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loaded: GameSession[] = [];
        snapshot.docs.forEach((docSnap) => {
          loaded.push(mapFirestoreDocToSession(docSnap.id, docSnap.data()));
        });
        setInvitedSessions(loaded);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'sessions');
      }
    );

    return () => unsubscribe();
  }, [user, authLoading]);

  const activeAgent = agents.find((a) => a.id === activeAgentId) || agents[0] || null;
  const activeGmSession =
    hostedSessions.find((s) => s.id === activeSessionId) ||
    invitedSessions.find((s) => s.id === activeSessionId) ||
    null;

  // Find if the active character is linked to any live session (invited or hosted)
  const linkedPlayerSession = activeAgent?.sessionId
    ? invitedSessions.find((s) => s.id === activeAgent.sessionId) ||
      hostedSessions.find((s) => s.id === activeAgent.sessionId) ||
      null
    : null;

  const targetSessionForCharacters =
    activeSessionId || linkedPlayerSession?.id || '';

  // 5. Subscribe to all Player Characters assigned to the active Session (for GM and players to view Character Cards & Read-Only Profiles)
  useEffect(() => {
    if (authLoading || !user || !targetSessionForCharacters) {
      setSessionCharacters([]);
      return;
    }

    const q = query(
      collection(db, 'characters'),
      where('sessionId', '==', targetSessionForCharacters)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loaded: AgentCharacter[] = [];
        snapshot.docs.forEach((docSnap) => {
          loaded.push(mapFirestoreDocToAgent(docSnap.id, docSnap.data()));
        });
        setSessionCharacters(loaded);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'characters');
      }
    );

    return () => unsubscribe();
  }, [user, authLoading, targetSessionForCharacters]);

  // Update any owned character by ID and sync directly to Firestore
  const handleUpdateOwnCharacterById = (
    characterId: string,
    updater: (prev: AgentCharacter) => AgentCharacter
  ) => {
    if (!user) return;

    setAgents((prevList) => {
      const target = prevList.find((item) => item.id === characterId);
      if (!target || (target.ownerId && target.ownerId !== user.uid)) {
        return prevList;
      }

      const nextList = prevList.map((item) =>
        item.id === characterId ? updater(item) : item
      );
      const updatedTarget = nextList.find((item) => item.id === characterId);

      if (updatedTarget) {
        if (saveTimeoutRef.current) {
          window.clearTimeout(saveTimeoutRef.current);
        }
        setIsSyncing(true);
        saveTimeoutRef.current = window.setTimeout(async () => {
          try {
            await updateCloudCharacter(
              updatedTarget,
              user.uid,
              user.displayName || user.email || 'Operative'
            );
          } finally {
            setIsSyncing(false);
          }
        }, 500);
      }

      return nextList;
    });
  };

  // Update active agent locally and sync directly to Firestore
  const updateActiveAgent = (updater: (prev: AgentCharacter) => AgentCharacter) => {
    if (!user || !activeAgent) return;
    handleUpdateOwnCharacterById(activeAgent.id, updater);
  };

  // Add an Item Card or Equipment Card to the player's active character's Gear section
  const handleAddCardToCharacterEquipment = (card: {
    category: 'item' | 'equipment';
    name: string;
    imageUrl: string;
    description: string;
    effect?: string;
  }) => {
    if (!user || !activeAgent) return;
    const newEquippedCard: EquippedCardItem = {
      id: `eq-card-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      category: card.category,
      name: card.name,
      imageUrl: card.imageUrl || '',
      description: card.description || '',
      effect: card.category === 'equipment' ? card.effect || '' : '',
      addedAt: new Date().toLocaleDateString(),
    };

    handleUpdateOwnCharacterById(activeAgent.id, (prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      equipmentCards: [...(prev.equipmentCards || []), newEquippedCard],
    }));
  };

  const handleManualCloudSave = async () => {
    if (!user || !activeAgent) return;
    setIsSyncing(true);
    try {
      await updateCloudCharacter(
        activeAgent,
        user.uid,
        user.displayName || user.email || 'Operative'
      );
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      if (isBenignPopupAuthError(err)) return;
      console.error('Google Sign-In error:', err);
      throw err;
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
      setAgents([]);
      setActiveAgentId('');
      setViewMode('hub');
    } catch (err) {
      console.error('Sign-Out error:', err);
    }
  };

  // Official Form Rule: Add +1% to all checked skills and erase all checks
  const handleSessionAdvancePlusOne = () => {
    updateActiveAgent((prev) => {
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
    updateActiveAgent((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      skills: prev.skills.map((s) => ({ ...s, checked: false })),
      foreignLanguagesAndOther: prev.foreignLanguagesAndOther.map((c) => ({
        ...c,
        checked: false,
      })),
    }));
  };

  const handleResetBreakingPoint = () => {
    if (!activeAgent) return;
    const pow = activeAgent.statistics.POW.score;
    const currentSan = activeAgent.derived.san.current;
    const newBp = Math.max(0, currentSan - pow);

    updateActiveAgent((prev) => ({
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

  const handleExportAgentJson = () => {
    if (!activeAgent) return;
    const blob = new Blob([JSON.stringify(activeAgent, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeName = activeAgent.fullNameAndAlias
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    a.href = url;
    a.download = `dd315-${safeName || 'agent'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportAgentJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const imported = JSON.parse(String(event.target?.result)) as AgentCharacter;
        if (imported && imported.statistics && imported.skills) {
          const newId = `agent-imported-${Date.now()}`;
          const prepared: AgentCharacter = { ...imported, id: newId };
          setIsSyncing(true);
          try {
            const cloudId = await createCloudCharacter(
              prepared,
              user.uid,
              user.displayName || user.email || 'Operative'
            );
            setActiveAgentId(cloudId);
          } finally {
            setIsSyncing(false);
          }
        }
      } catch {
        // invalid json
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleCreateNewBlankAgent = async () => {
    let activeUser = user;
    if (!activeUser) {
      try {
        const result = await signInWithGoogle();
        activeUser = result.user;
      } catch (err) {
        if (!isBenignPopupAuthError(err)) {
          console.error('Google Sign-In error:', err);
        }
        return;
      }
    }
    if (!activeUser) return;

    const blank = createBlankAgent();
    setIsSyncing(true);
    try {
      const cloudId = await createCloudCharacter(
        blank,
        activeUser.uid,
        activeUser.displayName || activeUser.email || 'Operative'
      );
      setActiveAgentId(cloudId);
      setActivePage('personal');
      setViewMode('delta-green');
      setShowRosterModal(false);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteAgent = async (agentId: string) => {
    if (!user) return;
    const target = agents.find((a) => a.id === agentId);
    setPendingDeleteConfirm({
      type: 'character',
      id: agentId,
      title: target?.fullNameAndAlias?.trim() || 'UNNAMED AGENT',
    });
  };

  // Game Master Session & Asset Handlers
  const handleCreateGmSession = async (params: {
    title: string;
    description: string;
    invitedEmails: string[];
    sessionDate?: string;
  }) => {
    if (!user) return;
    setIsSyncing(true);
    try {
      const sessionId = await createGameSession({
        gmId: user.uid,
        gmName: user.displayName || user.email || 'Handler',
        gmEmail: user.email || '',
        title: params.title,
        description: params.description,
        invitedEmails: params.invitedEmails,
        sessionDate: params.sessionDate,
      });
      setActiveSessionId(sessionId);
      setViewMode('gm-session');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRestoreStarterAssets = async () => {
    if (!user) return;
    setIsSyncing(true);
    try {
      const existingTitles = new Set(gmAssets.map((a) => a.title));
      await seedStarterGmAssetsInDatabase(user.uid, existingTitles);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleShareAssetToActiveSession = async (
    asset: GmAsset,
    asSpotlight = true
  ) => {
    const targetSession = activeGmSession || hostedSessions[0];
    if (!user || !targetSession) return;

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

    await handleUpdateGmSession({
      ...targetSession,
      spotlightItem: asSpotlight ? sharedItem : targetSession.spotlightItem,
      sharedItems: [...(targetSession.sharedItems || []), sharedItem].slice(-100),
    });
  };

  const handleUpdateGmSession = async (updated: GameSession) => {
    if (!user) return;
    setIsSyncing(true);
    try {
      await updateGameSessionByGm(updated);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteGmSession = async (sessionId: string) => {
    if (!user) return;
    const target = hostedSessions.find((s) => s.id === sessionId);
    setPendingDeleteConfirm({
      type: 'session',
      id: sessionId,
      title: target?.title?.trim() || 'Game Master Session',
    });
  };

  const handleConfirmPendingDelete = async () => {
    if (!user || !pendingDeleteConfirm) return;
    const item = pendingDeleteConfirm;
    setPendingDeleteConfirm(null);
    setIsSyncing(true);
    try {
      if (item.type === 'character') {
        await deleteCloudCharacter(item.id);
      } else {
        await deleteGameSession(item.id);
        if (activeSessionId === item.id) {
          setActiveSessionId('');
          setViewMode('hub');
        }
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const renderDeleteConfirmationModal = () => {
    if (!pendingDeleteConfirm) return null;
    const isChar = pendingDeleteConfirm.type === 'character';
    return (
      <div
        className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={() => setPendingDeleteConfirm(null)}
      >
        <div
          className="bg-[#121715] border-2 border-[#DC2626] rounded max-w-md w-full p-5 space-y-4 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-3 border-b border-[#232B28] pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded bg-[#DC2626]/20 border border-[#DC2626] text-[#F87171] shrink-0">
                <AlertTriangle size={18} />
              </div>
              <div>
                <div className="font-mono-tabular text-[11px] text-[#F87171] uppercase font-bold">
                  CONFIRM PERMANENT DELETION
                </div>
                <h3 className="font-display text-base font-bold text-[#E2E6E4]">
                  {isChar ? 'Delete Character Dossier?' : 'Delete Game Master Session?'}
                </h3>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPendingDeleteConfirm(null)}
              className="p-1 rounded bg-[#0B0E0D] border border-[#232B28] text-[#A5B0AC] hover:text-[#E2E6E4] cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>

          <p className="text-xs sm:text-sm text-[#A5B0AC] leading-relaxed">
            Are you sure you want to permanently delete{' '}
            <strong className="text-[#E2E6E4]">
              &ldquo;{pendingDeleteConfirm.title}&rdquo;
            </strong>
            ?{' '}
            {isChar
              ? 'This character sheet and all of its stats, skills, and notes will be removed from the database.'
              : 'This session, its timeline history, and all player invitations will be permanently removed.'}{' '}
            This action cannot be undone.
          </p>

          <div className="pt-2 border-t border-[#232B28] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setPendingDeleteConfirm(null)}
              className="px-4 py-2 rounded bg-[#0B0E0D] hover:bg-[#19201E] border border-[#232B28] text-xs font-mono-tabular font-semibold text-[#E2E6E4] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmPendingDelete}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-mono-tabular font-semibold cursor-pointer"
            >
              <Trash2 size={13} />
              <span>{isChar ? 'Yes, Delete Character' : 'Yes, Delete Session'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  const handleSelectCharacterForSession = async (
    session: GameSession,
    characterId: string
  ) => {
    if (!user) return;
    const targetChar = agents.find((a) => a.id === characterId) || agents[0];
    if (!targetChar) return;

    setIsSyncing(true);
    try {
      // Unlink any other character owned by this user that was linked to this session
      const previouslyLinked = agents.filter(
        (a) => a.id !== targetChar.id && a.sessionId === session.id
      );
      for (const prevChar of previouslyLinked) {
        await updateCloudCharacter(
          {
            ...prevChar,
            sessionId: '',
            sessionGmId: '',
          },
          user.uid,
          user.displayName || user.email || 'Operative'
        );
      }

      // 1. Update the chosen character with sessionId and sessionGmId
      const updatedChar: AgentCharacter = {
        ...targetChar,
        sessionId: session.id,
        sessionGmId: session.gmId,
      };
      await updateCloudCharacter(
        updatedChar,
        user.uid,
        user.displayName || user.email || 'Operative'
      );

      // 2. Register in session's joinedPlayers list
      await joinGameSessionAsPlayer(session, {
        uid: user.uid,
        name: user.displayName || user.email || 'Player',
        email: (user.email || '').toLowerCase(),
        characterId: targetChar.id,
        characterName: targetChar.fullNameAndAlias || 'Agent',
      });

      setActiveAgentId(targetChar.id);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleJoinInvitedSession = async (
    session: GameSession,
    characterId: string
  ) => {
    await handleSelectCharacterForSession(session, characterId);
    setViewMode('delta-green');
  };

  const handlePostPublicRollToSession = async (
    session: GameSession,
    roll: SessionRollEntry
  ) => {
    if (!user) return;
    setIsSyncing(true);
    try {
      if (session.gmId === user.uid) {
        await updateGameSessionByGm({
          ...session,
          publicRolls: [roll, ...(session.publicRolls || [])].slice(0, 50),
        });
      } else {
        await postPlayerPublicRollToSession(session, roll);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCreateGmAsset = async (
    draft: Omit<GmAsset, 'id' | 'ownerId' | 'gameSystem' | 'updatedAt'>
  ) => {
    if (!user) return;
    setIsSyncing(true);
    try {
      return await createGmAsset(draft, user.uid);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdateGmAsset = async (asset: GmAsset) => {
    if (!user) return;
    setIsSyncing(true);
    try {
      await updateGmAsset(asset);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteGmAsset = async (assetId: string) => {
    if (!user) return;
    setIsSyncing(true);
    try {
      await deleteGmAsset(assetId);
    } finally {
      setIsSyncing(false);
    }
  };

  // Render GM Session Console if in 'gm-session' viewMode
  if (viewMode === 'gm-session' && user && activeGmSession) {
    return (
      <>
        {renderDeleteConfirmationModal()}
        <GmSessionScreen
          user={user}
          visualTheme={visualTheme}
          onChangeTheme={setVisualTheme}
          session={activeGmSession}
          sessionCharacters={sessionCharacters}
          playerCharacters={agents}
          activeCharacterId={activeAgent?.id || ''}
          onSelectCharacterForSession={(charId) =>
            handleSelectCharacterForSession(activeGmSession, charId)
          }
          onUpdateOwnCharacter={handleUpdateOwnCharacterById}
          onAddToCharacterEquipment={handleAddCardToCharacterEquipment}
          gmAssets={gmAssets}
          onUpdateSession={handleUpdateGmSession}
          onCreateGmAsset={handleCreateGmAsset}
          onUpdateGmAsset={handleUpdateGmAsset}
          onDeleteGmAsset={handleDeleteGmAsset}
          onRestoreStarterAssets={handleRestoreStarterAssets}
          onBackToHub={() => setViewMode('hub')}
          isSyncing={isSyncing}
        />
      </>
    );
  }

  // Render Main RPG Hub Screen if viewMode is 'hub' or if not signed in / no active character
  if (viewMode === 'hub' || !user || !activeAgent) {
    return (
      <>
        {renderDeleteConfirmationModal()}
        <RpgHubScreen
          user={user}
          authLoading={authLoading}
          dbLoading={dbLoading}
          visualTheme={visualTheme}
          onChangeTheme={setVisualTheme}
          onSignIn={handleSignIn}
          onSignOut={handleSignOut}
          agents={agents}
          activeAgentId={activeAgent?.id || ''}
          onSelectAgentAndOpenGame={(agentId) => {
            setActiveAgentId(agentId);
            setViewMode('delta-green');
          }}
          onCreateBlankAgent={handleCreateNewBlankAgent}
          onDeleteAgent={handleDeleteAgent}
          hostedSessions={hostedSessions}
          invitedSessions={invitedSessions}
          gmAssets={gmAssets}
          onCreateGmSession={handleCreateGmSession}
          onOpenGmSession={(sessionId) => {
            setActiveSessionId(sessionId);
            setViewMode('gm-session');
          }}
          onDeleteGmSession={handleDeleteGmSession}
          onJoinInvitedSession={handleJoinInvitedSession}
          onCreateGmAsset={handleCreateGmAsset}
          onUpdateGmAsset={handleUpdateGmAsset}
          onDeleteGmAsset={handleDeleteGmAsset}
          activeGmSession={activeGmSession || hostedSessions[0] || null}
          onShareAssetToActiveSession={handleShareAssetToActiveSession}
          onRestoreStarterAssets={handleRestoreStarterAssets}
          onAddToCharacterEquipment={handleAddCardToCharacterEquipment}
          isSyncing={isSyncing}
        />
      </>
    );
  }

  const currentPageIndex = DOSSIER_PAGES.findIndex((p) => p.id === activePage);
  const currentPageMeta = DOSSIER_PAGES[currentPageIndex] || DOSSIER_PAGES[0];
  const prevPage = currentPageIndex > 0 ? DOSSIER_PAGES[currentPageIndex - 1] : null;
  const nextPage =
    currentPageIndex < DOSSIER_PAGES.length - 1
      ? DOSSIER_PAGES[currentPageIndex + 1]
      : null;

  const isBreakingPointReached =
    activeAgent.derived.san.current <= activeAgent.derived.bp.current;
  const themeMeta = getThemeMeta(visualTheme);

  return (
    <div
      data-theme={visualTheme}
      className="min-h-screen bg-[#0B0E0D] text-[#E2E6E4] flex flex-col"
    >
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 bg-[#070908]/95 backdrop-blur-md border-b border-[#232B28] px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Zone 1: Single Text Element Wordmark */}
        <a
          href="#hub"
          onClick={(e) => {
            e.preventDefault();
            setViewMode('hub');
          }}
          title="Return to TTRPG Hub"
          className="inline-flex items-center gap-2 font-display text-lg sm:text-xl font-extrabold tracking-tight text-[#E2E6E4] whitespace-nowrap shrink-0"
        >
          <D20Icon size={22} className="text-[#4ADE80] shrink-0" />
          <span>TTRPG Hub</span>
        </a>

        {/* Zone 2: 5 Clean Text Page Navigation Links */}
        <nav className="hidden xl:flex items-center gap-5 text-xs font-medium">
          {DOSSIER_PAGES.map((page) => {
            const isActive = activePage === page.id;
            return (
              <a
                key={page.id}
                href={`#${page.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  setActivePage(page.id);
                }}
                className={`py-1 transition-colors whitespace-nowrap border-b-2 ${
                  isActive
                    ? 'text-[#4ADE80] border-[#16A34A] font-semibold'
                    : 'text-[#A5B0AC] border-transparent hover:text-[#E2E6E4]'
                }`}
              >
                {page.label}
              </a>
            );
          })}
        </nav>

        {/* Zone 3: Visual Theme Dropdown (left of user name) + User Name & Primary Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          <ThemeSelectorDropdown
            theme={visualTheme}
            onChangeTheme={setVisualTheme}
          />

          <span className="hidden md:inline-block text-xs font-medium text-[#E2E6E4] truncate max-w-[140px]">
            {user.displayName || user.email}
          </span>

          <button
            type="button"
            onClick={() => setViewMode('hub')}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#A5B0AC] hover:text-[#E2E6E4] bg-[#121715] hover:bg-[#19201E] border border-[#232B28] rounded transition-colors whitespace-nowrap cursor-pointer"
          >
            <LayoutGrid size={13} className="text-[#4ADE80]" />
            <span className="hidden sm:inline">Return to RPG Hub</span>
          </button>

          <button
            type="button"
            onClick={() => setShowRosterModal((v) => !v)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#E2E6E4] bg-[#121715] hover:bg-[#19201E] border border-[#232B28] rounded transition-colors whitespace-nowrap cursor-pointer"
          >
            <Users size={14} className="text-[#4ADE80]" />
            <span>Dossiers ({agents.length})</span>
          </button>
        </div>
      </header>

      {/* Agent Roster, Cloud Sync & File Management Drawer */}
      {showRosterModal && (
        <div className="bg-[#0E1311] border-b border-[#232B28] px-4 sm:px-6 py-3">
          <div className="max-w-[1360px] mx-auto flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono-tabular text-xs text-[#8C9692]">
                  DATABASE ROSTER:
                </span>
                {agents.map((ag) => {
                  const isSelected = ag.id === activeAgent.id;
                  const shortName =
                    ag.fullNameAndAlias.split('//')[0].trim() || 'UNNAMED AGENT';
                  return (
                    <div key={ag.id} className="inline-flex items-center">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveAgentId(ag.id);
                          setShowRosterModal(false);
                        }}
                        className={`px-3 py-1.5 rounded-l text-xs font-mono-tabular transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#16A34A]/20 border border-[#16A34A] text-[#4ADE80] font-semibold'
                            : 'bg-[#121715] border border-[#232B28] text-[#A5B0AC] hover:text-[#E2E6E4]'
                        }`}
                      >
                        {shortName}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteAgent(ag.id)}
                        title="Delete this agent dossier from database"
                        className="px-2 py-1.5 rounded-r bg-[#121715] hover:bg-[#DC2626]/20 border-y border-r border-[#232B28] text-[#68736E] hover:text-[#F87171] cursor-pointer"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleManualCloudSave}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#16A34A] hover:bg-[#15803D] text-xs font-mono-tabular font-semibold text-white cursor-pointer"
                >
                  {isSyncing ? (
                    <CloudUpload size={13} />
                  ) : (
                    <CloudCheck size={13} />
                  )}
                  <span>{isSyncing ? 'Saving...' : 'Saved in Database'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportAgentJson}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-[#121715] hover:bg-[#19201E] border border-[#232B28] text-xs font-mono-tabular text-[#A5B0AC] hover:text-[#E2E6E4] cursor-pointer"
                >
                  <Download size={13} />
                  <span>Export JSON</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-[#121715] hover:bg-[#19201E] border border-[#232B28] text-xs font-mono-tabular text-[#A5B0AC] hover:text-[#E2E6E4] cursor-pointer"
                >
                  <Upload size={13} />
                  <span>Import JSON</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImportAgentJson}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-[#121715] hover:bg-[#19201E] border border-[#232B28] text-xs font-mono-tabular text-[#A5B0AC] hover:text-[#E2E6E4] cursor-pointer"
                >
                  <Printer size={13} />
                  <span>Print</span>
                </button>

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-[#121715] hover:bg-[#19201E] border border-[#232B28] text-xs font-mono-tabular text-[#A5B0AC] hover:text-[#E2E6E4] cursor-pointer"
                >
                  <LogOut size={13} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Container */}
      <main
        id="top"
        className="flex-1 w-full max-w-[1360px] mx-auto p-3 sm:p-6 flex flex-col"
      >
        {/* Live GM Session Bar if this character is joined to a session */}
        {linkedPlayerSession && (
          <PlayerSessionOverlayBar
            session={linkedPlayerSession}
            currentUserId={user.uid}
            currentUserName={
              activeAgent.fullNameAndAlias ||
              user.displayName ||
              user.email ||
              'Agent'
            }
            playerCharacters={agents}
            activeCharacterId={activeAgent.id}
            sessionCharacters={sessionCharacters}
            onSelectCharacterForSession={(charId) =>
              handleSelectCharacterForSession(linkedPlayerSession, charId)
            }
            onUpdateOwnCharacter={handleUpdateOwnCharacterById}
            onPostPublicRoll={(roll) =>
              handlePostPublicRollToSession(linkedPlayerSession, roll)
            }
            onAddToCharacterEquipment={handleAddCardToCharacterEquipment}
            returnLabel={`Return to Character Sheet (${
              activeAgent.fullNameAndAlias?.split('//')[0].trim() || 'Agent'
            })`}
            onPostTimelineEntry={async (entry) => {
              setIsSyncing(true);
              try {
                if (linkedPlayerSession.gmId === user.uid) {
                  await updateGameSessionByGm({
                    ...linkedPlayerSession,
                    sharedItems: [
                      ...(linkedPlayerSession.sharedItems || []),
                      entry,
                    ].slice(-100),
                  });
                } else {
                  await postPlayerTimelineEntryToSession(
                    linkedPlayerSession,
                    entry
                  );
                }
              } finally {
                setIsSyncing(false);
              }
            }}
            onSaveToGmLibrary={handleCreateGmAsset}
          />
        )}

        {/* Dossier Header Banner + Real-Time Vital Status Strip */}
        <div className="border border-[#232B28] bg-[#070908] px-4 py-3 mb-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-mono-tabular text-[#8C9692] flex-wrap">
              <span>{themeMeta.classificationBanner}</span>
              <span aria-hidden="true">·</span>
              <span className="text-[#4ADE80]">{currentPageMeta.sectionRange}</span>
              <span aria-hidden="true">·</span>
              <span>
                {isSyncing
                  ? 'Syncing to Database...'
                  : `Owner: ${user.displayName || user.email}`}
              </span>
            </div>
            <h1 className="font-display text-lg sm:text-2xl font-bold tracking-tight text-[#E2E6E4] mt-0.5 truncate">
              {activeAgent.fullNameAndAlias || 'AGENT DOCUMENTATION SHEET'}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Persistent Vital Reference Bar */}
            <button
              type="button"
              onClick={() => setActivePage('stats-psych')}
              title="Click to open Stats & Psyche page"
              className="flex flex-wrap items-center gap-2.5 text-xs font-mono-tabular text-[#A5B0AC] bg-[#121715] hover:bg-[#171E1B] border border-[#232B28] px-3.5 py-2 rounded transition-colors cursor-pointer"
            >
              <span>
                HP:{' '}
                <strong
                  className={
                    activeAgent.derived.hp.current <= 2
                      ? 'text-[#F87171]'
                      : 'text-[#E2E6E4]'
                  }
                >
                  {activeAgent.derived.hp.current}/{activeAgent.derived.hp.max}
                </strong>
              </span>
              <span aria-hidden="true">·</span>
              <span>
                WP:{' '}
                <strong
                  className={
                    activeAgent.derived.wp.current <= 2
                      ? 'text-[#FBBF24]'
                      : 'text-[#E2E6E4]'
                  }
                >
                  {activeAgent.derived.wp.current}/{activeAgent.derived.wp.max}
                </strong>
              </span>
              <span aria-hidden="true">·</span>
              <span>
                SAN:{' '}
                <strong
                  className={
                    isBreakingPointReached ? 'text-[#F87171]' : 'text-[#4ADE80]'
                  }
                >
                  {activeAgent.derived.san.current}/{activeAgent.derived.san.max}
                </strong>
              </span>
              <span aria-hidden="true">·</span>
              <span>
                BP:{' '}
                <strong
                  className={
                    isBreakingPointReached ? 'text-[#F87171]' : 'text-[#E2E6E4]'
                  }
                >
                  {activeAgent.derived.bp.current}
                </strong>
              </span>
            </button>
          </div>
        </div>

        {/* Mobile & Tablet Page Switcher Bar (Visible on screens < xl) */}
        <div className="xl:hidden mb-4 overflow-x-auto">
          <div className="inline-flex items-center gap-1 p-1 bg-[#121715] border border-[#232B28] rounded min-w-full">
            {DOSSIER_PAGES.map((page) => {
              const isActive = activePage === page.id;
              return (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => setActivePage(page.id)}
                  className={`flex-1 px-3 py-2 text-xs font-mono-tabular font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-[#16A34A] text-white font-semibold'
                      : 'text-[#A5B0AC] hover:text-[#E2E6E4] hover:bg-[#19201E]'
                  }`}
                >
                  {page.shortLabel}
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Page Viewport */}
        <div className="flex-1">
          {activePage === 'personal' && (
            <PersonalDataSection agent={activeAgent} onUpdate={updateActiveAgent} />
          )}

          {activePage === 'stats-psych' && (
            <StatisticalAndPsychSection
              agent={activeAgent}
              onUpdate={updateActiveAgent}
              onResetBreakingPoint={handleResetBreakingPoint}
            />
          )}

          {activePage === 'skills' && (
            <ApplicableSkillSetsSection
              agent={activeAgent}
              onUpdate={updateActiveAgent}
              onSessionAdvancePlusOne={handleSessionAdvancePlusOne}
              onClearAllSkillChecks={handleClearAllSkillChecks}
            />
          )}

          {activePage === 'injuries-equipment' && (
            <InjuriesAndEquipmentSection
              agent={activeAgent}
              onUpdate={updateActiveAgent}
            />
          )}

          {activePage === 'remarks' && (
            <RemarksSection agent={activeAgent} onUpdate={updateActiveAgent} />
          )}
        </div>

        {/* Bottom Page Navigation Bar (Previous / Page Indicator / Next) */}
        <div className="mt-6 pt-4 border-t border-[#232B28] flex items-center justify-between gap-3">
          {prevPage ? (
            <button
              type="button"
              onClick={() => {
                setActivePage(prevPage.id);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded bg-[#121715] hover:bg-[#19201E] border border-[#232B28] text-xs font-mono-tabular text-[#E2E6E4] transition-colors cursor-pointer"
            >
              <ChevronLeft size={14} className="text-[#4ADE80]" />
              <span>Prev: {prevPage.label}</span>
            </button>
          ) : (
            <div />
          )}

          <div className="hidden sm:flex items-center gap-2 font-mono-tabular text-xs text-[#68736E]">
            <span>
              PAGE {currentPageIndex + 1} OF {DOSSIER_PAGES.length}
            </span>
            <span aria-hidden="true">·</span>
            <span className="text-[#A5B0AC]">{currentPageMeta.label.toUpperCase()}</span>
          </div>

          {nextPage ? (
            <button
              type="button"
              onClick={() => {
                setActivePage(nextPage.id);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded bg-[#121715] hover:bg-[#19201E] border border-[#232B28] text-xs font-mono-tabular text-[#E2E6E4] transition-colors cursor-pointer"
            >
              <span>Next: {nextPage.label}</span>
              <ChevronRight size={14} className="text-[#4ADE80]" />
            </button>
          ) : (
            <div />
          )}
        </div>
      </main>
      {renderDeleteConfirmationModal()}
    </div>
  );
}
