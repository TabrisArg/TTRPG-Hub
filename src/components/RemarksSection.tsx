import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { AgentCharacter } from '../types/deltaGreen';

interface RemarksSectionProps {
  agent: AgentCharacter;
  onUpdate: (updater: (prev: AgentCharacter) => AgentCharacter) => void;
}

export const RemarksSection: React.FC<RemarksSectionProps> = ({
  agent,
  onUpdate,
}) => {
  const handleSpecialTrainingChange = (
    id: string,
    field: 'name' | 'skillOrStatUsed',
    value: string
  ) => {
    onUpdate((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      specialTraining: prev.specialTraining.map((st) =>
        st.id === id ? { ...st, [field]: value } : st
      ),
    }));
  };

  const handleAddSpecialTraining = () => {
    onUpdate((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      specialTraining: [
        ...prev.specialTraining,
        { id: `st-${Date.now()}`, name: '', skillOrStatUsed: '' },
      ],
    }));
  };

  const handleRemoveSpecialTraining = (id: string) => {
    onUpdate((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      specialTraining: prev.specialTraining.filter((st) => st.id !== id),
    }));
  };

  return (
    <div className="space-y-4">
      {/* SECTION 17–21: REMARKS & SIGNATURES */}
      <section
        id="section-remarks"
        className="border border-[#232B28] bg-[#121715] flex flex-col md:flex-row"
      >
        <div className="bg-[#070908] border-b md:border-b-0 md:border-r border-[#232B28] px-3 py-2 md:py-0 md:w-9 flex items-center justify-between md:justify-center shrink-0 select-none">
          <span className="font-mono-tabular text-[11px] font-semibold tracking-[0.2em] text-[#A5B0AC] md:[writing-mode:vertical-rl] md:rotate-180">
            REMARKS
          </span>
          <span className="md:hidden font-mono-tabular text-[10px] text-[#68736E]">
            SEC 17–21 // DOSSIER NOTES
          </span>
        </div>

        <div className="flex-1 flex flex-col divide-y divide-[#232B28]">
          <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#232B28]">
            {/* 17. PERSONAL DETAILS AND NOTES */}
            <div className="lg:col-span-6 p-3 sm:p-4 flex flex-col">
              <label className="block font-mono-tabular text-[11px] font-semibold text-[#8C9692] mb-1.5">
                17. PERSONAL DETAILS AND NOTES
              </label>
              <textarea
                rows={10}
                value={agent.personalDetailsAndNotes}
                onChange={(e) =>
                  onUpdate((prev) => ({
                    ...prev,
                    personalDetailsAndNotes: e.target.value,
                    updatedAt: new Date().toISOString(),
                  }))
                }
                placeholder="Operational case notes, Green Box locations, cell contacts, cover identities, anomalies encountered..."
                className="w-full flex-1 bg-[#0B0E0D] border border-[#232B28] focus:border-[#16A34A] rounded px-3 py-2 text-xs sm:text-sm leading-relaxed text-[#E2E6E4] focus:outline-none resize-y"
              />
            </div>

            {/* RIGHT COLUMN: 18. DEVELOPMENTS + 19. SPECIAL TRAINING */}
            <div className="lg:col-span-6 flex flex-col divide-y divide-[#232B28]">
              {/* 18. DEVELOPMENTS WHICH AFFECT HOME AND FAMILY */}
              <div className="p-3 sm:p-4">
                <label className="block font-mono-tabular text-[11px] font-semibold text-[#8C9692] mb-1.5">
                  18. DEVELOPMENTS WHICH AFFECT HOME AND FAMILY
                </label>
                <textarea
                  rows={5}
                  value={agent.developmentsHomeAndFamily}
                  onChange={(e) =>
                    onUpdate((prev) => ({
                      ...prev,
                      developmentsHomeAndFamily: e.target.value,
                      updatedAt: new Date().toISOString(),
                    }))
                  }
                  placeholder="Outcomes of Home vignettes, damaged Bonds, family crises, disciplinary inquiries..."
                  className="w-full bg-[#0B0E0D] border border-[#232B28] focus:border-[#16A34A] rounded px-3 py-2 text-xs sm:text-sm leading-relaxed text-[#E2E6E4] focus:outline-none resize-y"
                />
              </div>

              {/* 19. SPECIAL TRAINING */}
              <div className="flex-1 flex flex-col">
                <div className="bg-[#0B0E0D] border-b border-[#232B28] px-3 py-2.5 grid grid-cols-12 items-center font-mono-tabular text-[11px] font-semibold text-[#8C9692]">
                  <div className="col-span-7">19. SPECIAL TRAINING</div>
                  <div className="col-span-5 flex items-center justify-between">
                    <span>SKILL OR STAT USED</span>
                    <button
                      type="button"
                      onClick={handleAddSpecialTraining}
                      className="inline-flex items-center gap-0.5 text-[10px] text-[#4ADE80] hover:text-[#86EFAC] cursor-pointer"
                    >
                      <Plus size={12} />
                      <span>Add</span>
                    </button>
                  </div>
                </div>

                <div className="divide-y divide-[#232B28]">
                  {agent.specialTraining.map((st) => (
                    <div
                      key={st.id}
                      className="grid grid-cols-12 items-center gap-2 px-3 py-2 hover:bg-[#161C1A]"
                    >
                      <div className="col-span-7">
                        <input
                          type="text"
                          value={st.name}
                          onChange={(e) =>
                            handleSpecialTrainingChange(st.id, 'name', e.target.value)
                          }
                          placeholder="e.g., Lockpicking, Parachuting, SCUBA, Hazmat..."
                          className="w-full bg-[#0B0E0D] border border-[#232B28] focus:border-[#16A34A] rounded px-2.5 py-1.5 text-xs text-[#E2E6E4] focus:outline-none"
                        />
                      </div>
                      <div className="col-span-5 flex items-center gap-1.5">
                        <input
                          type="text"
                          value={st.skillOrStatUsed}
                          onChange={(e) =>
                            handleSpecialTrainingChange(
                              st.id,
                              'skillOrStatUsed',
                              e.target.value
                            )
                          }
                          placeholder="DEX×5 / Swim / Craft"
                          className="w-full bg-[#0B0E0D] border border-[#232B28] focus:border-[#16A34A] rounded px-2.5 py-1.5 text-xs font-mono-tabular text-[#E2E6E4] focus:outline-none"
                        />
                        {agent.specialTraining.length > 2 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSpecialTraining(st.id)}
                            className="p-1 text-[#68736E] hover:text-[#F87171] cursor-pointer"
                            aria-label="Remove special training row"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Recruitment Reason Prompt */}
          <div className="p-3 sm:p-4 bg-[#0E1311]">
            <label className="block text-center text-xs italic text-[#8C9692] mb-2">
              Please indicate why this agent was recruited and why the agent agreed to be recruited.
            </label>
            <input
              type="text"
              value={agent.recruitmentNote}
              onChange={(e) =>
                onUpdate((prev) => ({
                  ...prev,
                  recruitmentNote: e.target.value,
                  updatedAt: new Date().toISOString(),
                }))
              }
              placeholder="Incident summary & recruitment authorization rationale..."
              className="w-full bg-[#0B0E0D] border border-[#232B28] focus:border-[#16A34A] rounded px-3 py-2 text-xs sm:text-sm text-center text-[#E2E6E4] focus:outline-none"
            />
          </div>

          {/* 20. AUTHORIZING OFFICER & 21. AGENT SIGNATURE */}
          <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-[#232B28]">
            <div className="p-3 sm:p-4">
              <label className="block font-mono-tabular text-[11px] font-semibold text-[#8C9692] mb-1.5">
                20. AUTHORIZING OFFICER
              </label>
              <input
                type="text"
                value={agent.authorizingOfficer}
                onChange={(e) =>
                  onUpdate((prev) => ({
                    ...prev,
                    authorizingOfficer: e.target.value,
                    updatedAt: new Date().toISOString(),
                  }))
                }
                placeholder="CASE OFFICER // HANDLER DESIGNATION"
                className="w-full bg-[#0B0E0D] border border-[#232B28] focus:border-[#16A34A] rounded px-3 py-2 text-xs sm:text-sm font-mono-tabular text-[#E2E6E4] focus:outline-none"
              />
            </div>

            <div className="p-3 sm:p-4">
              <label className="block font-mono-tabular text-[11px] font-semibold text-[#8C9692] mb-1.5">
                21. AGENT SIGNATURE
              </label>
              <input
                type="text"
                value={agent.agentSignature}
                onChange={(e) =>
                  onUpdate((prev) => ({
                    ...prev,
                    agentSignature: e.target.value,
                    updatedAt: new Date().toISOString(),
                  }))
                }
                placeholder="AGENT DIGITAL SIGNATURE // CRYPTOGRAPHIC HASH"
                className="w-full bg-[#0B0E0D] border border-[#232B28] focus:border-[#16A34A] rounded px-3 py-2 text-xs sm:text-sm font-mono-tabular italic text-[#4ADE80] focus:outline-none"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Official DD Form 315 Footer */}
      <footer className="px-4 py-3 border border-[#232B28] bg-[#0B0E0D] flex flex-col sm:flex-row items-center justify-between gap-2 text-[#8C9692]">
        <div className="flex items-center gap-3">
          <span className="font-display text-lg font-extrabold tracking-tight text-[#E2E6E4]">
            DD
          </span>
          <div className="text-[10px] font-mono-tabular leading-tight text-center">
            <div>UNITED STATES</div>
            <div>FORM</div>
          </div>
          <span className="font-mono-tabular text-lg font-bold text-[#E2E6E4]">315</span>
        </div>

        <div className="text-center font-mono-tabular text-[11px] tracking-wider text-[#A5B0AC]">
          <div>TOP SECRET//ORCON//SPECIAL ACCESS REQUIRED-DELTA GREEN</div>
          <div className="text-[10px] text-[#68736E]">AGENT DOCUMENTATION SHEET</div>
        </div>

        <div className="font-mono-tabular text-base font-bold tracking-widest text-[#E2E6E4]">
          112382
        </div>
      </footer>
    </div>
  );
};
