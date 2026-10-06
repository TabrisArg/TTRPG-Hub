import React, { useState } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  X,
  Maximize2,
  PenTool,
  FolderPlus,
} from 'lucide-react';
import { GmAsset } from '../types/deltaGreen';
import { ScribbleStudioModal } from './ScribbleStudioModal';
import { AddToGmLibraryModal } from './AddToGmLibraryModal';

interface ImageZoomModalProps {
  imageUrl: string;
  title?: string;
  subtitle?: string;
  /** Exact label describing where closing the zoom modal returns the user */
  returnLabel?: string;
  onShareScribbleToTimeline?: (dataUrl: string, title: string) => Promise<void>;
  onSaveToGmLibrary?: (
    draft: Omit<GmAsset, 'id' | 'ownerId' | 'gameSystem' | 'updatedAt'>
  ) => Promise<string | void>;
  onClose: () => void;
}

export const ImageZoomModal: React.FC<ImageZoomModalProps> = ({
  imageUrl,
  title = 'Image Inspection',
  subtitle,
  returnLabel = 'Return to Previous View',
  onShareScribbleToTimeline,
  onSaveToGmLibrary,
  onClose,
}) => {
  const [zoomPercent, setZoomPercent] = useState<number>(100);
  const [isScribbleMode, setIsScribbleMode] = useState<boolean>(false);
  const [showAddToLibrary, setShowAddToLibrary] = useState<boolean>(false);

  const handleZoomIn = () => {
    setZoomPercent((prev) => Math.min(400, prev + 25));
  };

  const handleZoomOut = () => {
    setZoomPercent((prev) => Math.max(50, prev - 25));
  };

  const handleReset = () => {
    setZoomPercent(100);
  };

  if (isScribbleMode) {
    return (
      <ScribbleStudioModal
        baseImageUrl={imageUrl}
        initialTitle={title ? `${title} (Annotated)` : 'Annotated Image'}
        returnLabel="Return to Zoomed Image"
        onShareToTimeline={onShareScribbleToTimeline}
        onSaveToGmLibrary={onSaveToGmLibrary}
        onClose={() => {
          setIsScribbleMode(false);
        }}
      />
    );
  }

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-sm flex flex-col"
      onClick={onClose}
    >
      {showAddToLibrary && onSaveToGmLibrary && (
        <AddToGmLibraryModal
          imageUrl={imageUrl}
          defaultTitle={title}
          onSaveToGmLibrary={onSaveToGmLibrary}
          onClose={() => setShowAddToLibrary(false)}
        />
      )}

      {/* Top Control Bar */}
      <div
        className="bg-[#0B0E0D] border-b border-[#232B28] px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="min-w-0">
          <div className="font-mono-tabular text-[11px] text-[#4ADE80] uppercase">
            EVIDENCE & IMAGE MAGNIFIER {subtitle ? `· ${subtitle}` : ''}
          </div>
          <h3 className="font-display text-sm sm:text-base font-bold text-[#E2E6E4] truncate">
            {title}
          </h3>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Pen Icon Button to Scribble / Annotate on Zoomed Image */}
          <button
            type="button"
            onClick={() => setIsScribbleMode(true)}
            title="Scribble on this image with mouse or iPad Pencil and share to timeline"
            className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-mono-tabular font-semibold whitespace-nowrap shrink-0 cursor-pointer"
          >
            <PenTool size={14} />
            <span>Pen / Scribble on Image</span>
          </button>

          {/* Add to GM Library Button */}
          {onSaveToGmLibrary && (
            <button
              type="button"
              onClick={() => setShowAddToLibrary(true)}
              title="Turn this image into an object in your GM Library"
              className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded bg-[#121715] hover:bg-[#19201E] border border-[#232B28] text-xs font-mono-tabular text-[#4ADE80] whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FolderPlus size={14} />
              <span>Add to GM Library</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleZoomOut}
            disabled={zoomPercent <= 50}
            title="Zoom Out"
            className="inline-flex items-center justify-center gap-1 h-8 px-2.5 rounded bg-[#121715] hover:bg-[#19201E] disabled:opacity-40 border border-[#232B28] text-xs font-mono-tabular text-[#E2E6E4] whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ZoomOut size={14} className="text-[#4ADE80]" />
            <span>−25%</span>
          </button>

          <span className="inline-flex items-center justify-center h-8 px-3 rounded bg-[#070908] border border-[#232B28] font-mono-tabular text-xs font-semibold text-[#4ADE80] min-w-[68px] text-center shrink-0">
            {zoomPercent}%
          </span>

          <button
            type="button"
            onClick={handleZoomIn}
            disabled={zoomPercent >= 400}
            title="Zoom In"
            className="inline-flex items-center justify-center gap-1 h-8 px-2.5 rounded bg-[#121715] hover:bg-[#19201E] disabled:opacity-40 border border-[#232B28] text-xs font-mono-tabular text-[#E2E6E4] whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ZoomIn size={14} className="text-[#4ADE80]" />
            <span>+25%</span>
          </button>

          <button
            type="button"
            onClick={() => setZoomPercent(200)}
            title="Zoom to 200%"
            className="inline-flex items-center justify-center gap-1 h-8 px-2.5 rounded bg-[#121715] hover:bg-[#19201E] border border-[#232B28] text-xs font-mono-tabular text-[#A5B0AC] hover:text-[#E2E6E4] whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Maximize2 size={13} />
            <span>200%</span>
          </button>

          <button
            type="button"
            onClick={handleReset}
            title="Reset Zoom to 100%"
            className="inline-flex items-center justify-center gap-1 h-8 px-2.5 rounded bg-[#121715] hover:bg-[#19201E] border border-[#232B28] text-xs font-mono-tabular text-[#A5B0AC] hover:text-[#E2E6E4] whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RotateCcw size={13} />
            <span>Reset</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center gap-1 h-8 px-3 rounded bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-mono-tabular font-semibold whitespace-nowrap shrink-0 cursor-pointer"
          >
            <X size={14} />
            <span>{returnLabel}</span>
          </button>
        </div>
      </div>

      {/* Scrollable / Zoomable Viewport */}
      <div
        className="flex-1 overflow-auto p-6 flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
        onWheel={(e) => {
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            if (e.deltaY < 0) handleZoomIn();
            else handleZoomOut();
          }
        }}
      >
        <div
          style={{
            transform: `scale(${zoomPercent / 100})`,
            transformOrigin: 'center center',
            transition: 'transform 120ms ease-out',
          }}
          className="inline-block"
        >
          <img
            src={imageUrl}
            alt={title}
            referrerPolicy="no-referrer"
            className="max-w-[85vw] max-h-[78vh] object-contain rounded border border-[#232B28] bg-[#0B0E0D] shadow-2xl"
          />
        </div>
      </div>
    </div>
  );
};
