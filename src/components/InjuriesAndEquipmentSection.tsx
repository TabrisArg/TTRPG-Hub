import React, { useRef, useState } from 'react';
import {
  Trash2,
  RotateCw,
  Shield,
  Package,
  Plus,
  Upload,
  ZoomIn,
  X,
} from 'lucide-react';
import {
  AgentCharacter,
  EquippedCardItem,
  WeaponItem,
} from '../types/deltaGreen';
import { NumericSteppedInput } from './NumericSteppedInput';
import { WEAPON_ARMORY_PRESETS } from '../data/presets';
import { WebImageSearchPicker } from './WebImageSearchPicker';
import { ImageZoomModal } from './ImageZoomModal';

interface InjuriesAndEquipmentSectionProps {
  agent: AgentCharacter;
  onUpdate: (updater: (prev: AgentCharacter) => AgentCharacter) => void;
}

export const InjuriesAndEquipmentSection: React.FC<InjuriesAndEquipmentSectionProps> = ({
  agent,
  onUpdate,
}) => {
  const [selectedPresetIdx, setSelectedPresetIdx] = useState<string>('');
  const [showCreateCardForm, setShowCreateCardForm] = useState<
    false | 'item' | 'equipment'
  >(false);
  const [cardName, setCardName] = useState('');
  const [cardImageUrl, setCardImageUrl] = useState('');
  const [cardDescription, setCardDescription] = useState('');
  const [cardEffect, setCardEffect] = useState('');
  const [zoomCard, setZoomCard] = useState<EquippedCardItem | null>(null);
  const cardFileInputRef = useRef<HTMLInputElement | null>(null);

  const equipmentCards = agent.equipmentCards || [];

  const handleCardImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const rawDataUrl = String(ev.target?.result || '');
      if (!rawDataUrl) return;
      const img = new Image();
      img.onload = () => {
        const maxDim = 720;
        let w = img.naturalWidth || 600;
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
          setCardImageUrl(canvas.toDataURL('image/jpeg', 0.8));
        } else {
          setCardImageUrl(rawDataUrl);
        }
      };
      img.onerror = () => setCardImageUrl(rawDataUrl);
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleAddGearCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showCreateCardForm) return;
    const cleanName =
      cardName.trim() ||
      (showCreateCardForm === 'equipment' ? 'Unnamed Equipment' : 'Unnamed Item');

    const newCard: EquippedCardItem = {
      id: `gear-card-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      category: showCreateCardForm,
      name: cleanName,
      imageUrl: cardImageUrl.trim(),
      description: cardDescription.trim(),
      effect: showCreateCardForm === 'equipment' ? cardEffect.trim() : '',
      addedAt: new Date().toISOString(),
    };

    onUpdate((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      equipmentCards: [...(prev.equipmentCards || []), newCard],
    }));

    setCardName('');
    setCardImageUrl('');
    setCardDescription('');
    setCardEffect('');
    setShowCreateCardForm(false);
  };

  const handleRemoveGearCard = (cardId: string) => {
    onUpdate((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      equipmentCards: (prev.equipmentCards || []).filter((c) => c.id !== cardId),
    }));
  };

  const handleWeaponChange = <K extends keyof WeaponItem>(
    id: string,
    field: K,
    value: WeaponItem[K]
  ) => {
    onUpdate((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      weapons: prev.weapons.map((w) => (w.id === id ? { ...w, [field]: value } : w)),
    }));
  };

  const handleEquipPreset = (presetIndex: number) => {
    const preset = WEAPON_ARMORY_PRESETS[presetIndex];
    if (!preset) return;

    onUpdate((prev) => {
      const emptyIdx = prev.weapons.findIndex((w) => !w.name.trim());
      if (emptyIdx !== -1) {
        const nextWeapons = [...prev.weapons];
        nextWeapons[emptyIdx] = {
          ...nextWeapons[emptyIdx],
          ...preset,
        };
        return {
          ...prev,
          updatedAt: new Date().toISOString(),
          weapons: nextWeapons,
        };
      } else {
        const nextSlotChar = String.fromCharCode(97 + prev.weapons.length);
        return {
          ...prev,
          updatedAt: new Date().toISOString(),
          weapons: [
            ...prev.weapons,
            {
              id: `w-${Date.now()}`,
              slot: `(${nextSlotChar})`,
              ...preset,
            },
          ],
        };
      }
    });
    setSelectedPresetIdx('');
  };

  const handleClearWeaponSlot = (id: string) => {
    onUpdate((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      weapons: prev.weapons.map((w) =>
        w.id === id
          ? {
              ...w,
              name: '',
              skill: 0,
              baseRange: '',
              damage: '',
              armorPiercing: '',
              lethality: 0,
              killRadius: '',
              ammo: 0,
              maxAmmo: 0,
            }
          : w
      ),
    }));
  };

  return (
    <div className="space-y-4">
      {/* SECTION 14: INJURIES */}
      <section
        id="section-injuries"
        className="border border-[#232B28] bg-[#121715] flex flex-col md:flex-row"
      >
        <div className="bg-[#070908] border-b md:border-b-0 md:border-r border-[#232B28] px-3 py-2 md:py-0 md:w-9 flex items-center justify-between md:justify-center shrink-0 select-none">
          <span className="font-mono-tabular text-[11px] font-semibold tracking-[0.2em] text-[#A5B0AC] md:[writing-mode:vertical-rl] md:rotate-180">
            INJURIES
          </span>
          <span className="md:hidden font-mono-tabular text-[10px] text-[#68736E]">
            SEC 14 // MEDICAL
          </span>
        </div>

        <div className="flex-1 flex flex-col">
          <div className="p-3 sm:p-4">
            <label className="block font-mono-tabular text-[11px] font-semibold text-[#8C9692] mb-1.5">
              14. WOUNDS AND AILMENTS
            </label>
            <textarea
              rows={4}
              value={agent.woundsAndAilments}
              onChange={(e) =>
                onUpdate((prev) => ({
                  ...prev,
                  woundsAndAilments: e.target.value,
                  updatedAt: new Date().toISOString(),
                }))
              }
              placeholder="Record physical trauma, surgical interventions, toxins, disease, radiation exposure, or permanent stat loss..."
              className="w-full bg-[#0B0E0D] border border-[#232B28] focus:border-[#16A34A] rounded px-3 py-2 text-xs sm:text-sm leading-relaxed text-[#E2E6E4] focus:outline-none resize-y"
            />
          </div>

          <div className="bg-[#0B0E0D] border-t border-[#232B28] px-3 py-2.5 flex flex-wrap items-center justify-center gap-3 text-xs text-[#A5B0AC]">
            <span>Has First Aid been attempted since the last injury?</span>
            <label className="inline-flex items-center gap-2 cursor-pointer font-medium text-[#E2E6E4] min-h-[32px]">
              <input
                type="checkbox"
                checked={agent.firstAidAttempted}
                onChange={(e) =>
                  onUpdate((prev) => ({
                    ...prev,
                    firstAidAttempted: e.target.checked,
                    updatedAt: new Date().toISOString(),
                  }))
                }
                className="w-4 h-4 accent-[#D97706] rounded cursor-pointer"
              />
              <span
                className={
                  agent.firstAidAttempted ? 'text-[#FBBF24] font-semibold' : 'text-[#8C9692]'
                }
              >
                yes: only Medicine, Surgery, or long-term rest can help further
              </span>
            </label>
          </div>
        </div>
      </section>

      {/* SECTION 15 & 16: EQUIPMENT & WEAPONS */}
      <section
        id="section-equipment"
        className="border border-[#232B28] bg-[#121715] flex flex-col md:flex-row"
      >
        <div className="bg-[#070908] border-b md:border-b-0 md:border-r border-[#232B28] px-3 py-2 md:py-0 md:w-9 flex items-center justify-between md:justify-center shrink-0 select-none">
          <span className="font-mono-tabular text-[11px] font-semibold tracking-[0.2em] text-[#A5B0AC] md:[writing-mode:vertical-rl] md:rotate-180">
            EQUIPMENT
          </span>
          <span className="md:hidden font-mono-tabular text-[10px] text-[#68736E]">
            SEC 15–16 // ARMORY
          </span>
        </div>

        <div className="flex-1 flex flex-col">
          {/* 15. ARMOR AND GEAR */}
          <div className="p-3 sm:p-4 border-b border-[#232B28]">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <label className="font-mono-tabular text-[11px] font-semibold text-[#8C9692]">
                15. ARMOR AND GEAR
              </label>

              <div className="flex items-center gap-2">
                <span className="text-xs text-[#8C9692] inline-flex items-center gap-1">
                  <Shield size={13} className="text-[#16A34A]" />
                  <span>Body Armor Rating:</span>
                </span>
                <NumericSteppedInput
                  value={agent.armorRating}
                  onChange={(val) =>
                    onUpdate((prev) => ({
                      ...prev,
                      armorRating: val,
                      updatedAt: new Date().toISOString(),
                    }))
                  }
                  min={0}
                  max={20}
                  size="sm"
                  highlightColor={agent.armorRating > 0 ? 'emerald' : 'default'}
                  ariaLabel="Body Armor Rating"
                />
              </div>
            </div>

            <textarea
              rows={4}
              value={agent.armorAndGear}
              onChange={(e) =>
                onUpdate((prev) => ({
                  ...prev,
                  armorAndGear: e.target.value,
                  updatedAt: new Date().toISOString(),
                }))
              }
              placeholder="Kevlar vest (Armor 3), tactical helmet, encrypted comms, burner phones, Green Box requisitioned items..."
              className="w-full bg-[#0B0E0D] border border-[#232B28] focus:border-[#16A34A] rounded px-3 py-2 text-xs sm:text-sm leading-relaxed text-[#E2E6E4] focus:outline-none resize-y"
            />

            {/* EQUIPPED ITEM & EQUIPMENT CARDS INSIDE GEAR SECTION */}
            <div className="mt-4 pt-3.5 border-t border-[#232B28] space-y-3">
              {zoomCard && zoomCard.imageUrl && (
                <ImageZoomModal
                  imageUrl={zoomCard.imageUrl}
                  title={zoomCard.name}
                  subtitle={
                    zoomCard.category === 'equipment'
                      ? zoomCard.effect || 'Equipment Card'
                      : 'Item Card'
                  }
                  returnLabel="Return to Gear Section"
                  onClose={() => setZoomCard(null)}
                />
              )}

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Package size={14} className="text-[#4ADE80]" />
                  <span className="font-mono-tabular text-[11px] font-semibold text-[#E2E6E4]">
                    EQUIPPED ITEM & EQUIPMENT CARDS ({equipmentCards.length})
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateCardForm('item');
                      setCardEffect('');
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#0B0E0D] hover:bg-[#19201E] border border-[#232B28] text-xs font-mono-tabular text-[#4ADE80] cursor-pointer"
                  >
                    <Plus size={12} />
                    <span>+ Item Card</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateCardForm('equipment')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#0B0E0D] hover:bg-[#19201E] border border-[#232B28] text-xs font-mono-tabular text-[#4ADE80] cursor-pointer"
                  >
                    <Plus size={12} />
                    <span>+ Equipment Card</span>
                  </button>
                </div>
              </div>

              {showCreateCardForm && (
                <form
                  onSubmit={handleAddGearCard}
                  className="bg-[#0B0E0D] border-2 border-[#16A34A] rounded p-3.5 space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-[#232B28] pb-2">
                    <span className="font-mono-tabular text-xs font-semibold text-[#4ADE80] uppercase">
                      {showCreateCardForm === 'item'
                        ? 'CREATE ITEM CARD (NAME, IMAGE & DESCRIPTION)'
                        : 'CREATE EQUIPMENT CARD (NAME, IMAGE, DESCRIPTION & EFFECT)'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowCreateCardForm(false)}
                      className="text-[#8C9692] hover:text-[#E2E6E4] cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-mono-tabular text-[10px] text-[#8C9692] mb-1">
                        {showCreateCardForm === 'item'
                          ? 'ITEM NAME *'
                          : 'EQUIPMENT NAME *'}
                      </label>
                      <input
                        type="text"
                        required
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        placeholder={
                          showCreateCardForm === 'item'
                            ? 'e.g., Green Box Keycard #44, Strange Amber Vial...'
                            : 'e.g., AN/PVS-14 Night Vision Goggles, Level III Tactical Vest...'
                        }
                        className="w-full bg-[#121715] border border-[#232B28] focus:border-[#16A34A] rounded px-2.5 py-1.5 text-xs text-[#E2E6E4] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-mono-tabular text-[10px] text-[#8C9692] mb-1">
                        IMAGE URL, UPLOAD, OR WEB IMAGE SEARCH
                      </label>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <input
                          type="text"
                          value={cardImageUrl}
                          onChange={(e) => setCardImageUrl(e.target.value)}
                          placeholder="Paste image URL or search..."
                          className="flex-1 min-w-[130px] bg-[#121715] border border-[#232B28] focus:border-[#16A34A] rounded px-2.5 py-1.5 text-xs text-[#E2E6E4] focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => cardFileInputRef.current?.click()}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-[#121715] hover:bg-[#19201E] border border-[#232B28] text-xs font-mono-tabular text-[#4ADE80] cursor-pointer"
                        >
                          <Upload size={12} />
                          <span>Upload</span>
                        </button>
                        <input
                          ref={cardFileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleCardImageUpload}
                          className="hidden"
                        />
                        <WebImageSearchPicker
                          currentImageUrl={cardImageUrl}
                          defaultQuery={cardName}
                          onSelectImageUrl={(url) => setCardImageUrl(url)}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block font-mono-tabular text-[10px] text-[#8C9692] mb-1">
                      DESCRIPTION
                    </label>
                    <textarea
                      rows={2}
                      value={cardDescription}
                      onChange={(e) => setCardDescription(e.target.value)}
                      placeholder="Describe the item or piece of equipment..."
                      className="w-full bg-[#121715] border border-[#232B28] focus:border-[#16A34A] rounded px-2.5 py-1.5 text-xs text-[#E2E6E4] focus:outline-none"
                    />
                  </div>

                  {showCreateCardForm === 'equipment' && (
                    <div>
                      <label className="block font-mono-tabular text-[10px] text-[#4ADE80] font-semibold mb-1">
                        EQUIPMENT EFFECT / MECHANICAL BONUS
                      </label>
                      <input
                        type="text"
                        value={cardEffect}
                        onChange={(e) => setCardEffect(e.target.value)}
                        placeholder="e.g., +20% Alertness in darkness, Armor Rating +3 vs ballistic..."
                        className="w-full bg-[#121715] border border-[#16A34A]/60 focus:border-[#16A34A] rounded px-2.5 py-1.5 text-xs text-[#E2E6E4] focus:outline-none"
                      />
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCreateCardForm(false)}
                      className="px-3 py-1.5 rounded bg-[#121715] border border-[#232B28] text-xs font-mono-tabular text-[#A5B0AC] cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3.5 py-1.5 rounded bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-mono-tabular font-semibold cursor-pointer"
                    >
                      Add to My Gear
                    </button>
                  </div>
                </form>
              )}

              {equipmentCards.length === 0 ? (
                <div className="bg-[#0B0E0D] border border-[#232B28] rounded p-3 text-xs text-[#68736E]">
                  No Item or Equipment cards equipped yet. Create an Item or Equipment card above, or click &ldquo;Add to My Equipment&rdquo; on any Item or Equipment card shared in a session.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {equipmentCards.map((card) => (
                    <div
                      key={card.id}
                      className="bg-[#0B0E0D] border border-[#232B28] rounded p-3 flex gap-3 items-start justify-between"
                    >
                      <div className="flex gap-3 min-w-0 flex-1">
                        {card.imageUrl ? (
                          <button
                            type="button"
                            onClick={() => setZoomCard(card)}
                            title="Zoom into item/equipment image"
                            className="relative w-16 h-16 rounded border border-[#232B28] hover:border-[#16A34A] overflow-hidden shrink-0 cursor-zoom-in bg-[#121715]"
                          >
                            <img
                              src={card.imageUrl}
                              alt={card.name}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                            <span className="absolute bottom-0.5 right-0.5 p-0.5 rounded bg-black/75 text-[#4ADE80]">
                              <ZoomIn size={10} />
                            </span>
                          </button>
                        ) : (
                          <div className="w-16 h-16 rounded border border-[#232B28] bg-[#121715] flex items-center justify-center shrink-0 text-[#4ADE80]">
                            {card.category === 'equipment' ? (
                              <Shield size={22} />
                            ) : (
                              <Package size={22} />
                            )}
                          </div>
                        )}

                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-1.5 font-mono-tabular text-[10px] uppercase text-[#4ADE80]">
                            <span>
                              {card.category === 'equipment'
                                ? 'EQUIPMENT CARD'
                                : 'ITEM CARD'}
                            </span>
                          </div>
                          <h4 className="font-display text-sm font-bold text-[#E2E6E4] truncate">
                            {card.name}
                          </h4>
                          {card.description && (
                            <p className="text-xs text-[#A5B0AC] whitespace-pre-wrap leading-snug">
                              {card.description}
                            </p>
                          )}
                          {card.category === 'equipment' && card.effect && (
                            <div className="mt-1 bg-[#121916] border border-[#16A34A]/50 rounded px-2 py-1 text-[11px] text-[#4ADE80]">
                              <strong>Effect:</strong>{' '}
                              <span className="text-[#E2E6E4]">{card.effect}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveGearCard(card.id)}
                        title="Remove card from gear"
                        className="p-1 text-[#68736E] hover:text-[#F87171] cursor-pointer shrink-0"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-[#0B0E0D] border-b border-[#232B28] px-3 py-2 text-center text-xs italic text-[#8C9692]">
            Body armor reduces the damage of all attacks except Called Shots and successful Lethality rolls.
          </div>

          {/* 16. WEAPONS */}
          <div>
            <div className="bg-[#0B0E0D] border-b border-[#232B28] px-3 py-2.5 flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono-tabular text-[11px] font-semibold text-[#8C9692]">
                16. WEAPONS
              </span>

              <div className="flex items-center gap-2">
                <select
                  value={selectedPresetIdx}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedPresetIdx(val);
                    if (val !== '') {
                      handleEquipPreset(parseInt(val, 10));
                    }
                  }}
                  aria-label="Load weapon from agency armory"
                  className="bg-[#121715] border border-[#232B28] focus:border-[#16A34A] rounded px-2.5 py-1 text-xs text-[#E2E6E4] focus:outline-none cursor-pointer"
                >
                  <option value="">+ Issue Standard Weapon from Armory...</option>
                  {WEAPON_ARMORY_PRESETS.map((p, idx) => (
                    <option key={p.name} value={idx}>
                      {p.name} — {p.damage || `Lethality ${p.lethality}%`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-[#0B0E0D] border-b border-[#232B28] font-mono-tabular text-[10px] font-semibold text-[#8C9692]">
                    <th className="py-2.5 px-3 min-w-[200px]">WEAPONS</th>
                    <th className="py-2.5 px-2 text-center min-w-[115px]">SKILL %</th>
                    <th className="py-2.5 px-2 text-center min-w-[85px]">BASE RANGE</th>
                    <th className="py-2.5 px-2 text-center min-w-[95px]">DAMAGE</th>
                    <th className="py-2.5 px-2 text-center min-w-[90px]">ARMOR PIERCING</th>
                    <th className="py-2.5 px-2 text-center min-w-[115px]">LETHALITY %</th>
                    <th className="py-2.5 px-2 text-center min-w-[90px]">KILL RADIUS</th>
                    <th className="py-2.5 px-3 text-center min-w-[125px]">AMMO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#232B28]">
                  {agent.weapons.map((w) => {
                    const hasWeapon = w.name.trim().length > 0;
                    return (
                      <tr
                        key={w.id}
                        className="hover:bg-[#161C1A] transition-colors align-middle"
                      >
                        {/* Weapon Name & Slot */}
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono-tabular text-xs text-[#68736E] shrink-0">
                              {w.slot}
                            </span>
                            <input
                              type="text"
                              value={w.name}
                              onChange={(e) => handleWeaponChange(w.id, 'name', e.target.value)}
                              placeholder="Weapon model & caliber..."
                              className="w-full bg-[#0B0E0D] border border-[#232B28] focus:border-[#16A34A] rounded px-2 py-1 text-xs font-medium text-[#E2E6E4] focus:outline-none"
                            />
                            {hasWeapon && (
                              <button
                                type="button"
                                onClick={() => handleClearWeaponSlot(w.id)}
                                title="Clear weapon slot"
                                className="p-1 text-[#68736E] hover:text-[#F87171] cursor-pointer shrink-0"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Skill % */}
                        <td className="py-2 px-2">
                          <div className="flex items-center justify-center">
                            <NumericSteppedInput
                              value={w.skill}
                              onChange={(val) => handleWeaponChange(w.id, 'skill', val)}
                              min={0}
                              max={99}
                              size="sm"
                              suffix="%"
                              ariaLabel={`${w.name || w.slot} skill percentage`}
                            />
                          </div>
                        </td>

                        {/* Base Range */}
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={w.baseRange}
                            onChange={(e) =>
                              handleWeaponChange(w.id, 'baseRange', e.target.value)
                            }
                            placeholder="15m"
                            className="w-full bg-[#0B0E0D] border border-[#232B28] focus:border-[#16A34A] rounded px-1.5 py-1 text-xs font-mono-tabular text-center text-[#E2E6E4] focus:outline-none"
                          />
                        </td>

                        {/* Damage */}
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={w.damage}
                            onChange={(e) =>
                              handleWeaponChange(w.id, 'damage', e.target.value)
                            }
                            placeholder="1D10"
                            className="w-full bg-[#0B0E0D] border border-[#232B28] focus:border-[#16A34A] rounded px-1.5 py-1 text-xs font-mono-tabular text-center text-[#E2E6E4] focus:outline-none"
                          />
                        </td>

                        {/* Armor Piercing */}
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={w.armorPiercing}
                            onChange={(e) =>
                              handleWeaponChange(w.id, 'armorPiercing', e.target.value)
                            }
                            placeholder="—"
                            className="w-full bg-[#0B0E0D] border border-[#232B28] focus:border-[#16A34A] rounded px-1.5 py-1 text-xs font-mono-tabular text-center text-[#E2E6E4] focus:outline-none"
                          />
                        </td>

                        {/* Lethality % */}
                        <td className="py-2 px-2">
                          <div className="flex items-center justify-center">
                            <NumericSteppedInput
                              value={w.lethality}
                              onChange={(val) => handleWeaponChange(w.id, 'lethality', val)}
                              min={0}
                              max={99}
                              size="sm"
                              suffix="%"
                              highlightColor={w.lethality > 0 ? 'crimson' : 'default'}
                              ariaLabel={`${w.name || w.slot} lethality percentage`}
                            />
                          </div>
                        </td>

                        {/* Kill Radius */}
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={w.killRadius}
                            onChange={(e) =>
                              handleWeaponChange(w.id, 'killRadius', e.target.value)
                            }
                            placeholder="—"
                            className="w-full bg-[#0B0E0D] border border-[#232B28] focus:border-[#16A34A] rounded px-1.5 py-1 text-xs font-mono-tabular text-center text-[#E2E6E4] focus:outline-none"
                          />
                        </td>

                        {/* Ammo */}
                        <td className="py-2 px-3">
                          <div className="flex items-center justify-center gap-1">
                            <NumericSteppedInput
                              value={w.ammo}
                              onChange={(val) => handleWeaponChange(w.id, 'ammo', val)}
                              min={0}
                              max={999}
                              size="sm"
                              ariaLabel={`${w.name || w.slot} ammunition`}
                            />
                            {w.maxAmmo > 0 && w.ammo < w.maxAmmo && (
                              <button
                                type="button"
                                onClick={() => handleWeaponChange(w.id, 'ammo', w.maxAmmo)}
                                title={`Reload to ${w.maxAmmo} rounds`}
                                className="p-1.5 rounded bg-[#0B0E0D] hover:bg-[#19221E] border border-[#232B28] text-[#8C9692] hover:text-[#4ADE80] cursor-pointer"
                              >
                                <RotateCw size={12} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
