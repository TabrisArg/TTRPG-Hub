import React from 'react';
import { Palette } from 'lucide-react';
import { VisualTheme } from '../types/deltaGreen';
import { VISUAL_THEMES } from '../utils/themes';

interface ThemeSelectorDropdownProps {
  theme: VisualTheme;
  onChangeTheme: (theme: VisualTheme) => void;
}

export const ThemeSelectorDropdown: React.FC<ThemeSelectorDropdownProps> = ({
  theme,
  onChangeTheme,
}) => {
  return (
    <div className="relative inline-flex items-center">
      <Palette
        size={13}
        className="pointer-events-none absolute left-2.5 text-[#4ADE80]"
      />
      <select
        value={theme}
        onChange={(e) => onChangeTheme(e.target.value as VisualTheme)}
        aria-label="Select Visual Style"
        title="Switch visual theme (Default Light, Default Dark, Delta Green, D&D, Call of Cthulhu, Paranoia, Warhammer 40k)"
        className="pl-7 pr-6 py-1.5 text-xs font-medium bg-[#121715] hover:bg-[#19201E] text-[#E2E6E4] border border-[#232B28] focus:border-[#16A34A] rounded transition-colors cursor-pointer focus:outline-none appearance-none"
      >
        {VISUAL_THEMES.map((t) => (
          <option key={t.id} value={t.id} className="bg-[#121715] text-[#E2E6E4]">
            {t.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-2 text-[10px] text-[#8C9692]">
        ▾
      </span>
    </div>
  );
};
