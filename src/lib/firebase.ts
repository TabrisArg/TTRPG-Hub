import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  browserPopupRedirectResolver,
  signOut as firebaseSignOut,
  UserCredential,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  serverTimestamp,
  setDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  AgentCharacter,
  GmAsset,
  GameSession,
  SessionJoinedPlayer,
  SessionRollEntry,
  SharedSessionItem,
} from '../types/deltaGreen';
import {
  STARTER_GM_ASSETS,
  buildStarterSessionSharedItems,
} from '../data/starterGmAssets';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Validate connection to Firestore on boot per skill requirements
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: boolean | string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

let pendingSignInPromise: Promise<UserCredential> | null = null;

export function isBenignPopupAuthError(err: unknown): boolean {
  const code = (err as { code?: string })?.code || '';
  const msg = err instanceof Error ? err.message : String(err || '');
  return (
    code === 'auth/cancelled-popup-request' ||
    code === 'auth/popup-closed-by-user' ||
    code === 'auth/missing-initial-state' ||
    msg.includes('auth/cancelled-popup-request') ||
    msg.includes('auth/popup-closed-by-user') ||
    msg.includes('missing initial state')
  );
}

export async function signInWithGoogle(): Promise<UserCredential> {
  if (auth.currentUser) {
    return { user: auth.currentUser } as UserCredential;
  }
  if (pendingSignInPromise) {
    return pendingSignInPromise;
  }
  pendingSignInPromise = signInWithPopup(
    auth,
    googleProvider,
    browserPopupRedirectResolver
  ).finally(() => {
    pendingSignInPromise = null;
  });
  return pendingSignInPromise;
}

export async function signOutUser() {
  return firebaseSignOut(auth);
}

function safeStr(val: string | undefined | null, maxLen: number): string {
  if (!val) return '';
  return String(val).slice(0, maxLen);
}

export function sanitizeId(rawId: string): string {
  const cleaned = rawId.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128);
  return cleaned || `id-${Date.now()}`;
}

// ============================================================================
// 1. CHARACTER DOSSIERS (/characters/{characterId})
// ============================================================================

export function buildFirestoreDossierPayload(
  agent: AgentCharacter,
  ownerId: string,
  ownerName: string,
  isCreate: boolean
) {
  const basePayload = {
    ownerId: safeStr(ownerId, 128),
    ownerName: safeStr(ownerName || 'Operative', 120),
    gameSystem: 'delta-green',
    sessionId: safeStr(agent.sessionId || '', 128),
    sessionGmId: safeStr(agent.sessionGmId || '', 128),
    fullNameAndAlias: safeStr(agent.fullNameAndAlias, 200),
    professionAndRank: safeStr(agent.professionAndRank, 200),
    employer: safeStr(agent.employer, 200),
    nationality: safeStr(agent.nationality, 120),
    sex: safeStr(agent.sex, 20),
    sexOtherText: safeStr(agent.sexOtherText, 100),
    ageAndDob: safeStr(agent.ageAndDob, 100),
    educationAndOccupation: safeStr(agent.educationAndOccupation, 2000),
    portraitUrl: safeStr(agent.portraitUrl, 700000),
    physicalDescription: safeStr(agent.physicalDescription, 2000),
    motivationsAndDisorders: safeStr(agent.motivationsAndDisorders, 3000),
    woundsAndAilments: safeStr(agent.woundsAndAilments, 3000),
    firstAidAttempted: Boolean(agent.firstAidAttempted),
    armorAndGear: safeStr(agent.armorAndGear, 3000),
    armorRating: Math.max(0, Math.min(100, Math.round(Number(agent.armorRating) || 0))),
    personalDetailsAndNotes: safeStr(agent.personalDetailsAndNotes, 5000),
    developmentsHomeAndFamily: safeStr(agent.developmentsHomeAndFamily, 3000),
    recruitmentNote: safeStr(agent.recruitmentNote, 1000),
    authorizingOfficer: safeStr(agent.authorizingOfficer, 200),
    agentSignature: safeStr(agent.agentSignature, 200),
    sheetData: {
      statistics: agent.statistics,
      derived: agent.derived,
      adaptation: agent.adaptation,
      bonds: (agent.bonds || []).slice(0, 20),
      skills: (agent.skills || []).slice(0, 60),
      foreignLanguagesAndOther: (agent.foreignLanguagesAndOther || []).slice(0, 25),
      weapons: (agent.weapons || []).slice(0, 15),
      specialTraining: (agent.specialTraining || []).slice(0, 20),
    },
    updatedAt: serverTimestamp(),
  };

  if (isCreate) {
    return {
      ...basePayload,
      createdAt: serverTimestamp(),
    };
  }

  const { ownerId: _o, gameSystem: _g, ...mutablePayload } = basePayload;
  return mutablePayload;
}

export function mapFirestoreDocToAgent(
  docId: string,
  data: Record<string, any>
): AgentCharacter {
  const sd = data.sheetData || {};
  return {
    id: docId,
    updatedAt:
      data.updatedAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
    ownerId: data.ownerId || '',
    ownerName: data.ownerName || '',
    sessionId: data.sessionId || '',
    sessionGmId: data.sessionGmId || '',
    portraitUrl: data.portraitUrl || '',
    fullNameAndAlias: data.fullNameAndAlias || '',
    professionAndRank: data.professionAndRank || '',
    employer: data.employer || '',
    nationality: data.nationality || '',
    sex: data.sex || '',
    sexOtherText: data.sexOtherText || '',
    ageAndDob: data.ageAndDob || '',
    educationAndOccupation: data.educationAndOccupation || '',
    physicalDescription: data.physicalDescription || '',
    motivationsAndDisorders: data.motivationsAndDisorders || '',
    woundsAndAilments: data.woundsAndAilments || '',
    firstAidAttempted: Boolean(data.firstAidAttempted),
    armorAndGear: data.armorAndGear || '',
    armorRating: Number(data.armorRating) || 0,
    personalDetailsAndNotes: data.personalDetailsAndNotes || '',
    developmentsHomeAndFamily: data.developmentsHomeAndFamily || '',
    recruitmentNote: data.recruitmentNote || '',
    authorizingOfficer: data.authorizingOfficer || '',
    agentSignature: data.agentSignature || '',
    statistics: sd.statistics,
    derived: sd.derived,
    adaptation: sd.adaptation,
    bonds: sd.bonds || [],
    skills: sd.skills || [],
    foreignLanguagesAndOther: sd.foreignLanguagesAndOther || [],
    weapons: sd.weapons || [],
    specialTraining: sd.specialTraining || [],
  };
}

export async function createCloudCharacter(
  agent: AgentCharacter,
  ownerId: string,
  ownerName: string
): Promise<string> {
  const docId = sanitizeId(
    agent.id.startsWith('agent-vance') || agent.id.startsWith('agent-lin')
      ? `${agent.id}-${ownerId.slice(0, 6)}`
      : agent.id
  );
  const path = `characters/${docId}`;
  try {
    const payload = buildFirestoreDossierPayload(agent, ownerId, ownerName, true);
    await setDoc(doc(db, 'characters', docId), payload);
    return docId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateCloudCharacter(
  agent: AgentCharacter,
  ownerId: string,
  ownerName: string
): Promise<void> {
  const docId = sanitizeId(agent.id);
  const path = `characters/${docId}`;
  try {
    const mutablePayload = buildFirestoreDossierPayload(
      agent,
      ownerId,
      ownerName,
      false
    );
    await updateDoc(doc(db, 'characters', docId), mutablePayload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteCloudCharacter(docId: string): Promise<void> {
  const cleanId = sanitizeId(docId);
  const path = `characters/${cleanId}`;
  try {
    await deleteDoc(doc(db, 'characters', cleanId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ============================================================================
// 2. GAME MASTER ASSETS (/gmAssets/{assetId})
// ============================================================================

export function mapFirestoreDocToGmAsset(
  docId: string,
  data: Record<string, any>
): GmAsset {
  return {
    id: docId,
    ownerId: data.ownerId || '',
    gameSystem: 'delta-green',
    category: data.category || 'npc',
    title: data.title || 'Untitled Asset',
    subtitle: data.subtitle || '',
    imageUrl: data.imageUrl || '',
    publicContent: data.publicContent || '',
    gmSecretNotes: data.gmSecretNotes || '',
    docStyle: data.docStyle || '',
    docFont: data.docFont || '',
    docSignature: data.docSignature || '',
    updatedAt:
      data.updatedAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
  };
}

export async function createGmAsset(
  asset: Omit<GmAsset, 'id' | 'ownerId' | 'gameSystem' | 'updatedAt'>,
  ownerId: string
): Promise<string> {
  const docId = sanitizeId(`gmasset-${Date.now()}-${Math.floor(Math.random() * 1000)}`);
  const path = `gmAssets/${docId}`;
  try {
    const payload = {
      ownerId: safeStr(ownerId, 128),
      gameSystem: 'delta-green',
      category: asset.category,
      title: safeStr(asset.title.trim() || 'Untitled Asset', 200),
      subtitle: safeStr(asset.subtitle, 200),
      imageUrl: safeStr(asset.imageUrl, 700000),
      publicContent: safeStr(asset.publicContent, 10000),
      gmSecretNotes: safeStr(asset.gmSecretNotes, 5000),
      docStyle: asset.category === 'document' ? asset.docStyle || 'official-document' : '',
      docFont: asset.category === 'document' ? asset.docFont || 'typewriter' : '',
      docSignature: safeStr(asset.docSignature, 200),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(doc(db, 'gmAssets', docId), payload);
    return docId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateGmAsset(asset: GmAsset): Promise<void> {
  const docId = sanitizeId(asset.id);
  const path = `gmAssets/${docId}`;
  try {
    const mutablePayload = {
      category: asset.category,
      title: safeStr(asset.title.trim() || 'Untitled Asset', 200),
      subtitle: safeStr(asset.subtitle, 200),
      imageUrl: safeStr(asset.imageUrl, 700000),
      publicContent: safeStr(asset.publicContent, 10000),
      gmSecretNotes: safeStr(asset.gmSecretNotes, 5000),
      docStyle: asset.category === 'document' ? asset.docStyle || 'official-document' : '',
      docFont: asset.category === 'document' ? asset.docFont || 'typewriter' : '',
      docSignature: safeStr(asset.docSignature, 200),
      updatedAt: serverTimestamp(),
    };
    await updateDoc(doc(db, 'gmAssets', docId), mutablePayload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteGmAsset(assetId: string): Promise<void> {
  const docId = sanitizeId(assetId);
  const path = `gmAssets/${docId}`;
  try {
    await deleteDoc(doc(db, 'gmAssets', docId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function seedStarterGmAssetsInDatabase(
  ownerId: string,
  existingTitles: Set<string> = new Set()
): Promise<void> {
  for (let i = 0; i < STARTER_GM_ASSETS.length; i++) {
    const item = STARTER_GM_ASSETS[i];
    if (existingTitles.has(item.title)) continue;
    const docId = sanitizeId(
      `gmasset-starter-${ownerId.slice(0, 12)}-${i + 1}-${Date.now()}`
    );
    const path = `gmAssets/${docId}`;
    try {
      await setDoc(doc(db, 'gmAssets', docId), {
        ownerId: safeStr(ownerId, 128),
        gameSystem: 'delta-green',
        category: item.category,
        title: safeStr(item.title, 200),
        subtitle: safeStr(item.subtitle, 200),
        imageUrl: safeStr(item.imageUrl, 700000),
        publicContent: safeStr(item.publicContent, 10000),
        gmSecretNotes: safeStr(item.gmSecretNotes, 5000),
        docStyle:
          item.category === 'document' ? item.docStyle || 'official-document' : '',
        docFont: item.category === 'document' ? item.docFont || 'typewriter' : '',
        docSignature: safeStr(item.docSignature, 200),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }
}

// ============================================================================
// 3. GAME MASTER SESSIONS (/sessions/{sessionId})
// ============================================================================

export function mapFirestoreDocToSession(
  docId: string,
  data: Record<string, any>
): GameSession {
  return {
    id: docId,
    gmId: data.gmId || '',
    gmName: data.gmName || 'Handler',
    gmEmail: data.gmEmail || '',
    gameSystem: 'delta-green',
    title: data.title || 'Unnamed Operation',
    description: data.description || '',
    status: data.status || 'active',
    invitedEmails: Array.isArray(data.invitedEmails) ? data.invitedEmails : [],
    joinedPlayers: Array.isArray(data.joinedPlayers) ? data.joinedPlayers : [],
    sceneState: data.sceneState || {
      title: 'Briefing Room // Operational Standby',
      location: 'Classified Green Box Facility',
      dateTime: '0800 HRS',
      alertLevel: 'NORMAL',
      publicNotes: '',
    },
    spotlightItem: data.spotlightItem || {},
    sharedItems: Array.isArray(data.sharedItems) ? data.sharedItems : [],
    publicRolls: Array.isArray(data.publicRolls) ? data.publicRolls : [],
    privateRolls: Array.isArray(data.privateRolls) ? data.privateRolls : [],
    combatTracker: Array.isArray(data.combatTracker) ? data.combatTracker : [],
    clocks: Array.isArray(data.clocks) ? data.clocks : [],
    updatedAt:
      data.updatedAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
  };
}

export async function createGameSession(params: {
  gmId: string;
  gmName: string;
  gmEmail: string;
  title: string;
  description: string;
  invitedEmails: string[];
  sessionDate?: string;
}): Promise<string> {
  const docId = sanitizeId(`session-${Date.now()}-${Math.floor(Math.random() * 1000)}`);
  const path = `sessions/${docId}`;
  const cleanEmails = Array.from(
    new Set(
      params.invitedEmails
        .map((e) => e.trim().toLowerCase())
        .filter((e) => e.length > 0 && e.includes('@'))
    )
  ).slice(0, 20);

  const starterItems = buildStarterSessionSharedItems();
  const initialDate = params.sessionDate?.trim() || 'October 14, 1998 // 2200 HRS';

  // Prepend an initial date separator in the timeline if a date is specified
  const initialTimeline: SharedSessionItem[] = [
    {
      id: `timeskip-init-${Date.now()}`,
      entryType: 'timeskip',
      category: 'document',
      title: `Session Date: ${initialDate}`,
      subtitle: 'SESSION START DATE',
      imageUrl: '',
      publicContent: '',
      docStyle: '',
      docFont: '',
      docSignature: '',
      sharedAt: 'START',
      authorName: params.gmName || 'Handler',
      authorRole: 'GM',
    },
    ...starterItems,
  ];

  try {
    const payload = {
      gmId: safeStr(params.gmId, 128),
      gmName: safeStr(params.gmName || 'Handler', 120),
      gmEmail: safeStr(params.gmEmail.toLowerCase(), 200),
      gameSystem: 'delta-green',
      title: safeStr(params.title.trim() || 'Operation Nightfall', 200),
      description: safeStr(params.description, 2000),
      status: 'active',
      invitedEmails: cleanEmails,
      joinedPlayers: [],
      sceneState: {
        title: params.title.trim() || 'Operational Briefing',
        location: 'Green Box #094 — Storage Unit 14B',
        dateTime: safeStr(initialDate, 120),
        alertLevel: 'NORMAL',
        publicNotes: params.description.slice(0, 500),
      },
      spotlightItem: starterItems[3] || starterItems[0] || {},
      sharedItems: initialTimeline.slice(0, 100),
      publicRolls: [],
      privateRolls: [],
      combatTracker: [],
      clocks: [
        {
          id: `clk-starter-${Date.now()}`,
          name: 'Containment Protocol Timer (Example)',
          filled: 1,
          segments: 6,
          isPublic: true,
        },
      ],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(doc(db, 'sessions', docId), payload);
    return docId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateGameSessionByGm(
  session: GameSession
): Promise<void> {
  const docId = sanitizeId(session.id);
  const path = `sessions/${docId}`;
  const cleanEmails = Array.from(
    new Set(
      (session.invitedEmails || [])
        .map((e) => e.trim().toLowerCase())
        .filter((e) => e.length > 0 && e.includes('@'))
    )
  ).slice(0, 20);

  try {
    const mutablePayload = {
      gmName: safeStr(session.gmName || 'Handler', 120),
      gmEmail: safeStr(session.gmEmail.toLowerCase(), 200),
      title: safeStr(session.title.trim() || 'Operation', 200),
      description: safeStr(session.description, 2000),
      status: session.status || 'active',
      invitedEmails: cleanEmails,
      joinedPlayers: (session.joinedPlayers || []).slice(0, 20),
      sceneState: session.sceneState || {},
      spotlightItem: session.spotlightItem || {},
      sharedItems: (session.sharedItems || []).slice(-100),
      publicRolls: (session.publicRolls || []).slice(0, 50),
      privateRolls: (session.privateRolls || []).slice(0, 50),
      combatTracker: (session.combatTracker || []).slice(0, 30),
      clocks: (session.clocks || []).slice(0, 15),
      updatedAt: serverTimestamp(),
    };
    await updateDoc(doc(db, 'sessions', docId), mutablePayload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function postPlayerTimelineEntryToSession(
  session: GameSession,
  entry: SharedSessionItem
): Promise<void> {
  const docId = sanitizeId(session.id);
  const path = `sessions/${docId}`;
  try {
    const nextShared = [...(session.sharedItems || []), entry].slice(-100);
    await updateDoc(doc(db, 'sessions', docId), {
      sharedItems: nextShared,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function joinGameSessionAsPlayer(
  session: GameSession,
  playerEntry: SessionJoinedPlayer
): Promise<void> {
  const docId = sanitizeId(session.id);
  const path = `sessions/${docId}`;
  try {
    const existingList = Array.isArray(session.joinedPlayers)
      ? session.joinedPlayers
      : [];
    const filtered = existingList.filter((p) => p.uid !== playerEntry.uid);
    const nextJoined = [...filtered, playerEntry].slice(0, 20);

    await updateDoc(doc(db, 'sessions', docId), {
      joinedPlayers: nextJoined,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function postPlayerPublicRollToSession(
  session: GameSession,
  roll: SessionRollEntry
): Promise<void> {
  const docId = sanitizeId(session.id);
  const path = `sessions/${docId}`;
  try {
    const nextRolls = [roll, ...(session.publicRolls || [])].slice(0, 50);
    await updateDoc(doc(db, 'sessions', docId), {
      publicRolls: nextRolls,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteGameSession(sessionId: string): Promise<void> {
  const docId = sanitizeId(sessionId);
  const path = `sessions/${docId}`;
  try {
    await deleteDoc(doc(db, 'sessions', docId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
