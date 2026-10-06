import React from 'react';
import { Plus, Trash2, AlertTriangle, RotateCcw } from 'lucide-react';
import { AgentCharacter, StatKey } from '../types/deltaGreen';
import { NumericSteppedInput } from './NumericSteppedInput';
import { recalculateDerivedMax } from '../utils/diceAndRules';

interface StatisticalAndPsychSectionProps {
  agent: AgentCharacter;
  onUpdate: (updater: (prev: AgentCharacter) => AgentCharacter) => void;
  onResetBreakingPoint: () => void;
}

const STAT_ORDER: StatKey[] = ['STR', 'CON', 'DEX', 'INT', 'POW', 'CHA'];

export const StatisticalAndPsychSection: React.FC<StatisticalAndPsychSectionProps> = ({
  agent,
  onUpdate,
  onResetBreakingPoint,
}) => {
  const handleStatScoreChange = (key: StatKey, newScore: number) => {
    onUpdate((prev) => {
      const next: AgentCharacter = {
        ...prev,
        updatedAt: new Date().toISOString(),
        statistics: {
          ...prev.statistics,
          [key]: {
            ...prev.statistics[key],
            score: newScore,
          },
        },
      };
      return recalculateDerivedMax(next);
    });
  };

  const handleStatFeatureChange = (key: StatKey, features: string) => {
    onUpdate((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      statistics: {
        ...prev.statistics,
        [key]: {
          ...prev.statistics[key],
          distinguishingFeatures: features,
        },
      },
    }));
  };

  const handleDerivedChange = (
    attr: 'hp' | 'wp' | 'san' | 'bp',
    field: 'max' | 'current',
    val: number
  ) => {
    onUpdate((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      derived: {
        ...prev.derived,
        [attr]: {
          ...prev.derived[attr],
          [field]: val,
        },
      },
    }));
  };

  const toggleAutoCalc = () => {
    onUpdate((prev) => {
      const nextAuto = !prev.derived.autoCalculateMax;
      const updated: AgentCharacter = {
        ...prev,
        updatedAt: new Date().toISOString(),
        derived: {
          ...prev.derived,
          autoCalculateMax: nextAuto,
        },
      };
      return nextAuto ? recalculateDerivedMax(updated) : updated;
    });
  };

  const handleBondChange = (id: string, field: 'name' | 'score', value: string | number) => {
    onUpdate((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      bonds: prev.bonds.map((b) => (b.id === id ? { ...b, [field]: value } : b)),
    }));
  };

  const handleAddBond = () => {
    onUpdate((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      bonds: [
        ...prev.bonds,
        {
          id: `bond-${Date.now()}`,
          name: '',
          score: prev.statistics.CHA.score,
        },
      ],
    }));
  };

  const handleRemoveBond = (id: string) => {
    onUpdate((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      bonds: prev.bonds.filter((b) => b.id !== id),
    }));
  };

  const handleAdaptationCheck = (type: 'violence' | 'helplessness', index: 0 | 1 | 2) => {
    onUpdate((prev) => {
      const nextChecks: [boolean, boolean, boolean] = [...prev.adaptation[type]] as [
        boolean,
        boolean,
        boolean,
      ];
      nextChecks[index] = !nextChecks[index];
      const allThree = nextChecks[0] && nextChecks[1] && nextChecks[2];
      const adaptedKey = type === 'violence' ? 'violenceAdapted' : 'helplessnessAdapted';
      return {
        ...prev,
        updatedAt: new Date().toISOString(),
        adaptation: {
          ...prev.adaptation,
          [type]: nextChecks,
          [adaptedKey]: allThree ? true : prev.adaptation[adaptedKey],
        },
      };
    });
  };

  const toggleAdaptedStatus = (type: 'violenceAdapted' | 'helplessnessAdapted') => {
    onUpdate((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      adaptation: {
        ...prev.adaptation,
        [type]: !prev.adaptation[type],
      },
    }));
  };

  const isBreakingPointReached = agent.derived.san.current <= agent.derived.bp.current;
  const isCriticalHp = agent.derived.hp.current <= 2;
  const isLowWp = agent.derived.wp.current <= 2;

  return (
    <section
      id="section-stats-psych"
      className="border border-[#232B28] bg-[#121715] grid grid-cols-1 lg:grid-cols-12"
    >
      {/* LEFT HALF: STATISTICAL DATA (Sections 8, 9, 10) */}
      <div className="lg:col-span-7 flex flex-col md:flex-row border-b lg:border-b-0 lg:border-r border-[#232B28]">
        {/* Vertical Black Strip */}
        <div className="bg-[#070908] border-b md:border-b-0 md:border-r border-[#232B28] px-3 py-2 md:py-0 md:w-9 flex items-center justify-between md:justify-center shrink-0 select-none">
          <span className="font-mono-tabular text-[11px] font-semibold tracking-[0.2em] text-[#A5B0AC] md:[writing-mode:vertical-rl] md:rotate-180">
            STATISTICAL DATA
          </span>
          <span className="md:hidden font-mono-tabular text-[10px] text-[#68736E]">
            SEC 08–10
          </span>
        </div>

        <div className="flex-1 flex flex-col divide-y divide-[#232B28]">
          {/* 8. STATISTICS TABLE */}
          <div>
            <div className="grid grid-cols-12 bg-[#0B0E0D] border-b border-[#232B28] px-3 py-2 font-mono-tabular text-[11px] font-semibold text-[#8C9692] items-center">
              <div className="col-span-5 sm:col-span-3">8. STATISTICS</div>
              <div className="col-span-4 sm:col-span-3 text-center">SCORE</div>
              <div className="col-span-3 sm:col-span-2 text-center">×5</div>
              <div className="hidden sm:block sm:col-span-4 pl-2">DISTINGUISHING FEATURES</div>
            </div>

            <div className="divide-y divide-[#232B28]">
              {STAT_ORDER.map((key) => {
                const stat = agent.statistics[key];
                const x5 = stat.score * 5;
                const needsFeatureNote = stat.score > 0 && (stat.score < 9 || stat.score > 12);

                return (
                  <div
                    key={key}
                    className="grid grid-cols-12 items-center px-3 py-2.5 gap-y-2 hover:bg-[#161C1A] transition-colors"
                  >
                    <div className="col-span-5 sm:col-span-3 pr-2">
                      <span className="text-xs sm:text-sm font-medium text-[#E2E6E4]">
                        {stat.label}
                      </span>
                    </div>

                    <div className="col-span-4 sm:col-span-3 flex justify-center">
                      <NumericSteppedInput
                        value={stat.score}
                        onChange={(val) => handleStatScoreChange(key, val)}
                        min={0}
                        max={25}
                        size="sm"
                        ariaLabel={`${stat.label} Score`}
                      />
                    </div>

                    <div className="col-span-3 sm:col-span-2 flex justify-center">
                      <span className="inline-flex items-center justify-center px-2.5 py-1 rounded bg-[#0B0E0D] border border-[#232B28] text-xs font-mono-tabular font-semibold text-[#4ADE80] min-w-[48px]">
                        {x5}%
                      </span>
                    </div>

                    <div className="col-span-12 sm:col-span-4 sm:pl-2">
                      <input
                        type="text"
                        value={stat.distinguishingFeatures}
                        onChange={(e) => handleStatFeatureChange(key, e.target.value)}
                        placeholder={
                          needsFeatureNote
                            ? 'Required (Score <9 or >12)...'
                            : 'Distinguishing feature...'
                        }
                        className={`w-full bg-[#0B0E0D] border rounded px-2 py-1 text-xs text-[#E2E6E4] focus:outline-none transition-colors ${
                          needsFeatureNote && !stat.distinguishingFeatures
                            ? 'border-[#D97706]/50 placeholder:text-[#D97706]/70 focus:border-[#D97706]'
                            : 'border-[#232B28] focus:border-[#16A34A] placeholder:text-[#525C58]'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 9. DERIVED ATTRIBUTES */}
          <div>
            <div className="grid grid-cols-12 bg-[#0B0E0D] border-b border-[#232B28] px-3 py-2 font-mono-tabular text-[11px] font-semibold text-[#8C9692] items-center">
              <div className="col-span-5 flex items-center gap-2">
                <span>9. DERIVED ATTRIBUTES</span>
              </div>
              <div className="col-span-3 text-center">MAXIMUM</div>
              <div className="col-span-4 text-center flex items-center justify-end sm:justify-center gap-2">
                <span>CURRENT</span>
                <button
                  type="button"
                  onClick={toggleAutoCalc}
                  title="Toggle automatic calculation of Max HP, Max WP, and Max SAN (99 - Unnatural)"
                  className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                    agent.derived.autoCalculateMax
                      ? 'border-[#16A34A]/50 bg-[#16A34A]/10 text-[#4ADE80]'
                      : 'border-[#232B28] bg-[#121715] text-[#8C9692]'
                  }`}
                >
                  {agent.derived.autoCalculateMax ? 'AUTO-MAX' : 'MANUAL'}
                </button>
              </div>
            </div>

            <div className="divide-y divide-[#232B28]">
              {/* Hit Points (HP) */}
              <div className="grid grid-cols-12 items-center px-3 py-2.5 hover:bg-[#161C1A] transition-colors">
                <div className="col-span-5 pr-2">
                  <div className="text-xs sm:text-sm font-medium text-[#E2E6E4] flex items-center gap-1.5">
                    <span>Hit Points (HP)</span>
                    {isCriticalHp && (
                      <span className="text-[10px] font-mono-tabular text-[#F87171]">
                        · CRITICAL
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] font-mono-tabular text-[#68736E]">
                    ⌈(STR + CON) ÷ 2⌉
                  </div>
                </div>
                <div className="col-span-3 flex justify-center">
                  {agent.derived.autoCalculateMax ? (
                    <span className="font-mono-tabular text-sm font-semibold text-[#8C9692] px-3 py-1 bg-[#0B0E0D] border border-[#232B28] rounded">
                      {agent.derived.hp.max}
                    </span>
                  ) : (
                    <NumericSteppedInput
                      value={agent.derived.hp.max}
                      onChange={(v) => handleDerivedChange('hp', 'max', v)}
                      min={0}
                      max={99}
                      size="sm"
                      ariaLabel="Maximum Hit Points"
                    />
                  )}
                </div>
                <div className="col-span-4 flex justify-end sm:justify-center">
                  <NumericSteppedInput
                    value={agent.derived.hp.current}
                    onChange={(v) => handleDerivedChange('hp', 'current', v)}
                    min={0}
                    max={Math.max(99, agent.derived.hp.max)}
                    size="md"
                    highlightColor={isCriticalHp ? 'crimson' : 'default'}
                    ariaLabel="Current Hit Points"
                  />
                </div>
              </div>

              {/* Willpower Points (WP) */}
              <div className="grid grid-cols-12 items-center px-3 py-2.5 hover:bg-[#161C1A] transition-colors">
                <div className="col-span-5 pr-2">
                  <div className="text-xs sm:text-sm font-medium text-[#E2E6E4] flex items-center gap-1.5">
                    <span>Willpower Points (WP)</span>
                    {isLowWp && (
                      <span className="text-[10px] font-mono-tabular text-[#FBBF24]">
                        · EXHAUSTED
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] font-mono-tabular text-[#68736E]">Equal to POW</div>
                </div>
                <div className="col-span-3 flex justify-center">
                  {agent.derived.autoCalculateMax ? (
                    <span className="font-mono-tabular text-sm font-semibold text-[#8C9692] px-3 py-1 bg-[#0B0E0D] border border-[#232B28] rounded">
                      {agent.derived.wp.max}
                    </span>
                  ) : (
                    <NumericSteppedInput
                      value={agent.derived.wp.max}
                      onChange={(v) => handleDerivedChange('wp', 'max', v)}
                      min={0}
                      max={99}
                      size="sm"
                      ariaLabel="Maximum Willpower Points"
                    />
                  )}
                </div>
                <div className="col-span-4 flex justify-end sm:justify-center">
                  <NumericSteppedInput
                    value={agent.derived.wp.current}
                    onChange={(v) => handleDerivedChange('wp', 'current', v)}
                    min={0}
                    max={Math.max(99, agent.derived.wp.max)}
                    size="md"
                    highlightColor={isLowWp ? 'amber' : 'default'}
                    ariaLabel="Current Willpower Points"
                  />
                </div>
              </div>

              {/* Sanity Points (SAN) */}
              <div className="grid grid-cols-12 items-center px-3 py-2.5 hover:bg-[#161C1A] transition-colors">
                <div className="col-span-5 pr-2">
                  <div className="text-xs sm:text-sm font-medium text-[#E2E6E4]">
                    Sanity Points (SAN)
                  </div>
                  <div className="text-[10px] font-mono-tabular text-[#68736E]">
                    Max: 99 − Unnatural
                  </div>
                </div>
                <div className="col-span-3 flex justify-center">
                  {agent.derived.autoCalculateMax ? (
                    <span className="font-mono-tabular text-sm font-semibold text-[#8C9692] px-3 py-1 bg-[#0B0E0D] border border-[#232B28] rounded">
                      {agent.derived.san.max}
                    </span>
                  ) : (
                    <NumericSteppedInput
                      value={agent.derived.san.max}
                      onChange={(v) => handleDerivedChange('san', 'max', v)}
                      min={0}
                      max={99}
                      size="sm"
                      ariaLabel="Maximum Sanity Points"
                    />
                  )}
                </div>
                <div className="col-span-4 flex justify-end sm:justify-center">
                  <NumericSteppedInput
                    value={agent.derived.san.current}
                    onChange={(v) => handleDerivedChange('san', 'current', v)}
                    min={0}
                    max={Math.max(99, agent.derived.san.max)}
                    size="md"
                    highlightColor={isBreakingPointReached ? 'crimson' : 'emerald'}
                    ariaLabel="Current Sanity Points"
                  />
                </div>
              </div>

              {/* Breaking Point (BP) */}
              <div
                className={`grid grid-cols-12 items-center px-3 py-2.5 transition-colors ${
                  isBreakingPointReached ? 'bg-[#DC2626]/10' : 'hover:bg-[#161C1A]'
                }`}
              >
                <div className="col-span-5 pr-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs sm:text-sm font-medium text-[#E2E6E4]">
                      Breaking Point (BP)
                    </span>
                    {isBreakingPointReached && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono-tabular font-semibold text-[#F87171]">
                        <AlertTriangle size={12} />
                        BREACHED
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-mono-tabular text-[#68736E]">
                      SAN − POW
                    </span>
                    <button
                      type="button"
                      onClick={onResetBreakingPoint}
                      title="Set Breaking Point to Current SAN − POW"
                      className="inline-flex items-center gap-1 text-[10px] font-mono-tabular text-[#8C9692] hover:text-[#4ADE80] underline underline-offset-2 cursor-pointer"
                    >
                      <RotateCcw size={10} />
                      <span>Set (SAN−POW)</span>
                    </button>
                  </div>
                </div>
                <div className="col-span-3 flex justify-center">
                  <NumericSteppedInput
                    value={agent.derived.bp.max}
                    onChange={(v) => handleDerivedChange('bp', 'max', v)}
                    min={0}
                    max={99}
                    size="sm"
                    ariaLabel="Initial Breaking Point"
                  />
                </div>
                <div className="col-span-4 flex justify-end sm:justify-center">
                  <NumericSteppedInput
                    value={agent.derived.bp.current}
                    onChange={(v) => handleDerivedChange('bp', 'current', v)}
                    min={0}
                    max={99}
                    size="md"
                    highlightColor={isBreakingPointReached ? 'crimson' : 'default'}
                    ariaLabel="Current Breaking Point"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 10. PHYSICAL DESCRIPTION */}
          <div className="p-3 flex-1 flex flex-col">
            <label className="block font-mono-tabular text-[11px] font-semibold text-[#8C9692] mb-1.5">
              10. PHYSICAL DESCRIPTION
            </label>
            <textarea
              rows={3}
              value={agent.physicalDescription}
              onChange={(e) =>
                onUpdate((prev) => ({
                  ...prev,
                  physicalDescription: e.target.value,
                  updatedAt: new Date().toISOString(),
                }))
              }
              placeholder="Height, weight, build, scars, distinguishing mannerisms, standard field attire..."
              className="w-full flex-1 bg-[#0B0E0D] border border-[#232B28] focus:border-[#16A34A] rounded px-2.5 py-1.5 text-xs leading-relaxed text-[#E2E6E4] focus:outline-none transition-colors resize-y"
            />
          </div>
        </div>
      </div>

      {/* RIGHT HALF: PSYCHOLOGICAL DATA (Sections 11, 12, 13) */}
      <div className="lg:col-span-5 flex flex-col md:flex-row">
        {/* Vertical Black Strip */}
        <div className="bg-[#070908] border-b md:border-b-0 md:border-r border-[#232B28] px-3 py-2 md:py-0 md:w-9 flex items-center justify-between md:justify-center shrink-0 select-none">
          <span className="font-mono-tabular text-[11px] font-semibold tracking-[0.2em] text-[#A5B0AC] md:[writing-mode:vertical-rl] md:rotate-180">
            PSYCHOLOGICAL DATA
          </span>
          <span className="md:hidden font-mono-tabular text-[10px] text-[#68736E]">
            SEC 11–13
          </span>
        </div>

        <div className="flex-1 flex flex-col divide-y divide-[#232B28]">
          {/* 11. BONDS */}
          <div>
            <div className="flex items-center justify-between bg-[#0B0E0D] border-b border-[#232B28] px-3 py-2 font-mono-tabular text-[11px] font-semibold text-[#8C9692]">
              <span>11. BONDS</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleAddBond}
                  className="inline-flex items-center gap-1 text-[11px] text-[#4ADE80] hover:text-[#86EFAC] transition-colors cursor-pointer"
                >
                  <Plus size={12} />
                  <span>Add Bond</span>
                </button>
                <span>SCORE</span>
              </div>
            </div>

            <div className="divide-y divide-[#232B28]">
              {agent.bonds.length === 0 ? (
                <div className="p-4 text-center text-xs text-[#68736E]">
                  No active Bonds recorded. Click "+ Add Bond" to establish personal anchors (Initial Score = CHA).
                </div>
              ) : (
                agent.bonds.map((bond) => (
                  <div
                    key={bond.id}
                    className="flex items-center gap-2 px-3 py-2.5 hover:bg-[#161C1A] transition-colors"
                  >
                    <input
                      type="text"
                      value={bond.name}
                      onChange={(e) => handleBondChange(bond.id, 'name', e.target.value)}
                      placeholder="Person or group (e.g., Spouse, Partner, Child)..."
                      className="flex-1 min-w-0 bg-[#0B0E0D] border border-[#232B28] focus:border-[#16A34A] rounded px-2.5 py-1.5 text-xs text-[#E2E6E4] focus:outline-none"
                    />
                    <NumericSteppedInput
                      value={bond.score}
                      onChange={(val) => handleBondChange(bond.id, 'score', val)}
                      min={0}
                      max={25}
                      size="sm"
                      ariaLabel={`Bond score for ${bond.name || 'bond'}`}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveBond(bond.id)}
                      aria-label="Remove bond"
                      className="p-1 text-[#68736E] hover:text-[#F87171] transition-colors cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 12. MOTIVATIONS AND MENTAL DISORDERS */}
          <div className="p-3 flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block font-mono-tabular text-[11px] font-semibold text-[#8C9692]">
                12. MOTIVATIONS AND MENTAL DISORDERS
              </label>
              <span className="font-mono-tabular text-[10px] text-[#68736E]">
                Up to 5 Motivations · Disorders at BP
              </span>
            </div>
            <textarea
              rows={6}
              value={agent.motivationsAndDisorders}
              onChange={(e) =>
                onUpdate((prev) => ({
                  ...prev,
                  motivationsAndDisorders: e.target.value,
                  updatedAt: new Date().toISOString(),
                }))
              }
              placeholder="List up to 5 personal motivations. When a Breaking Point is reached, replace a motivation with a new Mental Disorder (e.g., PTSD, Paranoia, Depression, Fugue, Obsession, Addiction)..."
              className="w-full flex-1 bg-[#0B0E0D] border border-[#232B28] focus:border-[#16A34A] rounded px-2.5 py-2 text-xs leading-relaxed text-[#E2E6E4] focus:outline-none transition-colors resize-y"
            />
          </div>

          {/* 13. INCIDENTS OF SAN LOSS WITHOUT GOING INSANE */}
          <div className="p-3 bg-[#0E1311]">
            <div className="font-mono-tabular text-[11px] font-semibold text-[#8C9692] mb-2.5">
              13. INCIDENTS OF SAN LOSS WITHOUT GOING INSANE
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Violence Adaptation */}
              <div className="flex items-center justify-between bg-[#0B0E0D] border border-[#232B28] rounded px-3 py-2">
                <span className="text-xs font-medium text-[#E2E6E4]">Violence</span>
                <div className="flex items-center gap-2">
                  {[0, 1, 2].map((idx) => (
                    <input
                      key={idx}
                      type="checkbox"
                      checked={agent.adaptation.violence[idx as 0 | 1 | 2]}
                      onChange={() => handleAdaptationCheck('violence', idx as 0 | 1 | 2)}
                      aria-label={`Violence incident ${idx + 1}`}
                      className="w-4 h-4 accent-[#D97706] rounded cursor-pointer"
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => toggleAdaptedStatus('violenceAdapted')}
                    className={`ml-1 text-[11px] font-mono-tabular px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                      agent.adaptation.violenceAdapted
                        ? 'border-[#D97706] bg-[#D97706]/20 text-[#FBBF24] font-semibold'
                        : 'border-[#232B28] text-[#68736E] hover:text-[#A5B0AC]'
                    }`}
                  >
                    adapted
                  </button>
                </div>
              </div>

              {/* Helplessness Adaptation */}
              <div className="flex items-center justify-between bg-[#0B0E0D] border border-[#232B28] rounded px-3 py-2">
                <span className="text-xs font-medium text-[#E2E6E4]">Helplessness</span>
                <div className="flex items-center gap-2">
                  {[0, 1, 2].map((idx) => (
                    <input
                      key={idx}
                      type="checkbox"
                      checked={agent.adaptation.helplessness[idx as 0 | 1 | 2]}
                      onChange={() => handleAdaptationCheck('helplessness', idx as 0 | 1 | 2)}
                      aria-label={`Helplessness incident ${idx + 1}`}
                      className="w-4 h-4 accent-[#D97706] rounded cursor-pointer"
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => toggleAdaptedStatus('helplessnessAdapted')}
                    className={`ml-1 text-[11px] font-mono-tabular px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                      agent.adaptation.helplessnessAdapted
                        ? 'border-[#D97706] bg-[#D97706]/20 text-[#FBBF24] font-semibold'
                        : 'border-[#232B28] text-[#68736E] hover:text-[#A5B0AC]'
                    }`}
                  >
                    adapted
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
