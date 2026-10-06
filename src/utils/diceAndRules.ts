import { AgentCharacter } from '../types/deltaGreen';

export function recalculateDerivedMax(agent: AgentCharacter): AgentCharacter {
  if (!agent.derived.autoCalculateMax) return agent;

  const str = agent.statistics.STR.score;
  const con = agent.statistics.CON.score;
  const pow = agent.statistics.POW.score;
  const unnaturalSkill = agent.skills.find((s) => s.isUnnatural)?.value ?? 0;

  const maxHp = Math.ceil((str + con) / 2);
  const maxWp = pow;
  const maxSan = Math.max(0, 99 - unnaturalSkill);

  return {
    ...agent,
    derived: {
      ...agent.derived,
      hp: {
        max: maxHp,
        current: Math.min(agent.derived.hp.current, maxHp),
      },
      wp: {
        max: maxWp,
        current: Math.min(agent.derived.wp.current, maxWp),
      },
      san: {
        max: maxSan,
        current: Math.min(agent.derived.san.current, maxSan),
      },
    },
  };
}
