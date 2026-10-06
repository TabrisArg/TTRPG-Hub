import React, { useState } from 'react';
import {
  UserSquare2,
  MapPin,
  Image as ImageIcon,
  FileText,
  Check,
  X,
  FolderPlus,
} from 'lucide-react';
import {
  GmAsset,
  GmAssetCategory,
  DocumentVisualStyle,
  DocumentFontStyle,
} from '../types/deltaGreen';

interface AddToGmLibraryModalProps {
  imageUrl: string;
  defaultTitle?: string;
  defaultCategory?: GmAssetCategory;
  defaultSubtitle?: string;
  defaultPublicContent?: string;
  defaultDocStyle?: DocumentVisualStyle;
  defaultDocFont?: DocumentFontStyle;
  defaultDocSignature?: string;
  onSaveToGmLibrary: (
    draft: Omit<GmAsset, 'id' | 'ownerId' | 'gameSystem' | 'updatedAt'>
  ) => Promise<string | void>;
  onClose: () => void;
}

const LIBRARY_CATEGORY_OPTIONS: {
  id: GmAssetCategory;
  label: string;
  description: string;
  defaultName: string;
  icon: React.ReactNode;
}[] = [
  {
    id: 'npc',
    label: 'Character / NPC Card',
    description:
      'Populates the NPC portrait section and leaves role, bio, and stats blank to fill in later.',
    defaultName: 'Untitled Character / NPC',
    icon: <UserSquare2 size={18} className="text-[#4ADE80]" />,
  },
  {
    id: 'location',
    label: 'Location Card',
    description:
      'Populates the location photo/map section and leaves coordinates and notes blank to fill in later.',
    defaultName: 'Untitled Location',
    icon: <MapPin size={18} className="text-[#4ADE80]" />,
  },
  {
    id: 'image',
    label: 'Archive Image / Evidence',
    description:
      'Populates the archive image section and leaves exhibit details blank to fill in later.',
    defaultName: 'Untitled Evidence Image',
    icon: <ImageIcon size={18} className="text-[#4ADE80]" />,
  },
  {
    id: 'document',
    label: 'Styled Document',
    description:
      'Populates the attached image section on a new document card, leaving text blank to fill in later.',
    defaultName: 'Untitled Document',
    icon: <FileText size={18} className="text-[#4ADE80]" />,
  },
];

export const AddToGmLibraryModal: React.FC<AddToGmLibraryModalProps> = ({
  imageUrl,
  defaultTitle = '',
  defaultCategory = 'document',
  defaultSubtitle = '',
  defaultPublicContent = '',
  defaultDocStyle = 'official-document',
  defaultDocFont = 'typewriter',
  defaultDocSignature = '',
  onSaveToGmLibrary,
  onClose,
}) => {
  const [selectedCategory, setSelectedCategory] =
    useState<GmAssetCategory>(defaultCategory);
  const [customTitle, setCustomTitle] = useState<string>(defaultTitle);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const activeCategoryMeta =
    LIBRARY_CATEGORY_OPTIONS.find((c) => c.id === selectedCategory) ||
    LIBRARY_CATEGORY_OPTIONS[0];

  const handleConfirmSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setSaveError(null);

    setIsSaving(true);
    try {
      await onSaveToGmLibrary({
        category: selectedCategory,
        title: customTitle.trim() || activeCategoryMeta.defaultName,
        subtitle: defaultSubtitle,
        imageUrl: imageUrl || '',
        publicContent: defaultPublicContent,
        gmSecretNotes: '',
        docStyle:
          selectedCategory === 'document'
            ? defaultDocStyle || 'official-document'
            : '',
        docFont:
          selectedCategory === 'document' ? defaultDocFont || 'typewriter' : '',
        docSignature:
          selectedCategory === 'document' ? defaultDocSignature : '',
      });
      setSavedSuccess(true);
      window.setTimeout(() => {
        onClose();
      }, 900);
    } catch (err) {
      console.error('Error adding to GM Library:', err);
      setSaveError(
        err instanceof Error
          ? err.message
          : 'Failed to save to GM Library. Please try again.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[90] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-[#121715] border-2 border-[#16A34A] rounded max-w-lg w-full p-5 space-y-5 my-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#232B28] pb-3">
          <div>
            <div className="font-mono-tabular text-[11px] text-[#4ADE80] uppercase font-semibold">
              SAVE TO GM LIBRARY
            </div>
            <h3 className="font-display text-lg font-bold text-[#E2E6E4]">
              Save Item to GM Library Database
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded bg-[#0B0E0D] border border-[#232B28] text-[#A5B0AC] hover:text-[#E2E6E4] cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        {saveError && (
          <div className="bg-[#DC2626]/15 border border-[#DC2626] text-[#F87171] px-3 py-2 rounded text-xs font-mono-tabular">
            {saveError}
          </div>
        )}

        {/* Image / Document Preview */}
        <div className="flex items-center gap-4 bg-[#0B0E0D] border border-[#232B28] p-3 rounded">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt="Shared preview"
              referrerPolicy="no-referrer"
              className="w-20 h-20 object-cover rounded border border-[#232B28] shrink-0 bg-[#121715]"
            />
          ) : (
            <div className="w-16 h-16 rounded border border-[#232B28] bg-[#121715] flex items-center justify-center shrink-0 text-[#4ADE80]">
              <FileText size={24} />
            </div>
          )}
          <div className="text-xs text-[#A5B0AC] leading-relaxed">
            Pick a category below to save this handout or image directly into
            your permanent <strong className="text-[#E2E6E4]">Game Master Library</strong>.
          </div>
        </div>

        <form onSubmit={handleConfirmSave} className="space-y-4">
          <div>
            <label className="block font-mono-tabular text-[11px] text-[#8C9692] mb-2">
              1. SELECT GM LIBRARY CATEGORY
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {LIBRARY_CATEGORY_OPTIONS.map((opt) => {
                const isSelected = selectedCategory === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelectedCategory(opt.id)}
                    className={`text-left p-3 rounded border transition-colors cursor-pointer flex flex-col gap-1.5 ${
                      isSelected
                        ? 'border-[#16A34A] bg-[#16A34A]/15 text-[#E2E6E4]'
                        : 'border-[#232B28] bg-[#0B0E0D] text-[#A5B0AC] hover:text-[#E2E6E4]'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-semibold text-xs text-[#E2E6E4]">
                      {opt.icon}
                      <span>{opt.label}</span>
                    </div>
                    <p className="text-[11px] text-[#8C9692] leading-snug">
                      {opt.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block font-mono-tabular text-[11px] text-[#8C9692] mb-1">
              2. OPTIONAL PLACEHOLDER TITLE (CAN BE EDITED LATER)
            </label>
            <input
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder={activeCategoryMeta.defaultName}
              className="w-full bg-[#0B0E0D] border border-[#232B28] focus:border-[#16A34A] rounded px-3 py-2 text-xs text-[#E2E6E4] focus:outline-none"
            />
          </div>

          <div className="pt-2 border-t border-[#232B28] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded bg-[#0B0E0D] hover:bg-[#19201E] border border-[#232B28] text-xs font-mono-tabular text-[#A5B0AC] cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSaving || savedSuccess}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-60 text-white text-xs font-mono-tabular font-semibold cursor-pointer"
            >
              {savedSuccess ? (
                <>
                  <Check size={14} />
                  <span>Added to GM Library!</span>
                </>
              ) : (
                <>
                  <FolderPlus size={14} />
                  <span>
                    {isSaving
                      ? 'Saving to Library...'
                      : `Add as ${activeCategoryMeta.label}`}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
