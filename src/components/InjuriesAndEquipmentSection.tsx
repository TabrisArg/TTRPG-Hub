import React, { useState } from 'react';
import { Trash2, RotateCw, Shield } from 'lucide-react';
import { AgentCharacter, WeaponItem } from '../types/deltaGreen';
import { NumericSteppedInput } from './NumericSteppedInput';
import { WEAPON_ARMORY_PRESETS } from '../data/presets';

interface InjuriesAndEquipmentSectionProps {
  agent: AgentCharacter;
  onUpdate: (updater: (prev: AgentCharacter) => AgentCharacter) => void;
}

export const InjuriesAndEquipmentSection: React.FC<InjuriesAndEquipmentSectionProps> = ({
  agent,
  onUpdate,
}) => {
  const [selectedPresetIdx, setSelectedPresetIdx] = useState<string>('');

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
