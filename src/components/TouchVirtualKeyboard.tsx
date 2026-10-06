import React, { useEffect, useState } from 'react';
import {
  Delete,
  CornerDownLeft,
  Check,
  Keyboard,
  ChevronDown,
  PenTool,
  Hash,
  Type,
} from 'lucide-react';

function setReactInputValue(
  el: HTMLInputElement | HTMLTextAreaElement,
  nextValue: string
) {
  const proto =
    el instanceof HTMLTextAreaElement
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
  const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  if (nativeSetter) {
    nativeSetter.call(el, nextValue);
  } else {
    el.value = nextValue;
  }
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

function isEditableTextOrNumber(
  el: Element | null
): el is HTMLInputElement | HTMLTextAreaElement {
  if (!el) return false;
  if (el instanceof HTMLTextAreaElement) {
    return !el.disabled && !el.readOnly;
  }
  if (el instanceof HTMLInputElement) {
    if (el.disabled || el.readOnly) return false;
    const ignoredTypes = new Set([
      'checkbox',
      'radio',
      'button',
      'submit',
      'reset',
      'file',
      'range',
      'color',
      'date',
      'time',
      'datetime-local',
      'month',
      'week',
      'hidden',
    ]);
    return !ignoredTypes.has(el.type);
  }
  return false;
}

function isNumericInput(el: HTMLInputElement | HTMLTextAreaElement): boolean {
  if (el instanceof HTMLTextAreaElement) return false;
  return (
    el.type === 'number' ||
    el.inputMode === 'numeric' ||
    el.inputMode === 'decimal' ||
    el.getAttribute('inputmode') === 'numeric' ||
    el.getAttribute('data-numpad') === 'true'
  );
}

const QWERTY_ROWS = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm', '-', '.', '/'],
];

const SYMBOL_ROWS = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['@', '#', '$', '%', '&', '*', '(', ')', '_', '+'],
  ['!', '"', "'", ':', ';', '/', '?', ',', '.', '-'],
  ['[', ']', '{', '}', '<', '>', '=', '|', '\\', '~'],
];

export const TouchVirtualKeyboard: React.FC = () => {
  const [activeEl, setActiveEl] = useState<
    HTMLInputElement | HTMLTextAreaElement | null
  >(null);
  const [isNumeric, setIsNumeric] = useState(false);
  const [isShift, setIsShift] = useState(false);
  const [isSymbols, setIsSymbols] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [inputSource, setInputSource] = useState<'touch' | 'pen' | 'mouse'>('touch');
  const [replaceOnNextDigit, setReplaceOnNextDigit] = useState(false);
  const [, setRenderTick] = useState(0);

  useEffect(() => {
    const activateEditable = (
      editable: HTMLInputElement | HTMLTextAreaElement,
      source: 'touch' | 'pen' | 'mouse'
    ) => {
      const numeric = isNumericInput(editable);
      editable.setAttribute('inputmode', numeric ? 'numeric' : 'text');
      setActiveEl(editable);
      setIsNumeric(numeric);
      setIsSymbols(false);
      setReplaceOnNextDigit(numeric);

      // Whenever tapped with a finger ('touch') or on any numeric field (e.g., Age),
      // always pop open the virtual keyboard / numpad immediately.
      if (source === 'touch' || numeric) {
        setIsMinimized(false);
      }

      setTimeout(() => {
        try {
          editable.scrollIntoView({ block: 'center', behavior: 'smooth' });
        } catch {
          // ignore
        }
      }, 60);
    };

    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-virtual-keyboard="true"]')) {
        return;
      }

      const detectedSource: 'touch' | 'pen' | 'mouse' =
        e.pointerType === 'pen'
          ? 'pen'
          : e.pointerType === 'touch'
          ? 'touch'
          : 'mouse';
      setInputSource(detectedSource);

      const editable = target?.closest('input, textarea') as
        | HTMLInputElement
        | HTMLTextAreaElement
        | null;

      if (editable && isEditableTextOrNumber(editable)) {
        // Ensure the element receives focus even if iPadOS had Apple Pencil Scribble active
        if (document.activeElement !== editable) {
          editable.focus();
        }
        activateEditable(editable, detectedSource);
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-virtual-keyboard="true"]')) {
        return;
      }

      const firstTouch = e.touches[0] as (Touch & { touchType?: string }) | undefined;
      const isStylus = firstTouch?.touchType === 'stylus';
      const detectedSource: 'touch' | 'pen' = isStylus ? 'pen' : 'touch';
      setInputSource(detectedSource);

      const editable = target?.closest('input, textarea') as
        | HTMLInputElement
        | HTMLTextAreaElement
        | null;

      if (editable && isEditableTextOrNumber(editable)) {
        if (detectedSource === 'touch' || isNumericInput(editable)) {
          setIsMinimized(false);
        }
        activateEditable(editable, detectedSource);
      }
    };

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as Element | null;
      if (isEditableTextOrNumber(target)) {
        const numeric = isNumericInput(target);
        setActiveEl(target);
        setIsNumeric(numeric);
        setReplaceOnNextDigit(numeric);
        if (numeric) {
          setIsMinimized(false);
        }
      } else {
        setActiveEl(null);
      }
    };

    const handleFocusOut = () => {
      setTimeout(() => {
        const current = document.activeElement;
        if (isEditableTextOrNumber(current)) {
          setActiveEl(current);
          setIsNumeric(isNumericInput(current));
        } else {
          setActiveEl(null);
        }
      }, 100);
    };

    const handleInput = () => {
      setRenderTick((t) => t + 1);
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('touchstart', handleTouchStart, {
      passive: true,
      capture: true,
    });
    document.addEventListener('focusin', handleFocusIn, true);
    document.addEventListener('focusout', handleFocusOut, true);
    document.addEventListener('input', handleInput, true);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('touchstart', handleTouchStart, true);
      document.removeEventListener('focusin', handleFocusIn, true);
      document.removeEventListener('focusout', handleFocusOut, true);
      document.removeEventListener('input', handleInput, true);
    };
  }, []);

  // Add bottom padding to body while the virtual keyboard is open so bottom fields can scroll above it
  useEffect(() => {
    if (activeEl && !isMinimized) {
      document.body.style.paddingBottom = '280px';
    } else {
      document.body.style.paddingBottom = '';
    }
    return () => {
      document.body.style.paddingBottom = '';
    };
  }, [activeEl, isMinimized]);

  if (!activeEl) {
    return null;
  }

  const insertText = (char: string) => {
    if (!activeEl) return;
    if (document.activeElement !== activeEl) {
      activeEl.focus();
    }
    const currentVal = activeEl.value || '';

    if (isNumeric) {
      const baseVal = replaceOnNextDigit ? '' : currentVal;
      const maxLen =
        activeEl instanceof HTMLInputElement && activeEl.maxLength > 0
          ? activeEl.maxLength
          : 6;
      const nextVal = (baseVal + char).replace(/[^\d-]/g, '').slice(0, maxLen);
      setReplaceOnNextDigit(false);
      setReactInputValue(activeEl, nextVal);
      setRenderTick((t) => t + 1);
      return;
    }

    const start =
      typeof activeEl.selectionStart === 'number'
        ? activeEl.selectionStart
        : currentVal.length;
    const end =
      typeof activeEl.selectionEnd === 'number'
        ? activeEl.selectionEnd
        : currentVal.length;

    const nextVal = currentVal.slice(0, start) + char + currentVal.slice(end);
    setReactInputValue(activeEl, nextVal);
    setRenderTick((t) => t + 1);

    requestAnimationFrame(() => {
      try {
        activeEl.setSelectionRange(start + char.length, start + char.length);
      } catch {
        // ignore if input type doesn't support selection range
      }
    });

    if (isShift) {
      setIsShift(false);
    }
  };

  const handleBackspace = () => {
    if (!activeEl) return;
    if (document.activeElement !== activeEl) {
      activeEl.focus();
    }
    const currentVal = activeEl.value || '';
    if (!currentVal) return;

    if (isNumeric) {
      if (replaceOnNextDigit) {
        setReplaceOnNextDigit(false);
        setReactInputValue(activeEl, '');
        setRenderTick((t) => t + 1);
        return;
      }
      setReactInputValue(activeEl, currentVal.slice(0, -1));
      setRenderTick((t) => t + 1);
      return;
    }

    const start =
      typeof activeEl.selectionStart === 'number'
        ? activeEl.selectionStart
        : currentVal.length;
    const end =
      typeof activeEl.selectionEnd === 'number'
        ? activeEl.selectionEnd
        : currentVal.length;

    if (start !== end) {
      const nextVal = currentVal.slice(0, start) + currentVal.slice(end);
      setReactInputValue(activeEl, nextVal);
      setRenderTick((t) => t + 1);
      requestAnimationFrame(() => {
        try {
          activeEl.setSelectionRange(start, start);
        } catch {
          // ignore
        }
      });
    } else if (start > 0) {
      const nextVal = currentVal.slice(0, start - 1) + currentVal.slice(end);
      setReactInputValue(activeEl, nextVal);
      setRenderTick((t) => t + 1);
      requestAnimationFrame(() => {
        try {
          activeEl.setSelectionRange(start - 1, start - 1);
        } catch {
          // ignore
        }
      });
    }
  };

  const handleClear = () => {
    if (!activeEl) return;
    if (document.activeElement !== activeEl) {
      activeEl.focus();
    }
    setReplaceOnNextDigit(false);
    setReactInputValue(activeEl, '');
    setRenderTick((t) => t + 1);
  };

  const handleDone = () => {
    if (!activeEl) return;
    activeEl.blur();
    setActiveEl(null);
  };

  const fieldLabel =
    activeEl.getAttribute('aria-label') ||
    activeEl.getAttribute('placeholder') ||
    'TEXT INPUT';

  // Minimized pill (e.g. when user switched to Apple Pencil handwriting or minimized keyboard)
  if (isMinimized) {
    return (
      <div
        data-virtual-keyboard="true"
        onPointerDown={(e) => e.preventDefault()}
        className="fixed bottom-3 right-3 z-50 flex items-center gap-2"
      >
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setInputSource('touch');
            setIsMinimized(false);
          }}
          className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-mono-tabular font-semibold shadow-xl cursor-pointer"
        >
          <Keyboard size={15} />
          <span>{isNumeric ? 'Open Touch Numpad' : 'Open Touch Keyboard'}</span>
        </button>
      </div>
    );
  }

  // Dedicated Numpad View (for Age, Stats, HP/WP/SAN, Skills, or when 123 Numpad is toggled)
  if (isNumeric) {
    return (
      <div
        data-virtual-keyboard="true"
        onPointerDown={(e) => e.preventDefault()}
        className="fixed inset-x-0 bottom-0 z-50 flex justify-center p-2 sm:p-3 pointer-events-none"
      >
        <div className="pointer-events-auto w-full max-w-sm bg-[#0B0E0D] border-2 border-[#16A34A] rounded-lg shadow-2xl p-3 space-y-2.5">
          <div className="flex items-center justify-between gap-2 border-b border-[#232B28] pb-2">
            <div className="min-w-0">
              <span className="block font-mono-tabular text-[11px] font-semibold text-[#4ADE80] truncate">
                TOUCH NUMPAD // {fieldLabel.toUpperCase()}
              </span>
              <span className="block text-[10px] font-mono-tabular text-[#8C9692]">
                {inputSource === 'pen'
                  ? 'Apple Pencil & Finger Touch Ready'
                  : 'Finger Touch & Apple Pencil Ready'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="px-2.5 py-1 rounded bg-[#121715] border border-[#232B28] font-mono-tabular text-sm font-bold text-[#E2E6E4]">
                {activeEl.value || '0'}
              </span>
              {!isNumericInput(activeEl) && (
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsNumeric(false);
                  }}
                  title="Switch to ABC Keyboard"
                  className="px-2 py-1 rounded bg-[#121715] border border-[#232B28] text-[11px] font-mono-tabular text-[#4ADE80] cursor-pointer"
                >
                  ABC
                </button>
              )}
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsMinimized(true);
                }}
                title="Switch to Apple Pencil / Minimize"
                className="p-1.5 rounded bg-[#121715] border border-[#232B28] text-[#A5B0AC] hover:text-[#E2E6E4] cursor-pointer"
              >
                <ChevronDown size={14} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  insertText(digit);
                }}
                className="h-12 rounded bg-[#121715] hover:bg-[#19201E] active:bg-[#16A34A] active:text-white border border-[#232B28] font-mono-tabular text-lg font-bold text-[#E2E6E4] transition-colors cursor-pointer select-none"
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleClear();
              }}
              className="h-12 rounded bg-[#121715] hover:bg-[#19201E] border border-[#232B28] font-mono-tabular text-xs font-semibold text-[#F87171] cursor-pointer select-none"
            >
              CLR
            </button>
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                insertText('0');
              }}
              className="h-12 rounded bg-[#121715] hover:bg-[#19201E] active:bg-[#16A34A] active:text-white border border-[#232B28] font-mono-tabular text-lg font-bold text-[#E2E6E4] transition-colors cursor-pointer select-none"
            >
              0
            </button>
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleBackspace();
              }}
              aria-label="Backspace"
              className="h-12 rounded bg-[#121715] hover:bg-[#19201E] border border-[#232B28] flex items-center justify-center text-[#A5B0AC] hover:text-[#E2E6E4] cursor-pointer select-none"
            >
              <Delete size={18} />
            </button>
          </div>

          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleDone();
            }}
            className="w-full h-10 rounded bg-[#16A34A] hover:bg-[#15803D] text-white font-mono-tabular text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer select-none"
          >
            <Check size={14} />
            <span>Done</span>
          </button>
        </div>
      </div>
    );
  }

  const activeRows = isSymbols ? SYMBOL_ROWS : QWERTY_ROWS;

  return (
    <div
      data-virtual-keyboard="true"
      onPointerDown={(e) => e.preventDefault()}
      className="fixed inset-x-0 bottom-0 z-50 bg-[#0B0E0D]/95 backdrop-blur-md border-t-2 border-[#16A34A] p-2 sm:p-3 shadow-2xl select-none"
    >
      <div className="max-w-4xl mx-auto space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-[#232B28]">
          <div className="flex items-center gap-2 min-w-0">
            <Keyboard size={15} className="text-[#4ADE80] shrink-0" />
            <span className="font-mono-tabular text-[11px] font-semibold text-[#4ADE80] truncate">
              TOUCH VIRTUAL KEYBOARD // {fieldLabel.toUpperCase()}
            </span>
            <span className="hidden sm:inline-block px-2 py-0.5 rounded bg-[#121715] border border-[#232B28] text-xs font-mono-tabular text-[#E2E6E4] truncate max-w-[260px]">
              {activeEl.value || 'Type or use Apple Pencil...'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsNumeric(true);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#121715] border border-[#232B28] text-[11px] font-mono-tabular text-[#4ADE80] hover:bg-[#19201E] cursor-pointer"
            >
              <Hash size={12} />
              <span>Numpad</span>
            </button>
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleClear();
              }}
              className="px-2.5 py-1 rounded bg-[#121715] border border-[#232B28] text-[11px] font-mono-tabular text-[#F87171] cursor-pointer"
            >
              Clear
            </button>
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsMinimized(true);
              }}
              title="Minimize keyboard for Apple Pencil handwriting"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#121715] border border-[#232B28] text-[11px] font-mono-tabular text-[#A5B0AC] hover:text-[#E2E6E4] cursor-pointer"
            >
              <PenTool size={11} />
              <span>Pencil / Hide</span>
            </button>
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleDone();
              }}
              className="inline-flex items-center gap-1 px-3 py-1 rounded bg-[#16A34A] hover:bg-[#15803D] text-white text-[11px] font-mono-tabular font-semibold cursor-pointer"
            >
              <Check size={12} />
              <span>Done</span>
            </button>
          </div>
        </div>

        {activeRows.map((row, rowIdx) => (
          <div key={rowIdx} className="flex justify-center gap-1 sm:gap-1.5">
            {rowIdx === 3 && !isSymbols && (
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsShift((v) => !v);
                }}
                className={`px-2.5 sm:px-3.5 h-11 rounded border font-mono-tabular text-xs font-semibold cursor-pointer ${
                  isShift
                    ? 'bg-[#16A34A] border-[#16A34A] text-white'
                    : 'bg-[#121715] border-[#232B28] text-[#A5B0AC]'
                }`}
              >
                SHIFT
              </button>
            )}

            {row.map((keyChar) => {
              const displayChar =
                !isSymbols && isShift ? keyChar.toUpperCase() : keyChar;
              return (
                <button
                  key={keyChar}
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    insertText(displayChar);
                  }}
                  className="flex-1 max-w-[64px] h-11 rounded bg-[#121715] hover:bg-[#19201E] active:bg-[#16A34A] active:text-white border border-[#232B28] font-mono-tabular text-sm sm:text-base font-semibold text-[#E2E6E4] transition-colors cursor-pointer"
                >
                  {displayChar}
                </button>
              );
            })}

            {rowIdx === 3 && (
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleBackspace();
                }}
                aria-label="Backspace"
                className="px-3 sm:px-4 h-11 rounded bg-[#121715] hover:bg-[#19201E] border border-[#232B28] flex items-center justify-center text-[#A5B0AC] hover:text-[#E2E6E4] cursor-pointer"
              >
                <Delete size={17} />
              </button>
            )}
          </div>
        ))}

        <div className="flex justify-center gap-1.5 pt-0.5">
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsSymbols((v) => !v);
            }}
            className={`px-3 h-10 rounded border font-mono-tabular text-xs font-semibold inline-flex items-center gap-1 cursor-pointer ${
              isSymbols
                ? 'bg-[#16A34A] border-[#16A34A] text-white'
                : 'bg-[#121715] border-[#232B28] text-[#4ADE80]'
            }`}
          >
            <Type size={12} />
            <span>{isSymbols ? 'ABC' : '#+='}</span>
          </button>
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              insertText(', ');
            }}
            className="px-3.5 h-10 rounded bg-[#121715] border border-[#232B28] font-mono-tabular text-sm text-[#E2E6E4] cursor-pointer"
          >
            ,
          </button>
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              insertText(' ');
            }}
            className="flex-1 max-w-md h-10 rounded bg-[#121715] hover:bg-[#19201E] active:bg-[#16A34A] active:text-white border border-[#232B28] font-mono-tabular text-xs font-semibold text-[#A5B0AC] cursor-pointer"
          >
            SPACE
          </button>
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              insertText(' // ');
            }}
            className="px-3 h-10 rounded bg-[#121715] border border-[#232B28] font-mono-tabular text-xs text-[#4ADE80] cursor-pointer"
          >
            //
          </button>
          {activeEl instanceof HTMLTextAreaElement ? (
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                insertText('\n');
              }}
              className="px-4 h-10 rounded bg-[#121715] border border-[#232B28] inline-flex items-center gap-1 font-mono-tabular text-xs text-[#E2E6E4] cursor-pointer"
            >
              <CornerDownLeft size={13} />
              <span>Enter</span>
            </button>
          ) : (
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleDone();
              }}
              className="px-4 h-10 rounded bg-[#16A34A] text-white inline-flex items-center gap-1 font-mono-tabular text-xs font-semibold cursor-pointer"
            >
              <Check size={13} />
              <span>Done</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
