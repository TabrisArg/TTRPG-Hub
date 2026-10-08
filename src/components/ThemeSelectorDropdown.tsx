import React, { useEffect, useState } from 'react';
import { Palette, Maximize2, Minimize2 } from 'lucide-react';
import { VisualTheme } from '../types/deltaGreen';
import { VISUAL_THEMES } from '../utils/themes';

interface ThemeSelectorDropdownProps {
  theme: VisualTheme;
  onChangeTheme: (theme: VisualTheme) => void;
}

interface VendorFullscreenDocument extends Document {
  webkitFullscreenElement?: Element | null;
  mozFullScreenElement?: Element | null;
  msFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
  mozCancelFullScreen?: () => Promise<void> | void;
  msExitFullscreen?: () => Promise<void> | void;
}

interface VendorFullscreenElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void> | void;
  mozRequestFullScreen?: () => Promise<void> | void;
  msRequestFullscreen?: () => Promise<void> | void;
}

function getBrowserFullscreenElement(): Element | null {
  const doc = document as VendorFullscreenDocument;
  return (
    doc.fullscreenElement ||
    doc.webkitFullscreenElement ||
    doc.mozFullScreenElement ||
    doc.msFullscreenElement ||
    null
  );
}

export const ThemeSelectorDropdown: React.FC<ThemeSelectorDropdownProps> = ({
  theme,
  onChangeTheme,
}) => {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => {
    if (typeof document === 'undefined') return false;
    return (
      Boolean(getBrowserFullscreenElement()) ||
      document.documentElement.getAttribute('data-app-fullscreen') === 'true'
    );
  });

  useEffect(() => {
    const syncFullscreenState = () => {
      const browserFs = Boolean(getBrowserFullscreenElement());
      setIsFullscreen(browserFs);
      if (browserFs) {
        document.documentElement.setAttribute('data-app-fullscreen', 'true');
      } else {
        document.documentElement.removeAttribute('data-app-fullscreen');
      }
    };

    document.addEventListener('fullscreenchange', syncFullscreenState);
    document.addEventListener('webkitfullscreenchange', syncFullscreenState);
    document.addEventListener('mozfullscreenchange', syncFullscreenState);
    document.addEventListener('MSFullscreenChange', syncFullscreenState);

    return () => {
      document.removeEventListener('fullscreenchange', syncFullscreenState);
      document.removeEventListener('webkitfullscreenchange', syncFullscreenState);
      document.removeEventListener('mozfullscreenchange', syncFullscreenState);
      document.removeEventListener('MSFullscreenChange', syncFullscreenState);
    };
  }, []);

  const handleToggleFullscreen = async () => {
    const doc = document as VendorFullscreenDocument;
    const rootEl = document.documentElement as VendorFullscreenElement;

    const currentlyBrowserFs = Boolean(getBrowserFullscreenElement());
    const currentlyAppFs =
      rootEl.getAttribute('data-app-fullscreen') === 'true' || isFullscreen;

    if (currentlyBrowserFs || currentlyAppFs) {
      // Exit Full Screen back into normal browser view
      rootEl.removeAttribute('data-app-fullscreen');
      setIsFullscreen(false);
      try {
        if (currentlyBrowserFs) {
          if (doc.exitFullscreen) {
            await doc.exitFullscreen();
          } else if (doc.webkitExitFullscreen) {
            await doc.webkitExitFullscreen();
          } else if (doc.mozCancelFullScreen) {
            await doc.mozCancelFullScreen();
          } else if (doc.msExitFullscreen) {
            await doc.msExitFullscreen();
          }
        }
      } catch {
        // Fallback state already cleared above
      }
      return;
    }

    // Enter Full Screen mode (native app view)
    rootEl.setAttribute('data-app-fullscreen', 'true');
    setIsFullscreen(true);
    try {
      if (rootEl.requestFullscreen) {
        await rootEl.requestFullscreen({ navigationUI: 'hide' });
      } else if (rootEl.webkitRequestFullscreen) {
        await rootEl.webkitRequestFullscreen();
      } else if (rootEl.mozRequestFullScreen) {
        await rootEl.mozRequestFullScreen();
      } else if (rootEl.msRequestFullscreen) {
        await rootEl.msRequestFullscreen();
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch {
      // Keep data-app-fullscreen immersive mode active even if browser blocks native Fullscreen API
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={handleToggleFullscreen}
        aria-pressed={isFullscreen}
        title={
          isFullscreen
            ? 'Exit Full Screen and return to browser view'
            : 'Enter Full Screen app mode'
        }
        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono-tabular font-medium rounded border transition-colors whitespace-nowrap cursor-pointer ${
          isFullscreen
            ? 'bg-[#16A34A] hover:bg-[#15803D] text-white border-[#16A34A]'
            : 'bg-[#121715] hover:bg-[#19201E] text-[#E2E6E4] border-[#232B28] hover:border-[#16A34A]'
        }`}
      >
        {isFullscreen ? (
          <>
            <Minimize2 size={13} className="shrink-0" />
            <span className="hidden sm:inline">Browser View</span>
          </>
        ) : (
          <>
            <Maximize2 size={13} className="text-[#4ADE80] shrink-0" />
            <span className="hidden sm:inline">Full Screen</span>
          </>
        )}
      </button>

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
            <option
              key={t.id}
              value={t.id}
              className="bg-[#121715] text-[#E2E6E4]"
            >
              {t.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-2 text-[10px] text-[#8C9692]">
          ▾
        </span>
      </div>
    </div>
  );
};
