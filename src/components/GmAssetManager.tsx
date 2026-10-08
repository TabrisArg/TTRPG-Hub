import React, { useRef, useState } from 'react';
import {
  Trash2,
  Edit3,
  Upload,
  Send,
  UserSquare2,
  MapPin,
  Image as ImageIcon,
  FileText,
  Package,
  Shield,
  Eye,
  Check,
  ArrowLeft,
  Plus,
  RotateCcw,
  ZoomIn,
} from 'lucide-react';
import {
  DocumentFontStyle,
  DocumentVisualStyle,
  GmAsset,
  GmAssetCategory,
} from '../types/deltaGreen';
import {
  DOCUMENT_FONT_OPTIONS,
  DOCUMENT_VISUAL_STYLES,
  StyledHandoutRenderer,
} from './StyledHandoutRenderer';
import { ImageZoomModal } from './ImageZoomModal';
import { WebImageSearchPicker } from './WebImageSearchPicker';

interface GmAssetManagerProps {
  gmAssets: GmAsset[];
  onCreateAsset: (
    draft: Omit<GmAsset, 'id' | 'ownerId' | 'gameSystem' | 'updatedAt'>
  ) => Promise<string | void>;
  onUpdateAsset: (asset: GmAsset) => Promise<void>;
  onDeleteAsset: (assetId: string) => Promise<void>;
  onShareAssetToSession?: (asset: GmAsset, asSpotlight: boolean) => Promise<void>;
  onReturnToSession?: () => void;
  returnToSessionLabel?: string;
  onRestoreStarterAssets?: () => Promise<void>;
  onAddToCharacterEquipment?: (card: {
    category: 'item' | 'equipment';
    name: string;
    imageUrl: string;
    description: string;
    effect?: string;
  }) => Promise<void> | void;
  equipTargetLabel?: string;
  hasActiveSession?: boolean;
  isSyncing?: boolean;
}

const CATEGORY_SECTIONS: {
  id: GmAssetCategory;
  title: string;
  subtitle: string;
  addButtonLabel: string;
  emptyMessage: string;
}[] = [
  {
    id: 'npc',
    title: 'NPC Character Cards',
    subtitle: 'Non-player characters, contacts, witnesses, and adversaries',
    addButtonLabel: '+ NPC Card',
    emptyMessage: 'No NPC character cards in your database yet.',
  },
  {
    id: 'location',
    title: 'Locations & Tactical Maps',
    subtitle: 'Green Boxes, crime scenes, safe houses, and regional sites',
    addButtonLabel: '+ Location',
    emptyMessage: 'No location cards in your database yet.',
  },
  {
    id: 'item',
    title: 'Item Cards',
    subtitle: 'Items, clues, keys, and artifacts (Name, Image & Description) that players can add to their gear',
    addButtonLabel: '+ Item Card',
    emptyMessage: 'No item cards in your database yet.',
  },
  {
    id: 'equipment',
    title: 'Equipment Cards',
    subtitle: 'Tactical gear, armor, and special devices (Name, Image, Description & Effect) that players can equip',
    addButtonLabel: '+ Equipment Card',
    emptyMessage: 'No equipment cards in your database yet.',
  },
  {
    id: 'image',
    title: 'Archive Images & Evidence Photos',
    subtitle: 'Forensic photographs, diagrams, oscillographs, and visual exhibits',
    addButtonLabel: '+ Archive Image',
    emptyMessage: 'No archive images in your database yet.',
  },
  {
    id: 'document',
    title: 'Styled Documents & Handouts',
    subtitle:
      'Official Documents, Bloody Letters, Napkin Notes, Computer Text, Small Signs, and Large Signs',
    addButtonLabel: '+ Styled Document',
    emptyMessage: 'No styled documents in your database yet.',
  },
];

export const GmAssetManager: React.FC<GmAssetManagerProps> = ({
  gmAssets,
  onCreateAsset,
  onUpdateAsset,
  onDeleteAsset,
  onShareAssetToSession,
  onReturnToSession,
  returnToSessionLabel = 'Return to GM Session Console',
  onRestoreStarterAssets,
  onAddToCharacterEquipment,
  equipTargetLabel,
  hasActiveSession = false,
  isSyncing = false,
}) => {
  const [filterCategory, setFilterCategory] = useState<'all' | GmAssetCategory>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false);
  const [previewAssetId, setPreviewAssetId] = useState<string | null>(null);
  const [zoomAsset, setZoomAsset] = useState<GmAsset | null>(null);
  const [justSharedAsset, setJustSharedAsset] = useState<GmAsset | null>(null);
  const [justEquippedId, setJustEquippedId] = useState<string | null>(null);
  const [isSavingAsset, setIsSavingAsset] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Draft form state
  const [category, setCategory] = useState<GmAssetCategory>('document');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [publicContent, setPublicContent] = useState('');
  const [gmSecretNotes, setGmSecretNotes] = useState('');
  const [docStyle, setDocStyle] = useState<DocumentVisualStyle>('official-document');
  const [docFont, setDocFont] = useState<DocumentFontStyle>('typewriter');
  const [docSignature, setDocSignature] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const resetForm = (defaultCat: GmAssetCategory = 'document') => {
    setEditingId(null);
    setCategory(defaultCat);
    setTitle('');
    setSubtitle('');
    setImageUrl('');
    setPublicContent('');
    setGmSecretNotes('');
    setDocStyle('official-document');
    setDocFont('typewriter');
    setDocSignature('');
  };

  const handleStartCreate = (cat: GmAssetCategory) => {
    resetForm(cat);
    setShowCreateForm(true);
  };

  const handleStartEdit = (asset: GmAsset) => {
    setEditingId(asset.id);
    setCategory(asset.category);
    setTitle(asset.title);
    setSubtitle(asset.subtitle);
    setImageUrl(asset.imageUrl);
    setPublicContent(asset.publicContent);
    setGmSecretNotes(asset.gmSecretNotes);
    setDocStyle((asset.docStyle as DocumentVisualStyle) || 'official-document');
    setDocFont((asset.docFont as DocumentFontStyle) || 'typewriter');
    setDocSignature(asset.docSignature);
    setShowCreateForm(true);
  };

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const rawDataUrl = String(ev.target?.result || '');
      if (!rawDataUrl) return;
      // Compress large uploaded photos so they stay well below Firestore's 1MB document limit
      const img = new Image();
      img.onload = () => {
        const maxDim = 960;
        let w = img.naturalWidth || 800;
        let h = img.naturalHeight || 600;
        if (w > maxDim || h > maxDim) {
          const scale = Math.min(maxDim / w, maxDim / h);
          w = Math.max(1, Math.round(w * scale));
          h = Math.max(1, Math.round(h * scale));
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const compressed = canvas.toDataURL('image/jpeg', 0.82);
          setImageUrl(compressed);
        } else {
          setImageUrl(rawDataUrl);
        }
      };
      img.onerror = () => {
        setImageUrl(rawDataUrl);
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const deriveFallbackTitle = (): string => {
    const trimmedTitle = title.trim();
    if (trimmedTitle) return trimmedTitle;

    const firstContentLine = publicContent
      .trim()
      .split('\n')
      .map((l) => l.trim())
      .find((l) => l.length > 0);
    if (firstContentLine) {
      return firstContentLine.slice(0, 70);
    }

    if (category === 'document') {
      const styleObj = DOCUMENT_VISUAL_STYLES.find((s) => s.id === docStyle);
      return styleObj ? styleObj.label : 'Styled Document';
    }
    if (category === 'npc') return 'Unnamed NPC';
    if (category === 'location') return 'Unnamed Location';
    if (category === 'item') return 'Unnamed Item';
    if (category === 'equipment') return 'Unnamed Equipment';
    return 'Archive Image';
  };

  const handleSaveForm = async (e: React.FormEvent, shareImmediately = false) => {
    e.preventDefault();
    if (isSavingAsset) return;
    setSaveError(null);

    const resolvedTitle = deriveFallbackTitle();

    const payload = {
      category,
      title: resolvedTitle,
      subtitle: category === 'item' ? '' : subtitle.trim(),
      imageUrl: imageUrl.trim(),
      publicContent,
      gmSecretNotes: category === 'item' || category === 'equipment' ? '' : gmSecretNotes,
      docStyle: category === 'document' ? docStyle : ('' as const),
      docFont: category === 'document' ? docFont : ('' as const),
      docSignature: category === 'document' ? docSignature.trim() : '',
    };

    setIsSavingAsset(true);
    try {
      if (editingId) {
        const updated: GmAsset = {
          ...payload,
          id: editingId,
          ownerId: '',
          gameSystem: 'delta-green',
          updatedAt: new Date().toISOString(),
        };
        await onUpdateAsset(updated);
        if (shareImmediately && onShareAssetToSession) {
          await onShareAssetToSession(updated, true);
          setJustSharedAsset(updated);
        }
      } else {
        const createdId = await onCreateAsset(payload);
        const createdObj: GmAsset = {
          ...payload,
          id: typeof createdId === 'string' ? createdId : `temp-${Date.now()}`,
          ownerId: '',
          gameSystem: 'delta-green',
          updatedAt: new Date().toISOString(),
        };
        if (shareImmediately && onShareAssetToSession) {
          await onShareAssetToSession(createdObj, true);
          setJustSharedAsset(createdObj);
        }
      }

      setShowCreateForm(false);
      resetForm();
    } catch (err) {
      console.error('Error saving GM asset:', err);
      setSaveError(
        err instanceof Error
          ? err.message
          : 'Failed to save asset to GM Database. Please check your connection or image size.'
      );
    } finally {
      setIsSavingAsset(false);
    }
  };

  const renderCategoryIcon = (cat: GmAssetCategory) => {
    switch (cat) {
      case 'npc':
        return <UserSquare2 size={16} className="text-[#4ADE80]" />;
      case 'location':
        return <MapPin size={16} className="text-[#4ADE80]" />;
      case 'item':
        return <Package size={16} className="text-[#4ADE80]" />;
      case 'equipment':
        return <Shield size={16} className="text-[#4ADE80]" />;
      case 'image':
        return <ImageIcon size={16} className="text-[#4ADE80]" />;
      case 'document':
        return <FileText size={16} className="text-[#4ADE80]" />;
    }
  };

  const renderAssetCard = (asset: GmAsset) => {
    const isSharedRecently = justSharedAsset?.id === asset.id;
    return (
      <div
        key={asset.id}
        className="border border-[#232B28] bg-[#121715] p-4 flex flex-col justify-between gap-3 hover:border-[#36423D] transition-colors"
      >
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[10px] font-mono-tabular">
            <span className="text-[#4ADE80] uppercase font-semibold">
              {asset.category}
              {asset.category === 'document' && asset.docStyle
                ? ` · ${asset.docStyle}`
                : ''}
            </span>
            <div className="flex items-center gap-1">
              {asset.imageUrl && (
                <button
                  type="button"
                  onClick={() => setZoomAsset(asset)}
                  title="Zoom into image"
                  className="p-1 text-[#A5B0AC] hover:text-[#4ADE80] cursor-pointer"
                >
                  <ZoomIn size={13} />
                </button>
              )}
              <button
                type="button"
                onClick={() => setPreviewAssetId(asset.id)}
                title="Preview full handout"
                className="p-1 text-[#A5B0AC] hover:text-[#E2E6E4] cursor-pointer"
              >
                <Eye size={13} />
              </button>
              <button
                type="button"
                onClick={() => handleStartEdit(asset)}
                title="Edit asset"
                className="p-1 text-[#A5B0AC] hover:text-[#4ADE80] cursor-pointer"
              >
                <Edit3 size={13} />
              </button>
              <button
                type="button"
                onClick={() => onDeleteAsset(asset.id)}
                title="Delete from GM database"
                className="p-1 text-[#68736E] hover:text-[#F87171] cursor-pointer"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>

          <div className="flex gap-3">
            {asset.imageUrl && (
              <button
                type="button"
                onClick={() => setZoomAsset(asset)}
                title="Click to zoom into image"
                className="relative w-14 h-16 rounded border border-[#232B28] hover:border-[#16A34A] overflow-hidden shrink-0 cursor-zoom-in group"
              >
                <img
                  src={asset.imageUrl}
                  alt={asset.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-0.5 right-0.5 p-0.5 rounded bg-[#0B0E0D]/85 border border-[#232B28] text-[#4ADE80]">
                  <ZoomIn size={10} />
                </span>
              </button>
            )}
            <div className="min-w-0 flex-1">
              <h4 className="font-display text-sm font-bold text-[#E2E6E4] truncate">
                {asset.title}
              </h4>
              {asset.subtitle && asset.category !== 'item' && (
                <p
                  className={`text-[11px] font-mono-tabular truncate ${
                    asset.category === 'equipment'
                      ? 'text-[#4ADE80] font-semibold'
                      : 'text-[#8C9692]'
                  }`}
                >
                  {asset.category === 'equipment'
                    ? `Effect: ${asset.subtitle}`
                    : asset.subtitle}
                </p>
              )}
              <p className="text-xs text-[#A5B0AC] line-clamp-2 mt-1">
                {asset.publicContent}
              </p>
            </div>
          </div>

          {asset.gmSecretNotes && (
            <div className="bg-[#0B0E0D] border border-[#D97706]/40 rounded px-2.5 py-1.5 text-[11px] text-[#FBBF24] line-clamp-2">
              <strong>GM Secret:</strong> {asset.gmSecretNotes}
            </div>
          )}
        </div>

        {(asset.category === 'item' || asset.category === 'equipment') &&
          onAddToCharacterEquipment && (
            <div className="pt-2 border-t border-[#232B28]">
              <button
                type="button"
                onClick={async () => {
                  await onAddToCharacterEquipment({
                    category: asset.category as 'item' | 'equipment',
                    name: asset.title,
                    imageUrl: asset.imageUrl,
                    description: asset.publicContent,
                    effect: asset.category === 'equipment' ? asset.subtitle : '',
                  });
                  setJustEquippedId(asset.id);
                  window.setTimeout(() => setJustEquippedId(null), 1800);
                }}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded bg-[#0B0E0D] hover:bg-[#19201E] border border-[#16A34A] text-[#4ADE80] text-xs font-mono-tabular font-semibold cursor-pointer"
              >
                {justEquippedId === asset.id ? (
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

        {hasActiveSession && onShareAssetToSession && (
          <div className="pt-2.5 border-t border-[#232B28] flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={async () => {
                await onShareAssetToSession(asset, true);
                setJustSharedAsset(asset);
              }}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-mono-tabular font-semibold cursor-pointer"
            >
              {isSharedRecently ? (
                <>
                  <Check size={13} />
                  <span>Shared!</span>
                </>
              ) : (
                <>
                  <Send size={13} />
                  <span>Spotlight & Share</span>
                </>
              )}
            </button>

            {onReturnToSession && (
              <button
                type="button"
                onClick={onReturnToSession}
                title={returnToSessionLabel}
                className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded bg-[#0B0E0D] hover:bg-[#19201E] border border-[#16A34A] text-[#4ADE80] text-xs font-mono-tabular font-semibold cursor-pointer shrink-0"
              >
                <ArrowLeft size={13} />
                <span>{returnToSessionLabel}</span>
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  const sectionsToRender =
    filterCategory === 'all'
      ? CATEGORY_SECTIONS
      : CATEGORY_SECTIONS.filter((sec) => sec.id === filterCategory);

  return (
    <div className="space-y-5">
      {/* Return to Active Session Banner when sharing or navigating from a session */}
      {onReturnToSession && (
        <div className="bg-[#0E1512] border-2 border-[#16A34A] px-4 py-3 rounded flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="inline-flex items-center gap-1.5 font-mono-tabular text-xs font-semibold text-[#4ADE80]">
              {justSharedAsset ? (
                <>
                  <Check size={15} />
                  <span>
                    SHARED TO SESSION: &ldquo;{justSharedAsset.title}&rdquo; IS NOW LIVE ON PLAYERS&apos; SCREENS
                  </span>
                </>
              ) : (
                <span>
                  GM ASSET DATABASE · SHARE DIRECTLY TO YOUR ACTIVE SESSION
                </span>
              )}
            </span>
          </div>

          <button
            type="button"
            onClick={onReturnToSession}
            className="inline-flex items-center gap-2 px-4 py-2 rounded bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-mono-tabular font-semibold cursor-pointer shrink-0"
          >
            <ArrowLeft size={14} />
            <span>{returnToSessionLabel}</span>
          </button>
        </div>
      )}

      {/* Top Action & Filter Bar */}
      <div className="bg-[#0B0E0D] border border-[#232B28] p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {(
            [
              { id: 'all', label: `All Assets (${gmAssets.length})` },
              {
                id: 'npc',
                label: `NPC Cards (${gmAssets.filter((a) => a.category === 'npc').length})`,
              },
              {
                id: 'location',
                label: `Locations (${gmAssets.filter((a) => a.category === 'location').length})`,
              },
              {
                id: 'item',
                label: `Item Cards (${gmAssets.filter((a) => a.category === 'item').length})`,
              },
              {
                id: 'equipment',
                label: `Equipment Cards (${
                  gmAssets.filter((a) => a.category === 'equipment').length
                })`,
              },
              {
                id: 'image',
                label: `Archive Images (${gmAssets.filter((a) => a.category === 'image').length})`,
              },
              {
                id: 'document',
                label: `Styled Documents (${
                  gmAssets.filter((a) => a.category === 'document').length
                })`,
              },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterCategory(tab.id)}
              className={`px-3 py-1.5 rounded text-xs font-mono-tabular transition-colors cursor-pointer ${
                filterCategory === tab.id
                  ? 'bg-[#16A34A] text-white font-semibold'
                  : 'bg-[#121715] text-[#A5B0AC] hover:text-[#E2E6E4] border border-[#232B28]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => handleStartCreate('npc')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#121715] hover:bg-[#19201E] border border-[#232B28] text-xs font-mono-tabular text-[#E2E6E4] cursor-pointer"
          >
            <UserSquare2 size={13} className="text-[#4ADE80]" />
            <span>+ NPC Card</span>
          </button>

          <button
            type="button"
            onClick={() => handleStartCreate('location')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#121715] hover:bg-[#19201E] border border-[#232B28] text-xs font-mono-tabular text-[#E2E6E4] cursor-pointer"
          >
            <MapPin size={13} className="text-[#4ADE80]" />
            <span>+ Location</span>
          </button>

          <button
            type="button"
            onClick={() => handleStartCreate('item')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#121715] hover:bg-[#19201E] border border-[#232B28] text-xs font-mono-tabular text-[#E2E6E4] cursor-pointer"
          >
            <Package size={13} className="text-[#4ADE80]" />
            <span>+ Item Card</span>
          </button>

          <button
            type="button"
            onClick={() => handleStartCreate('equipment')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#121715] hover:bg-[#19201E] border border-[#232B28] text-xs font-mono-tabular text-[#E2E6E4] cursor-pointer"
          >
            <Shield size={13} className="text-[#4ADE80]" />
            <span>+ Equipment Card</span>
          </button>

          <button
            type="button"
            onClick={() => handleStartCreate('image')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#121715] hover:bg-[#19201E] border border-[#232B28] text-xs font-mono-tabular text-[#E2E6E4] cursor-pointer"
          >
            <ImageIcon size={13} className="text-[#4ADE80]" />
            <span>+ Archive Image</span>
          </button>

          <button
            type="button"
            onClick={() => handleStartCreate('document')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#121715] hover:bg-[#19201E] border border-[#232B28] text-xs font-mono-tabular text-[#E2E6E4] cursor-pointer"
          >
            <FileText size={13} className="text-[#4ADE80]" />
            <span>+ Styled Document</span>
          </button>

          {onRestoreStarterAssets && (
            <button
              type="button"
              disabled={isSyncing}
              onClick={onRestoreStarterAssets}
              title="Create example Delta Green assets in your GM database"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#121715] hover:bg-[#19201E] border border-[#232B28] text-xs font-mono-tabular text-[#A5B0AC] hover:text-[#E2E6E4] cursor-pointer"
            >
              <Plus size={13} className="text-[#4ADE80]" />
              <span>Create Example Assets</span>
            </button>
          )}
        </div>
      </div>

      {/* Create / Edit Asset Studio Drawer */}
      {showCreateForm && (
        <form
          onSubmit={(e) => handleSaveForm(e, false)}
          className="border-2 border-[#16A34A] bg-[#121715] p-5 space-y-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#232B28] pb-3">
            <div>
              <span className="font-mono-tabular text-[11px] text-[#4ADE80] uppercase">
                {editingId ? 'EDIT GM DATABASE ASSET' : 'CREATE NEW GM ASSET'}
              </span>
              <h3 className="font-display text-lg font-bold text-[#E2E6E4]">
                {category === 'npc' && 'NPC Character Card Builder'}
                {category === 'location' && 'Location Reconnaissance Card Builder'}
                {category === 'item' && 'Item Card Builder (Name, Image & Description)'}
                {category === 'equipment' &&
                  'Equipment Card Builder (Name, Image, Description & Effect)'}
                {category === 'image' && 'Archive Image / Evidence Builder'}
                {category === 'document' && 'Custom Styled Document & Handout Designer'}
              </h3>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {(
                ['npc', 'location', 'item', 'equipment', 'image', 'document'] as GmAssetCategory[]
              ).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-2.5 py-1 rounded text-xs font-mono-tabular uppercase cursor-pointer ${
                    category === cat
                      ? 'bg-[#16A34A] text-white font-semibold'
                      : 'bg-[#0B0E0D] text-[#8C9692] border border-[#232B28]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Inputs */}
            <div className="lg:col-span-6 space-y-3.5">
              <div>
                <label className="block font-mono-tabular text-[11px] text-[#8C9692] mb-1">
                  {category === 'npc'
                    ? 'NPC NAME / ALIAS'
                    : category === 'location'
                    ? 'LOCATION NAME'
                    : category === 'item'
                    ? 'ITEM NAME'
                    : category === 'equipment'
                    ? 'EQUIPMENT NAME'
                    : category === 'image'
                    ? 'IMAGE / EXHIBIT TITLE'
                    : 'DOCUMENT HEADER / TITLE (OPTIONAL — AUTO-FILLED IF BLANK)'}
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={
                    category === 'npc'
                      ? 'e.g., Dr. Evelyn Cross // CDC Liaison'
                      : category === 'location'
                      ? 'e.g., Millbrook Cold Storage Warehouse'
                      : category === 'item'
                      ? 'e.g., Rusted Brass Key, Strange Amber Vial...'
                      : category === 'equipment'
                      ? 'e.g., AN/PVS-14 Night Vision Goggles, Kevlar Tactical Vest...'
                      : category === 'image'
                      ? 'e.g., Exhibit A — Crime Scene Polaroid'
                      : 'e.g., AUTOPSY REPORT #44-B / DO NOT OPEN'
                  }
                  className="w-full bg-[#0B0E0D] border border-[#232B28] focus:border-[#16A34A] rounded px-3 py-2 text-sm text-[#E2E6E4] focus:outline-none"
                />
              </div>

              {category !== 'item' && (
                <div>
                  <label
                    className={`block font-mono-tabular text-[11px] mb-1 ${
                      category === 'equipment'
                        ? 'text-[#4ADE80] font-semibold'
                        : 'text-[#8C9692]'
                    }`}
                  >
                    {category === 'npc'
                      ? 'ROLE / AFFILIATION / OCCUPATION'
                      : category === 'location'
                      ? 'COORDINATES / REGION / THREAT LEVEL'
                      : category === 'equipment'
                      ? 'EQUIPMENT EFFECT / MECHANICAL BONUS'
                      : category === 'image'
                      ? 'EXHIBIT CODE / DATE TAKEN'
                      : 'SUBTITLE / CLASSIFICATION STAMP / CONTEXT'}
                  </label>
                  <input
                    type="text"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    placeholder={
                      category === 'document'
                        ? 'e.g., TOP SECRET // RECOVERED FROM ROOM 402'
                        : category === 'equipment'
                        ? 'e.g., +20% Alertness in darkness, Armor Rating +3 vs ballistic...'
                        : 'Optional subtitle or metadata...'
                    }
                    className="w-full bg-[#0B0E0D] border border-[#232B28] focus:border-[#16A34A] rounded px-3 py-2 text-xs text-[#E2E6E4] focus:outline-none"
                  />
                </div>
              )}

              {/* Document Style & Font Pickers (Only when category === 'document') */}
              {category === 'document' && (
                <div className="space-y-3 bg-[#0B0E0D] border border-[#232B28] p-3.5 rounded">
                  <div>
                    <label className="block font-mono-tabular text-[11px] font-semibold text-[#4ADE80] mb-2">
                      1. SELECT DOCUMENT VISUAL STYLE (6 PRESETS)
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {DOCUMENT_VISUAL_STYLES.map((styleOpt) => {
                        const isSelected = docStyle === styleOpt.id;
                        return (
                          <button
                            key={styleOpt.id}
                            type="button"
                            onClick={() => {
                              setDocStyle(styleOpt.id);
                              setDocFont(styleOpt.defaultFont);
                            }}
                            className={`text-left p-2.5 rounded border transition-colors cursor-pointer ${
                              isSelected
                                ? 'border-[#16A34A] bg-[#16A34A]/15 text-[#E2E6E4]'
                                : 'border-[#232B28] bg-[#121715] text-[#A5B0AC] hover:text-[#E2E6E4]'
                            }`}
                          >
                            <div className="text-xs font-semibold">{styleOpt.label}</div>
                            <div className="text-[10px] text-[#8C9692] mt-0.5 line-clamp-1">
                              {styleOpt.description}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#232B28]">
                    <div>
                      <label className="block font-mono-tabular text-[11px] text-[#8C9692] mb-1">
                        2. DOCUMENT FONT FAMILY
                      </label>
                      <select
                        value={docFont}
                        onChange={(e) => setDocFont(e.target.value as DocumentFontStyle)}
                        className="w-full bg-[#121715] border border-[#232B28] focus:border-[#16A34A] rounded px-2.5 py-1.5 text-xs text-[#E2E6E4] focus:outline-none"
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
                        3. SIGNATURE / FOOTER STAMP
                      </label>
                      <input
                        type="text"
                        value={docSignature}
                        onChange={(e) => setDocSignature(e.target.value)}
                        placeholder="e.g., Director Coral // M.D."
                        className="w-full bg-[#121715] border border-[#232B28] focus:border-[#16A34A] rounded px-2.5 py-1.5 text-xs text-[#E2E6E4] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Image Upload / URL / Search for NPC, Location, Archive Image, or Document */}
              <div className="space-y-2">
                <label className="block font-mono-tabular text-[11px] text-[#8C9692]">
                  IMAGE URL, UPLOAD PHOTO, OR WEB IMAGE SEARCH
                </label>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="text"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="Paste image URL, upload from device, or click Image Search..."
                    className="flex-1 min-w-[180px] bg-[#0B0E0D] border border-[#232B28] focus:border-[#16A34A] rounded px-3 py-1.5 text-xs text-[#E2E6E4] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#0B0E0D] hover:bg-[#19201E] border border-[#232B28] text-xs font-mono-tabular text-[#4ADE80] cursor-pointer shrink-0"
                  >
                    <Upload size={13} />
                    <span>Upload</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileUpload}
                    className="hidden"
                  />
                  <WebImageSearchPicker
                    currentImageUrl={imageUrl}
                    defaultQuery={title}
                    onSelectImageUrl={(url) => setImageUrl(url)}
                  />
                </div>
              </div>

              <div>
                <label className="block font-mono-tabular text-[11px] text-[#8C9692] mb-1">
                  {category === 'document'
                    ? 'DOCUMENT BODY TEXT (SHOWN TO PLAYERS)'
                    : category === 'item'
                    ? 'ITEM DESCRIPTION'
                    : category === 'equipment'
                    ? 'EQUIPMENT DESCRIPTION'
                    : 'PUBLIC DESCRIPTION (SHOWN TO PLAYERS WHEN SHARED)'}
                </label>
                <textarea
                  rows={5}
                  value={publicContent}
                  onChange={(e) => setPublicContent(e.target.value)}
                  placeholder={
                    category === 'document'
                      ? 'Type the text of the document, letter, napkin note, computer terminal, or sign...'
                      : category === 'item'
                      ? 'Describe the item appearance, origin, or details...'
                      : category === 'equipment'
                      ? 'Describe the piece of equipment...'
                      : 'Visible appearance, demeanor, or public briefing notes...'
                  }
                  className="w-full bg-[#0B0E0D] border border-[#232B28] focus:border-[#16A34A] rounded px-3 py-2 text-xs sm:text-sm text-[#E2E6E4] focus:outline-none resize-y"
                />
              </div>

              {category !== 'item' && category !== 'equipment' && (
                <div>
                  <label className="block font-mono-tabular text-[11px] text-[#FBBF24] mb-1">
                    GM SECRET NOTES / NPC STATS / HIDDEN CLUES (NEVER SENT TO PLAYERS)
                  </label>
                  <textarea
                    rows={3}
                    value={gmSecretNotes}
                    onChange={(e) => setGmSecretNotes(e.target.value)}
                    placeholder="Private GM notes, NPC HP/SAN/Weapon stats, hidden traps, or true motives..."
                    className="w-full bg-[#0B0E0D] border border-[#D97706]/50 focus:border-[#FBBF24] rounded px-3 py-2 text-xs text-[#E2E6E4] focus:outline-none resize-y"
                  />
                </div>
              )}
            </div>

            {/* Right Column: Live Interactive Preview */}
            <div className="lg:col-span-6 flex flex-col justify-between bg-[#0B0E0D] border border-[#232B28] p-4 rounded">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-[#232B28] pb-2">
                  <span className="font-mono-tabular text-[11px] font-semibold text-[#8C9692]">
                    LIVE PLAYER HANDOUT PREVIEW
                  </span>
                  <span className="font-mono-tabular text-[10px] text-[#4ADE80]">
                    {category.toUpperCase()}
                    {category === 'document' ? ` · ${docStyle.toUpperCase()}` : ''}
                  </span>
                </div>

                <div className="py-2">
                  <StyledHandoutRenderer
                    category={category}
                    title={title || 'Untitled Handout'}
                    subtitle={subtitle}
                    imageUrl={imageUrl}
                    publicContent={publicContent || 'Preview text will appear here...'}
                    docStyle={docStyle}
                    docFont={docFont}
                    docSignature={docSignature}
                    gmSecretNotes={gmSecretNotes}
                    showGmSecrets={true}
                    compact={true}
                  />
                </div>
              </div>

              {saveError && (
                <div className="mt-3 p-3 rounded bg-[#DC2626]/15 border border-[#DC2626] text-xs font-mono-tabular text-[#F87171]">
                  {saveError}
                </div>
              )}

              <div className="mt-6 pt-3 border-t border-[#232B28] flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    resetForm();
                    setSaveError(null);
                  }}
                  className="px-3.5 py-2 rounded bg-[#121715] hover:bg-[#19201E] border border-[#232B28] text-xs font-mono-tabular text-[#A5B0AC] hover:text-[#E2E6E4] cursor-pointer"
                >
                  Return to GM Asset Database
                </button>

                <button
                  type="submit"
                  disabled={isSavingAsset}
                  className="px-4 py-2 rounded bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-60 text-xs font-mono-tabular font-semibold text-white cursor-pointer"
                >
                  {isSavingAsset
                    ? 'Saving...'
                    : editingId
                    ? 'Save Changes to Database'
                    : 'Save to GM Database'}
                </button>

                {hasActiveSession && onShareAssetToSession && (
                  <button
                    type="button"
                    disabled={isSavingAsset}
                    onClick={(e) => handleSaveForm(e, true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-[#D97706] hover:bg-[#B45309] disabled:opacity-60 text-xs font-mono-tabular font-semibold text-white cursor-pointer"
                  >
                    <Send size={13} />
                    <span>
                      {isSavingAsset
                        ? 'Saving & Sharing...'
                        : 'Save & Share to Live Session'}
                    </span>
                  </button>
                )}

                {onReturnToSession && (
                  <button
                    type="button"
                    onClick={onReturnToSession}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded bg-[#0B0E0D] hover:bg-[#19201E] border border-[#16A34A] text-xs font-mono-tabular font-semibold text-[#4ADE80] cursor-pointer"
                  >
                    <ArrowLeft size={13} />
                    <span>{returnToSessionLabel}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Image Zoom Lightbox Modal */}
      {zoomAsset && zoomAsset.imageUrl && (
        <ImageZoomModal
          imageUrl={zoomAsset.imageUrl}
          title={zoomAsset.title}
          subtitle={zoomAsset.subtitle}
          returnLabel="Return to GM Asset Database"
          onClose={() => setZoomAsset(null)}
        />
      )}

      {/* Full-Size Handout Preview Modal */}
      {previewAssetId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#121715] border border-[#232B28] rounded max-w-3xl w-full p-5 space-y-4 my-8">
            {(() => {
              const item = gmAssets.find((a) => a.id === previewAssetId);
              if (!item) return null;
              return (
                <>
                  <div className="flex items-center justify-between border-b border-[#232B28] pb-3">
                    <span className="font-mono-tabular text-xs text-[#4ADE80] uppercase">
                      GM ASSET PREVIEW // {item.category}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPreviewAssetId(null)}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded bg-[#0B0E0D] hover:bg-[#19201E] border border-[#232B28] text-xs font-mono-tabular text-[#E2E6E4] cursor-pointer"
                    >
                      <ArrowLeft size={12} className="text-[#4ADE80]" />
                      <span>Return to GM Asset Database</span>
                    </button>
                  </div>
                  <StyledHandoutRenderer
                    category={item.category}
                    title={item.title}
                    subtitle={item.subtitle}
                    imageUrl={item.imageUrl}
                    publicContent={item.publicContent}
                    docStyle={item.docStyle}
                    docFont={item.docFont}
                    docSignature={item.docSignature}
                    gmSecretNotes={item.gmSecretNotes}
                    showGmSecrets={true}
                    onAddToCharacterEquipment={onAddToCharacterEquipment}
                    equipTargetLabel={equipTargetLabel}
                  />
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Category-Separated Sections (When "All Assets" or a specific category tab is selected) */}
      <div className="space-y-8">
        {sectionsToRender.map((sec) => {
          const sectionItems = gmAssets.filter((a) => a.category === sec.id);
          return (
            <div
              key={sec.id}
              className="border border-[#232B28] bg-[#0E1311] p-4 sm:p-5 space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#232B28] pb-3">
                <div className="flex items-center gap-2.5">
                  {renderCategoryIcon(sec.id)}
                  <div>
                    <h3 className="font-display text-base sm:text-lg font-bold text-[#E2E6E4] flex items-center gap-2">
                      <span>{sec.title}</span>
                      <span className="px-2 py-0.5 rounded bg-[#121715] border border-[#232B28] font-mono-tabular text-xs text-[#4ADE80]">
                        {sectionItems.length}
                      </span>
                    </h3>
                    <p className="text-xs text-[#8C9692]">{sec.subtitle}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleStartCreate(sec.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-mono-tabular font-semibold cursor-pointer"
                  >
                    <Plus size={13} />
                    <span>{sec.addButtonLabel.replace(/^\+\s*/, 'Create ')}</span>
                  </button>
                </div>
              </div>

              {sectionItems.length === 0 ? (
                <div className="border border-[#232B28] bg-[#121715] p-6 text-center">
                  <p className="text-xs text-[#8C9692]">{sec.emptyMessage}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sectionItems.map((asset) => renderAssetCard(asset))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
