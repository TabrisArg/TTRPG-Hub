import React, { useState } from 'react';
import { Search, ArrowUpRight, Plus, Trash2, RotateCcw } from 'lucide-react';
import { AgentCharacter, SkillItem } from '../types/deltaGreen';
import { NumericSteppedInput } from './NumericSteppedInput';
import { recalculateDerivedMax } from '../utils/diceAndRules';

interface ApplicableSkillSetsSectionProps {
  agent: AgentCharacter;
  onUpdate: (updater: (prev: AgentCharacter) => AgentCharacter) => void;
  onSessionAdvancePlusOne: () => void;
  onClearAllSkillChecks: () => void;
}

export const ApplicableSkillSetsSection: React.FC<ApplicableSkillSetsSectionProps> = ({
  agent,
  onUpdate,
  onSessionAdvancePlusOne,
  onClearAllSkillChecks,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'trained' | 'checked'>('all');

  const handleSkillChange = (id: string, newValue: number) => {
    onUpdate((prev) => {
      const updated: AgentCharacter = {
        ...prev,
        updatedAt: new Date().toISOString(),
        skills: prev.skills.map((s) => (s.id === id ? { ...s, value: newValue } : s)),
      };
      return recalculateDerivedMax(updated);
    });
  };

  const handleSkillCheckToggle = (id: string) => {
    onUpdate((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      skills: prev.skills.map((s) =>
        s.id === id && !s.isUnnatural ? { ...s, checked: !s.checked } : s
      ),
    }));
  };

  const handleSpecialtyChange = (id: string, specialty: string) => {
    onUpdate((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      skills: prev.skills.map((s) => (s.id === id ? { ...s, specialty } : s)),
    }));
  };

  const handleCustomSkillChange = (
    id: string,
    field: 'name' | 'value' | 'checked',
    val: string | number | boolean
  ) => {
    onUpdate((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      foreignLanguagesAndOther: prev.foreignLanguagesAndOther.map((c) =>
        c.id === id ? { ...c, [field]: val } : c
      ),
    }));
  };

  const handleAddCustomSkill = () => {
    onUpdate((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      foreignLanguagesAndOther: [
        ...prev.foreignLanguagesAndOther,
        { id: `fl-${Date.now()}`, name: '', value: 0, checked: false },
      ],
    }));
  };

  const handleRemoveCustomSkill = (id: string) => {
    onUpdate((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      foreignLanguagesAndOther: prev.foreignLanguagesAndOther.filter((c) => c.id !== id),
    }));
  };

  const checkedCount =
    agent.skills.filter((s) => s.checked).length +
    agent.foreignLanguagesAndOther.filter((c) => c.checked).length;

  const filterSkill = (s: SkillItem) => {
    const matchesQuery =
      !searchQuery.trim() ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.specialty && s.specialty.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesQuery) return false;
    if (filterMode === 'trained') return s.value > s.base;
    if (filterMode === 'checked') return s.checked;
    return true;
  };

  const renderSkillRow = (skill: SkillItem) => {
    const isTrained = skill.value > skill.base;

    return (
      <div
        key={skill.id}
        className={`flex items-center justify-between gap-2 px-3 py-2 border-b border-[#232B28] transition-colors ${
          skill.isUnnatural
            ? 'bg-[#19151D]/50 hover:bg-[#1E1824]'
            : isTrained
            ? 'bg-[#131A17] hover:bg-[#18221E]'
            : 'hover:bg-[#161C1A]'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {!skill.isUnnatural ? (
            <input
              type="checkbox"
              checked={skill.checked}
              onChange={() => handleSkillCheckToggle(skill.id)}
              title="Check when you attempt to use this skill and fail"
              aria-label={`Mark ${skill.name} failed check`}
              className="w-4 h-4 accent-[#16A34A] rounded shrink-0 cursor-pointer"
            />
          ) : (
            <span
              className="w-4 h-4 inline-flex items-center justify-center text-[10px] font-mono-tabular text-[#D97706] shrink-0"
              title="Unnatural cannot be improved via failed skill checks"
            >
              —
            </span>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className={`text-xs sm:text-sm font-medium inline-flex items-center gap-1 ${
                  skill.isUnnatural
                    ? 'text-[#FBBF24] font-semibold'
                    : isTrained
                    ? 'text-[#E2E6E4] font-semibold'
                    : 'text-[#A5B0AC]'
                }`}
              >
                <span>{skill.name}</span>
                <span className="font-mono-tabular text-[11px] text-[#68736E] font-normal">
                  ({skill.base}%){skill.hasSpecialty ? ':' : ''}
                </span>
              </span>
            </div>

            {skill.hasSpecialty && (
              <input
                type="text"
                value={skill.specialty || ''}
                onChange={(e) => handleSpecialtyChange(skill.id, e.target.value)}
                placeholder="Specify specialization..."
                className="mt-1 w-full bg-[#0B0E0D] border border-[#232B28] focus:border-[#16A34A] rounded px-2 py-0.5 text-xs text-[#E2E6E4] focus:outline-none"
              />
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <NumericSteppedInput
            value={skill.value}
            onChange={(val) => handleSkillChange(skill.id, val)}
            min={0}
            max={99}
            size="sm"
            suffix="%"
            highlightColor={
              skill.isUnnatural && skill.value > 0
                ? 'amber'
                : isTrained
                ? 'emerald'
                : 'default'
            }
            ariaLabel={`${skill.name} percentage`}
          />
        </div>
      </div>
    );
  };

  const col1Skills = agent.skills.filter((s) => s.column === 1 && filterSkill(s));
  const col2Skills = agent.skills.filter((s) => s.column === 2 && filterSkill(s));
  const col3Skills = agent.skills.filter((s) => s.column === 3 && filterSkill(s));

  return (
    <section
      id="section-skills"
      className="border border-[#232B28] bg-[#121715] flex flex-col md:flex-row"
    >
      {/* Official Vertical Black Form Sidebar */}
      <div className="bg-[#070908] border-b md:border-b-0 md:border-r border-[#232B28] px-3 py-2 md:py-0 md:w-9 flex items-center justify-between md:justify-center shrink-0 select-none">
        <span className="font-mono-tabular text-[11px] font-semibold tracking-[0.2em] text-[#A5B0AC] md:[writing-mode:vertical-rl] md:rotate-180">
          APPLICABLE SKILL SETS
        </span>
        <span className="md:hidden font-mono-tabular text-[10px] text-[#68736E]">
          SKILL MATRIX
        </span>
      </div>

      <div className="flex-1 flex flex-col">
        {/* Skill Control & Filter Bar */}
        <div className="bg-[#0B0E0D] border-b border-[#232B28] px-3 py-2.5 flex flex-wrap items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#68736E]"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter skills or specialties..."
              className="w-full bg-[#121715] border border-[#232B28] focus:border-[#16A34A] rounded pl-8 pr-3 py-1 text-xs text-[#E2E6E4] focus:outline-none"
            />
          </div>

          {/* Interactive Filter Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center bg-[#121715] p-0.5 rounded border border-[#232B28]">
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap ${
                  filterMode === 'all'
                    ? 'bg-[#1E2723] text-[#E2E6E4]'
                    : 'text-[#8C9692] hover:text-[#E2E6E4]'
                }`}
              >
                All Skills
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('trained')}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap ${
                  filterMode === 'trained'
                    ? 'bg-[#16A34A]/20 text-[#4ADE80]'
                    : 'text-[#8C9692] hover:text-[#E2E6E4]'
                }`}
              >
                Trained Only
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('checked')}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap ${
                  filterMode === 'checked'
                    ? 'bg-[#16A34A]/20 text-[#4ADE80]'
                    : 'text-[#8C9692] hover:text-[#E2E6E4]'
                }`}
              >
                Checked ({checkedCount})
              </button>
            </div>

            {/* Tabletop Session Advancement & Clear Checks Buttons */}
            {checkedCount > 0 && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={onSessionAdvancePlusOne}
                  title="Official Form Rule: Add +1% to all checked skills and erase all checks"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#16A34A] hover:bg-[#15803D] text-xs font-mono-tabular font-semibold text-white transition-colors cursor-pointer whitespace-nowrap"
                >
                  <ArrowUpRight size={13} />
                  <span>Add +1% to Checked & Clear</span>
                </button>
                <button
                  type="button"
                  onClick={onClearAllSkillChecks}
                  title="Erase all failure checkmarks after manually adjusting skills"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#121715] hover:bg-[#19221E] border border-[#232B28] text-xs font-mono-tabular text-[#A5B0AC] hover:text-[#E2E6E4] transition-colors cursor-pointer whitespace-nowrap"
                >
                  <RotateCcw size={12} />
                  <span>Erase Checks</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 3-Column Official Skill Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#232B28]">
          {/* Column 1 */}
          <div>{col1Skills.map(renderSkillRow)}</div>

          {/* Column 2 */}
          <div>{col2Skills.map(renderSkillRow)}</div>

          {/* Column 3 + Foreign Languages and Other Skills */}
          <div className="md:col-span-2 xl:col-span-1 flex flex-col">
            <div>{col3Skills.map(renderSkillRow)}</div>

            {/* Foreign Languages and Other Skills */}
            <div className="flex-1 flex flex-col bg-[#0E1311]">
              <div className="px-3 py-2 bg-[#0B0E0D] border-b border-[#232B28] flex items-center justify-between">
                <span className="text-xs font-semibold text-[#A5B0AC]">
                  Foreign Languages and Other Skills:
                </span>
                <button
                  type="button"
                  onClick={handleAddCustomSkill}
                  className="inline-flex items-center gap-1 text-[11px] font-mono-tabular text-[#4ADE80] hover:text-[#86EFAC] cursor-pointer"
                >
                  <Plus size={12} />
                  <span>Add Slot</span>
                </button>
              </div>

              <div className="divide-y divide-[#232B28]">
                {agent.foreignLanguagesAndOther.map((custom) => (
                  <div
                    key={custom.id}
                    className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-[#161C1A] transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={custom.checked}
                      onChange={(e) =>
                        handleCustomSkillChange(custom.id, 'checked', e.target.checked)
                      }
                      aria-label="Mark custom skill failed check"
                      className="w-4 h-4 accent-[#16A34A] rounded shrink-0 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={custom.name}
                      onChange={(e) =>
                        handleCustomSkillChange(custom.id, 'name', e.target.value)
                      }
                      placeholder="Language or Special Skill..."
                      className="flex-1 min-w-0 bg-[#0B0E0D] border border-[#232B28] focus:border-[#16A34A] rounded px-2 py-1 text-xs text-[#E2E6E4] focus:outline-none"
                    />
                    <NumericSteppedInput
                      value={custom.value}
                      onChange={(val) => handleCustomSkillChange(custom.id, 'value', val)}
                      min={0}
                      max={99}
                      size="sm"
                      suffix="%"
                      highlightColor={custom.value > 0 ? 'emerald' : 'default'}
                      ariaLabel={`${custom.name || 'Custom skill'} percentage`}
                    />
                    {agent.foreignLanguagesAndOther.length > 6 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveCustomSkill(custom.id)}
                        className="p-1 text-[#68736E] hover:text-[#F87171] cursor-pointer"
                        aria-label="Remove custom skill slot"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Official Sheet Footer Note for Applicable Skill Sets */}
        <div className="bg-[#0B0E0D] border-t border-[#232B28] px-4 py-2 text-center text-xs italic text-[#8C9692]">
          Check a box when you attempt to use a skill and fail. After the session, add 1 to each checked skill and erase all checks.
        </div>
      </div>
    </section>
  );
};
