import React, { useEffect, useRef, useState } from 'react';
import {
  PenTool,
  Eraser,
  Undo2,
  Trash2,
  Send,
  FolderPlus,
  X,
  Check,
} from 'lucide-react';
import {
  BlankDocumentBackground,
  GmAsset,
  ScribbleInkColor,
  ScribblePenThickness,
} from '../types/deltaGreen';
import { AddToGmLibraryModal } from './AddToGmLibraryModal';

interface ScribbleStudioModalProps {
  /** If provided, the user is scribbling on top of an existing image */
  baseImageUrl?: string;
  initialTitle?: string;
  /** Exact label describing where closing/returning takes the user */
  returnLabel?: string;
  onShareToTimeline?: (dataUrl: string, title: string) => Promise<void>;
  onSaveToGmLibrary?: (
    draft: Omit<GmAsset, 'id' | 'ownerId' | 'gameSystem' | 'updatedAt'>
  ) => Promise<string | void>;
  onClose: () => void;
}

export const INK_COLOR_OPTIONS: {
  id: ScribbleInkColor;
  label: string;
  hex: string;
  swatchBorder?: string;
}[] = [
  { id: 'black', label: 'Black', hex: '#111111', swatchBorder: '#525B65' },
  { id: 'white', label: 'White', hex: '#FFFFFF', swatchBorder: '#A1A1AA' },
  { id: 'red', label: 'Red', hex: '#DC2626' },
  { id: 'blue', label: 'Blue', hex: '#2563EB' },
  { id: 'green', label: 'Green', hex: '#16A34A' },
];

export const PEN_THICKNESS_OPTIONS: {
  id: ScribblePenThickness;
  label: string;
  px: number;
}[] = [
  { id: 'small', label: 'Small', px: 3 },
  { id: 'mid', label: 'Mid', px: 7 },
  { id: 'large', label: 'Large', px: 16 },
];

export const BLANK_BACKGROUND_OPTIONS: {
  id: BlankDocumentBackground;
  label: string;
}[] = [
  { id: 'solid-white', label: 'Solid White' },
  { id: 'solid-black', label: 'Solid Black' },
  { id: 'solid-gray', label: 'Solid Gray' },
  { id: 'crumbled-paper', label: 'Crumbled Paper Texture' },
  { id: 'wall-texture', label: 'Wall Texture' },
  { id: 'formal-letter', label: 'Formal Letter Texture' },
  { id: 'wood-panel', label: 'Wood Panel Texture' },
  { id: 'dirt-texture', label: 'Dirt Texture' },
  { id: 'hand-texture', label: 'Hand Texture' },
  { id: 'fantasy-scroll', label: 'Fantasy Scroll' },
  { id: 'night-sky', label: 'Words in the Night Sky' },
  { id: 'pond-water', label: 'Words in a Pond' },
  { id: 'clouds-sky', label: 'Words in the Clouds' },
];

// Deterministic pseudo-random helper for procedural canvas textures
function seededRandom(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function drawProceduralBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  bgType: BlankDocumentBackground
) {
  const rand = seededRandom(42069);
  ctx.save();

  if (bgType === 'solid-white') {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
  } else if (bgType === 'solid-black') {
    ctx.fillStyle = '#0D100F';
    ctx.fillRect(0, 0, width, height);
  } else if (bgType === 'solid-gray') {
    ctx.fillStyle = '#7A827E';
    ctx.fillRect(0, 0, width, height);
  } else if (bgType === 'crumbled-paper') {
    // Base aged paper
    const grad = ctx.createRadialGradient(
      width * 0.5,
      height * 0.5,
      40,
      width * 0.5,
      height * 0.5,
      width * 0.7
    );
    grad.addColorStop(0, '#EFE7D6');
    grad.addColorStop(1, '#D7C8B0');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Crumbled paper polygonal crease facets
    for (let i = 0; i < 42; i++) {
      const x1 = rand() * width;
      const y1 = rand() * height;
      const x2 = x1 + (rand() - 0.5) * 260;
      const y2 = y1 + (rand() - 0.5) * 260;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle =
        i % 2 === 0 ? 'rgba(95, 78, 54, 0.16)' : 'rgba(255, 252, 244, 0.35)';
      ctx.lineWidth = i % 3 === 0 ? 2 : 1;
      ctx.stroke();
    }

    // Fine paper fiber speckles
    for (let i = 0; i < 650; i++) {
      ctx.fillStyle =
        i % 2 === 0 ? 'rgba(110, 90, 65, 0.12)' : 'rgba(255, 255, 255, 0.15)';
      ctx.fillRect(rand() * width, rand() * height, 1.5, 1.5);
    }
  } else if (bgType === 'wall-texture') {
    // Stucco / concrete wall base
    ctx.fillStyle = '#C9C7C1';
    ctx.fillRect(0, 0, width, height);

    // Subtle concrete mottling patches
    for (let i = 0; i < 35; i++) {
      const rx = rand() * width;
      const ry = rand() * height;
      const r = 30 + rand() * 80;
      const g = ctx.createRadialGradient(rx, ry, 2, rx, ry, r);
      g.addColorStop(
        0,
        i % 2 === 0 ? 'rgba(90, 90, 86, 0.12)' : 'rgba(235, 234, 230, 0.16)'
      );
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(rx - r, ry - r, r * 2, r * 2);
    }

    // Faint masonry joints & wall hairline cracks
    ctx.strokeStyle = 'rgba(75, 74, 70, 0.22)';
    ctx.lineWidth = 1;
    for (let y = 80; y < height; y += 80) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    // Hairline plaster crack
    ctx.beginPath();
    let cx = width * 0.25;
    let cy = 0;
    ctx.moveTo(cx, cy);
    while (cy < height * 0.65) {
      cx += (rand() - 0.48) * 24;
      cy += 14 + rand() * 18;
      ctx.lineTo(cx, cy);
    }
    ctx.strokeStyle = 'rgba(55, 54, 50, 0.35)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Coarse stucco grain
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle =
        i % 2 === 0 ? 'rgba(60, 60, 58, 0.14)' : 'rgba(250, 250, 246, 0.16)';
      ctx.fillRect(rand() * width, rand() * height, 1.5, 1.5);
    }
  } else if (bgType === 'formal-letter') {
    // Formal cream stationery
    ctx.fillStyle = '#FAF6EE';
    ctx.fillRect(0, 0, width, height);

    // Subtle horizontal laid-paper lines
    ctx.strokeStyle = 'rgba(180, 168, 145, 0.24)';
    ctx.lineWidth = 1;
    for (let y = 96; y < height - 48; y += 28) {
      ctx.beginPath();
      ctx.moveTo(56, y);
      ctx.lineTo(width - 56, y);
      ctx.stroke();
    }

    // Double-ruled formal stationery border frame
    ctx.strokeStyle = '#3F3A32';
    ctx.lineWidth = 2;
    ctx.strokeRect(24, 24, width - 48, height - 48);
    ctx.strokeStyle = '#8C8272';
    ctx.lineWidth = 1;
    ctx.strokeRect(30, 30, width - 60, height - 60);

    // Formal letterhead crest bar
    ctx.beginPath();
    ctx.moveTo(56, 68);
    ctx.lineTo(width - 56, 68);
    ctx.strokeStyle = '#524B40';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  } else if (bgType === 'wood-panel') {
    // Warm wood base
    const woodGrad = ctx.createLinearGradient(0, 0, width, 0);
    woodGrad.addColorStop(0, '#7C4F28');
    woodGrad.addColorStop(0.5, '#8E5B30');
    woodGrad.addColorStop(1, '#704623');
    ctx.fillStyle = woodGrad;
    ctx.fillRect(0, 0, width, height);

    // Vertical wood plank seams
    const plankWidth = width / 4;
    for (let p = 1; p < 4; p++) {
      ctx.beginPath();
      ctx.moveTo(p * plankWidth, 0);
      ctx.lineTo(p * plankWidth, height);
      ctx.strokeStyle = 'rgba(32, 18, 8, 0.55)';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    // Wood grain fibers
    for (let i = 0; i < 140; i++) {
      const x = rand() * width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.bezierCurveTo(
        x + (rand() - 0.5) * 30,
        height * 0.33,
        x + (rand() - 0.5) * 30,
        height * 0.66,
        x + (rand() - 0.5) * 15,
        height
      );
      ctx.strokeStyle =
        i % 2 === 0 ? 'rgba(42, 24, 10, 0.16)' : 'rgba(210, 155, 96, 0.11)';
      ctx.lineWidth = 1 + rand() * 1.5;
      ctx.stroke();
    }
  } else if (bgType === 'dirt-texture') {
    // Rich soil/earth base
    const dirtGrad = ctx.createRadialGradient(
      width * 0.5,
      height * 0.5,
      50,
      width * 0.5,
      height * 0.5,
      width * 0.65
    );
    dirtGrad.addColorStop(0, '#5A4432');
    dirtGrad.addColorStop(1, '#3E2E21');
    ctx.fillStyle = dirtGrad;
    ctx.fillRect(0, 0, width, height);

    // Organic soil clods & pebbles
    for (let i = 0; i < 1200; i++) {
      const px = rand() * width;
      const py = rand() * height;
      const sz = 1 + rand() * 3.5;
      ctx.fillStyle =
        i % 3 === 0
          ? 'rgba(28, 19, 12, 0.38)'
          : i % 3 === 1
          ? 'rgba(138, 108, 80, 0.25)'
          : 'rgba(85, 64, 45, 0.3)';
      ctx.beginPath();
      ctx.arc(px, py, sz, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (bgType === 'hand-texture') {
    // Dark background around the hand
    ctx.fillStyle = '#181C1A';
    ctx.fillRect(0, 0, width, height);

    // Draw a stylized open palm / hand skin canvas in the center so users can write notes on their hand
    const cx = width * 0.5;
    const cy = height * 0.54;

    ctx.save();
    const skinGrad = ctx.createRadialGradient(cx, cy, 30, cx, cy, 280);
    skinGrad.addColorStop(0, '#E6BEA0');
    skinGrad.addColorStop(0.7, '#D4A383');
    skinGrad.addColorStop(1, '#B88464');

    ctx.fillStyle = skinGrad;
    ctx.strokeStyle = '#8C5B3E';
    ctx.lineWidth = 3;

    // Palm + Wrist + 5 Fingers silhouette
    ctx.beginPath();
    // Left wrist
    ctx.moveTo(cx - 85, height);
    ctx.lineTo(cx - 95, cy + 120);
    // Thumb
    ctx.quadraticCurveTo(cx - 195, cy + 50, cx - 220, cy - 20);
    ctx.quadraticCurveTo(cx - 230, cy - 60, cx - 190, cy - 65);
    ctx.quadraticCurveTo(cx - 145, cy - 45, cx - 120, cy + 15);
    // Index finger
    ctx.lineTo(cx - 110, cy - 190);
    ctx.quadraticCurveTo(cx - 105, cy - 235, cx - 75, cy - 230);
    ctx.quadraticCurveTo(cx - 50, cy - 225, cx - 52, cy - 180);
    ctx.lineTo(cx - 48, cy - 75);
    // Middle finger
    ctx.lineTo(cx - 42, cy - 220);
    ctx.quadraticCurveTo(cx - 38, cy - 260, cx - 8, cy - 260);
    ctx.quadraticCurveTo(cx + 20, cy - 260, cx + 22, cy - 215);
    ctx.lineTo(cx + 22, cy - 75);
    // Ring finger
    ctx.lineTo(cx + 30, cy - 195);
    ctx.quadraticCurveTo(cx + 35, cy - 235, cx + 64, cy - 230);
    ctx.quadraticCurveTo(cx + 88, cy - 225, cx + 85, cy - 185);
    ctx.lineTo(cx + 76, cy - 60);
    // Pinky finger
    ctx.lineTo(cx + 95, cy - 140);
    ctx.quadraticCurveTo(cx + 105, cy - 175, cx + 130, cy - 168);
    ctx.quadraticCurveTo(cx + 150, cy - 160, cx + 142, cy - 125);
    ctx.lineTo(cx + 125, cy + 30);
    // Right palm edge down to wrist
    ctx.quadraticCurveTo(cx + 135, cy + 110, cx + 95, cy + 145);
    ctx.lineTo(cx + 85, height);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Subtle palm crease lines (life line, heart line, head line)
    ctx.strokeStyle = 'rgba(135, 82, 54, 0.38)';
    ctx.lineWidth = 2;
    // Life line
    ctx.beginPath();
    ctx.moveTo(cx - 110, cy - 10);
    ctx.quadraticCurveTo(cx - 40, cy + 30, cx - 35, cy + 135);
    ctx.stroke();
    // Head line
    ctx.beginPath();
    ctx.moveTo(cx - 105, cy - 20);
    ctx.quadraticCurveTo(cx - 10, cy - 5, cx + 85, cy + 25);
    ctx.stroke();
    // Heart line
    ctx.beginPath();
    ctx.moveTo(cx - 45, cy - 45);
    ctx.quadraticCurveTo(cx + 35, cy - 45, cx + 115, cy - 15);
    ctx.stroke();

    ctx.restore();
  } else if (bgType === 'fantasy-scroll') {
    // Dark wood table backdrop
    ctx.fillStyle = '#1E120A';
    ctx.fillRect(0, 0, width, height);

    // Rolled parchment body
    const padX = 48;
    const padY = 36;
    const scrollGrad = ctx.createRadialGradient(
      width * 0.5,
      height * 0.5,
      30,
      width * 0.5,
      height * 0.5,
      width * 0.55
    );
    scrollGrad.addColorStop(0, '#F5E6C4');
    scrollGrad.addColorStop(0.75, '#E5CE9E');
    scrollGrad.addColorStop(1, '#C8A66E');
    ctx.fillStyle = scrollGrad;
    ctx.fillRect(padX, padY, width - padX * 2, height - padY * 2);

    // Inner arcane border frame
    ctx.strokeStyle = '#8C4A19';
    ctx.lineWidth = 2;
    ctx.strokeRect(padX + 16, padY + 18, width - (padX + 16) * 2, height - (padY + 18) * 2);

    // Top & Bottom Wooden Scroll Rods
    const rodGrad = ctx.createLinearGradient(0, 0, width, 0);
    rodGrad.addColorStop(0, '#451A03');
    rodGrad.addColorStop(0.5, '#92400E');
    rodGrad.addColorStop(1, '#451A03');
    ctx.fillStyle = rodGrad;
    ctx.fillRect(24, 16, width - 48, 22);
    ctx.fillRect(24, height - 38, width - 48, 22);

    // Gold rod end caps
    ctx.fillStyle = '#F59E0B';
    ctx.fillRect(18, 14, 12, 26);
    ctx.fillRect(width - 30, 14, 12, 26);
    ctx.fillRect(18, height - 40, 12, 26);
    ctx.fillRect(width - 30, height - 40, 12, 26);
  } else if (bgType === 'night-sky') {
    // Deep midnight cosmos sky
    const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
    skyGrad.addColorStop(0, '#030614');
    skyGrad.addColorStop(0.55, '#09102A');
    skyGrad.addColorStop(1, '#040817');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height);

    // Subtle nebula glow
    const neb = ctx.createRadialGradient(
      width * 0.35,
      height * 0.4,
      10,
      width * 0.35,
      height * 0.4,
      width * 0.45
    );
    neb.addColorStop(0, 'rgba(99, 102, 241, 0.22)');
    neb.addColorStop(0.6, 'rgba(56, 189, 248, 0.1)');
    neb.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = neb;
    ctx.fillRect(0, 0, width, height);

    // Twinkling stars
    for (let i = 0; i < 240; i++) {
      const sx = rand() * width;
      const sy = rand() * height;
      const sr = 0.6 + rand() * 1.8;
      ctx.fillStyle =
        i % 5 === 0
          ? '#BAE6FD'
          : i % 7 === 0
          ? '#FEF08A'
          : 'rgba(255, 255, 255, 0.85)';
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Glowing Crescent Moon
    ctx.save();
    ctx.fillStyle = '#F0F9FF';
    ctx.beginPath();
    ctx.arc(width - 90, 80, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#05091B';
    ctx.beginPath();
    ctx.arc(width - 78, 72, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else if (bgType === 'pond-water') {
    // Deep pond water gradient
    const waterGrad = ctx.createRadialGradient(
      width * 0.5,
      height * 0.5,
      30,
      width * 0.5,
      height * 0.5,
      width * 0.65
    );
    waterGrad.addColorStop(0, '#083D48');
    waterGrad.addColorStop(0.6, '#052B34');
    waterGrad.addColorStop(1, '#031A20');
    ctx.fillStyle = waterGrad;
    ctx.fillRect(0, 0, width, height);

    // Concentric pond water ripple rings
    const rippleCenters = [
      { x: width * 0.5, y: height * 0.5, count: 6 },
      { x: width * 0.22, y: height * 0.3, count: 4 },
      { x: width * 0.78, y: height * 0.72, count: 4 },
    ];
    rippleCenters.forEach((rc) => {
      for (let r = 1; r <= rc.count; r++) {
        ctx.beginPath();
        ctx.ellipse(
          rc.x,
          rc.y,
          r * 42,
          r * 26,
          0,
          0,
          Math.PI * 2
        );
        ctx.strokeStyle = `rgba(103, 232, 249, ${0.22 - r * 0.028})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    });

    // Floating Lily Pads at corners
    const pads = [
      { x: 75, y: 75, rad: 36 },
      { x: width - 85, y: height - 70, rad: 42 },
    ];
    pads.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.rad, 0.25, Math.PI * 1.9);
      ctx.lineTo(p.x, p.y);
      ctx.closePath();
      ctx.fillStyle = 'rgba(21, 128, 61, 0.65)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(74, 222, 128, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
  } else if (bgType === 'clouds-sky') {
    // Bright blue daytime sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
    skyGrad.addColorStop(0, '#0284C7');
    skyGrad.addColorStop(0.55, '#38BDF8');
    skyGrad.addColorStop(1, '#BAE6FD');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height);

    // Fluffy cumulus clouds across the sky
    const drawCloud = (cx: number, cy: number, scale: number, alpha: number) => {
      ctx.save();
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      const puffs = [
        { dx: 0, dy: 0, r: 44 * scale },
        { dx: -38 * scale, dy: 8 * scale, r: 32 * scale },
        { dx: 38 * scale, dy: 8 * scale, r: 34 * scale },
        { dx: -64 * scale, dy: 16 * scale, r: 24 * scale },
        { dx: 64 * scale, dy: 16 * scale, r: 24 * scale },
      ];
      puffs.forEach((pf) => {
        ctx.beginPath();
        ctx.arc(cx + pf.dx, cy + pf.dy, pf.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    };

    drawCloud(140, 100, 1.1, 0.45);
    drawCloud(width - 150, 115, 1.25, 0.42);
    drawCloud(width * 0.5, height * 0.5, 1.8, 0.25);
    drawCloud(170, height - 85, 1.2, 0.5);
    drawCloud(width - 180, height - 75, 1.3, 0.52);
  }

  ctx.restore();
}

export const ScribbleStudioModal: React.FC<ScribbleStudioModalProps> = ({
  baseImageUrl,
  initialTitle = '',
  returnLabel,
  onShareToTimeline,
  onSaveToGmLibrary,
  onClose,
}) => {
  const isBlankDocMode = !baseImageUrl;

  const [inkColor, setInkColor] = useState<ScribbleInkColor>('black');
  const [penThickness, setPenThickness] = useState<ScribblePenThickness>('mid');
  const [isEraser, setIsEraser] = useState<boolean>(false);
  const [backgroundType, setBackgroundType] =
    useState<BlankDocumentBackground>('crumbled-paper');
  const [noteTitle, setNoteTitle] = useState<string>(
    initialTitle || (isBlankDocMode ? 'Field Note / Sketch' : 'Annotated Evidence')
  );

  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number }>({
    width: 840,
    height: 600,
  });
  const [loadedBaseImage, setLoadedBaseImage] =
    useState<HTMLImageElement | null>(null);
  const [undoStack, setUndoStack] = useState<ImageData[]>([]);
  const [isSharing, setIsSharing] = useState<boolean>(false);
  const [sharedSuccess, setSharedSuccess] = useState<boolean>(false);
  const [libraryExportDataUrl, setLibraryExportDataUrl] = useState<
    string | null
  >(null);

  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const inkCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef<boolean>(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const loadedImageRef = useRef<HTMLImageElement | null>(null);

  // Load baseImageUrl if annotating an existing image
  useEffect(() => {
    if (!baseImageUrl) {
      loadedImageRef.current = null;
      setLoadedBaseImage(null);
      setCanvasSize({ width: 840, height: 600 });
      return;
    }

    let isCancelled = false;

    const applyLoadedImage = (loadedImg: HTMLImageElement) => {
      if (isCancelled) return;
      loadedImageRef.current = loadedImg;
      const maxW = 880;
      const maxH = 640;
      let w = loadedImg.naturalWidth || 800;
      let h = loadedImg.naturalHeight || 600;
      const scale = Math.min(maxW / w, maxH / h, 1);
      w = Math.max(320, Math.round(w * scale));
      h = Math.max(240, Math.round(h * scale));

      setCanvasSize({ width: w, height: h });
      setLoadedBaseImage(loadedImg);
      setUndoStack([]);
    };

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';
    img.onload = () => applyLoadedImage(img);
    img.onerror = () => {
      // Fallback if external host does not allow anonymous CORS headers
      const fallbackImg = new Image();
      fallbackImg.referrerPolicy = 'no-referrer';
      fallbackImg.onload = () => applyLoadedImage(fallbackImg);
      fallbackImg.src = baseImageUrl;
    };
    img.src = baseImageUrl;

    return () => {
      isCancelled = true;
    };
  }, [baseImageUrl]);

  // Draw background image or procedural texture AFTER canvasSize commits to DOM
  useEffect(() => {
    const bgCanvas = bgCanvasRef.current;
    if (!bgCanvas) return;
    const ctx = bgCanvas.getContext('2d');
    if (!ctx) return;

    if (isBlankDocMode) {
      drawProceduralBackground(
        ctx,
        canvasSize.width,
        canvasSize.height,
        backgroundType
      );
    } else if (loadedBaseImage) {
      ctx.fillStyle = '#0B0E0D';
      ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);
      ctx.drawImage(loadedBaseImage, 0, 0, canvasSize.width, canvasSize.height);
    }
  }, [
    isBlankDocMode,
    loadedBaseImage,
    backgroundType,
    canvasSize.width,
    canvasSize.height,
  ]);

  const handleSelectBackground = (bg: BlankDocumentBackground) => {
    setBackgroundType(bg);
    if (
      (bg === 'solid-black' ||
        bg === 'night-sky' ||
        bg === 'pond-water' ||
        bg === 'clouds-sky') &&
      inkColor === 'black'
    ) {
      setInkColor('white');
    } else if (
      (bg === 'solid-white' || bg === 'fantasy-scroll') &&
      inkColor === 'white'
    ) {
      setInkColor('black');
    }
  };

  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = inkCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const saveUndoSnapshot = () => {
    const inkCanvas = inkCanvasRef.current;
    if (!inkCanvas) return;
    const ctx = inkCanvas.getContext('2d');
    if (!ctx) return;
    const snapshot = ctx.getImageData(0, 0, inkCanvas.width, inkCanvas.height);
    setUndoStack((prev) => [...prev.slice(-14), snapshot]);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const inkCanvas = inkCanvasRef.current;
    if (!inkCanvas) return;

    inkCanvas.setPointerCapture(e.pointerId);
    saveUndoSnapshot();

    const pt = getCanvasPoint(e);
    isDrawingRef.current = true;
    lastPointRef.current = pt;

    // Draw initial dot
    const ctx = inkCanvas.getContext('2d');
    if (!ctx) return;

    const thicknessObj =
      PEN_THICKNESS_OPTIONS.find((t) => t.id === penThickness) ||
      PEN_THICKNESS_OPTIONS[1];
    const colorObj =
      INK_COLOR_OPTIONS.find((c) => c.id === inkColor) || INK_COLOR_OPTIONS[0];

    ctx.save();
    ctx.globalCompositeOperation = isEraser ? 'destination-out' : 'source-over';
    ctx.fillStyle = isEraser ? 'rgba(0,0,0,1)' : colorObj.hex;
    const radius = (isEraser ? thicknessObj.px * 2.2 : thicknessObj.px) / 2;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    e.stopPropagation();

    const inkCanvas = inkCanvasRef.current;
    if (!inkCanvas) return;
    const ctx = inkCanvas.getContext('2d');
    if (!ctx) return;

    const pt = getCanvasPoint(e);
    const prev = lastPointRef.current || pt;

    const thicknessObj =
      PEN_THICKNESS_OPTIONS.find((t) => t.id === penThickness) ||
      PEN_THICKNESS_OPTIONS[1];
    const colorObj =
      INK_COLOR_OPTIONS.find((c) => c.id === inkColor) || INK_COLOR_OPTIONS[0];

    ctx.save();
    ctx.globalCompositeOperation = isEraser ? 'destination-out' : 'source-over';
    ctx.strokeStyle = isEraser ? 'rgba(0,0,0,1)' : colorObj.hex;
    ctx.lineWidth = isEraser ? thicknessObj.px * 2.2 : thicknessObj.px;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
    ctx.restore();

    lastPointRef.current = pt;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    isDrawingRef.current = false;
    lastPointRef.current = null;
  };

  const handleUndo = () => {
    const inkCanvas = inkCanvasRef.current;
    if (!inkCanvas || undoStack.length === 0) return;
    const ctx = inkCanvas.getContext('2d');
    if (!ctx) return;
    const previous = undoStack[undoStack.length - 1];
    ctx.putImageData(previous, 0, 0);
    setUndoStack((prev) => prev.slice(0, -1));
  };

  const handleClearWriting = () => {
    const inkCanvas = inkCanvasRef.current;
    if (!inkCanvas) return;
    saveUndoSnapshot();
    const ctx = inkCanvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, inkCanvas.width, inkCanvas.height);
  };

  const compositeFinalDataUrl = (): string => {
    const bgCanvas = bgCanvasRef.current;
    const inkCanvas = inkCanvasRef.current;
    if (!bgCanvas || !inkCanvas) return '';

    const out = document.createElement('canvas');
    out.width = canvasSize.width;
    out.height = canvasSize.height;
    const ctx = out.getContext('2d');
    if (!ctx) return '';

    ctx.fillStyle = '#0B0E0D';
    ctx.fillRect(0, 0, out.width, out.height);

    if (!isBlankDocMode && loadedImageRef.current) {
      try {
        ctx.drawImage(loadedImageRef.current, 0, 0, out.width, out.height);
      } catch {
        ctx.drawImage(bgCanvas, 0, 0);
      }
    } else {
      ctx.drawImage(bgCanvas, 0, 0);
    }

    ctx.drawImage(inkCanvas, 0, 0);
    try {
      return out.toDataURL('image/jpeg', 0.85);
    } catch {
      // Fallback if external non-CORS image tainted the composite canvas
      return baseImageUrl || '';
    }
  };

  const handleShareClick = async () => {
    if (!onShareToTimeline || isSharing) return;
    const dataUrl = compositeFinalDataUrl();
    if (!dataUrl) return;

    setIsSharing(true);
    try {
      await onShareToTimeline(
        dataUrl,
        noteTitle.trim() ||
          (isBlankDocMode ? 'Shared Field Note' : 'Annotated Image')
      );
      setSharedSuccess(true);
      window.setTimeout(() => {
        onClose();
      }, 650);
    } finally {
      setIsSharing(false);
    }
  };

  const handleOpenAddToGmLibrary = () => {
    const dataUrl = compositeFinalDataUrl();
    if (!dataUrl) return;
    setLibraryExportDataUrl(dataUrl);
  };

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/92 backdrop-blur-sm flex flex-col"
      onClick={onClose}
    >
      {libraryExportDataUrl && onSaveToGmLibrary && (
        <AddToGmLibraryModal
          imageUrl={libraryExportDataUrl}
          defaultTitle={noteTitle.trim()}
          onSaveToGmLibrary={onSaveToGmLibrary}
          onClose={() => setLibraryExportDataUrl(null)}
        />
      )}

      {/* Top Studio Control Header */}
      <div
        className="bg-[#0B0E0D] border-b border-[#232B28] px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <div className="font-mono-tabular text-[11px] text-[#4ADE80] uppercase font-semibold">
              {isBlankDocMode
                ? 'BLANK DOCUMENT & SCRIBBLE STUDIO // MOUSE & IPAD PENCIL READY'
                : 'IMAGE ANNOTATION & SCRIBBLE PEN // MOUSE & IPAD PENCIL READY'}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <input
                type="text"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="Note or Sketch Title..."
                className="bg-[#121715] border border-[#232B28] focus:border-[#16A34A] rounded px-2.5 py-1 text-xs sm:text-sm font-bold text-[#E2E6E4] focus:outline-none w-56 sm:w-72"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onSaveToGmLibrary && (
            <button
              type="button"
              onClick={handleOpenAddToGmLibrary}
              className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded bg-[#121715] hover:bg-[#19201E] border border-[#232B28] text-xs font-mono-tabular text-[#4ADE80] whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FolderPlus size={14} />
              <span>Add to GM Library</span>
            </button>
          )}

          {onShareToTimeline && (
            <button
              type="button"
              onClick={handleShareClick}
              disabled={isSharing || sharedSuccess}
              className="inline-flex items-center justify-center gap-1.5 h-8 px-4 rounded bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-60 text-white text-xs font-mono-tabular font-semibold whitespace-nowrap shrink-0 cursor-pointer"
            >
              {sharedSuccess ? (
                <>
                  <Check size={14} />
                  <span>Shared to Timeline!</span>
                </>
              ) : (
                <>
                  <Send size={14} />
                  <span>
                    {isSharing ? 'Sharing...' : 'Share to Session Timeline'}
                  </span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center gap-1 h-8 px-3 rounded bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-mono-tabular font-semibold whitespace-nowrap shrink-0 cursor-pointer"
          >
            <X size={14} />
            <span>
              {returnLabel ||
                (isBlankDocMode
                  ? 'Return to Session Timeline'
                  : 'Return to Image Viewer')}
            </span>
          </button>
        </div>
      </div>

      {/* Drawing Toolbar: Ink Colors, Pen Thicknesses, Eraser, Undo/Clear, and 9 Blank Document Backgrounds */}
      <div
        className="bg-[#121715] border-b border-[#232B28] px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-4 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-wrap items-center gap-4">
          {/* 1. Ink Colors (Black, White, Red, Blue, Green) */}
          <div className="flex items-center gap-1.5">
            <span className="font-mono-tabular text-[11px] text-[#8C9692] mr-1">
              INK:
            </span>
            {INK_COLOR_OPTIONS.map((c) => {
              const active = !isEraser && inkColor === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setIsEraser(false);
                    setInkColor(c.id);
                  }}
                  title={`${c.label} Ink`}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono-tabular border transition-all cursor-pointer ${
                    active
                      ? 'border-[#4ADE80] bg-[#0B0E0D] text-[#E2E6E4] font-semibold ring-1 ring-[#4ADE80]'
                      : 'border-[#232B28] bg-[#0B0E0D]/60 text-[#A5B0AC] hover:text-[#E2E6E4]'
                  }`}
                >
                  <span
                    style={{
                      backgroundColor: c.hex,
                      borderColor: c.swatchBorder || c.hex,
                    }}
                    className="w-3 h-3 rounded-full border shrink-0"
                  />
                  <span>{c.label}</span>
                </button>
              );
            })}
          </div>

          {/* 2. Pen Thicknesses (Small, Mid, Large) */}
          <div className="flex items-center gap-1.5">
            <span className="font-mono-tabular text-[11px] text-[#8C9692] mr-1">
              SIZE:
            </span>
            {PEN_THICKNESS_OPTIONS.map((t) => {
              const active = penThickness === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setPenThickness(t.id)}
                  className={`px-2.5 py-1 rounded text-xs font-mono-tabular border cursor-pointer ${
                    active
                      ? 'bg-[#16A34A] border-[#16A34A] text-white font-semibold'
                      : 'bg-[#0B0E0D] border-[#232B28] text-[#A5B0AC] hover:text-[#E2E6E4]'
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* 3. Pen vs Eraser + Undo / Clear */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsEraser(false)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono-tabular border cursor-pointer ${
                !isEraser
                  ? 'bg-[#16A34A] border-[#16A34A] text-white font-semibold'
                  : 'bg-[#0B0E0D] border-[#232B28] text-[#A5B0AC]'
              }`}
            >
              <PenTool size={12} />
              <span>Pen</span>
            </button>

            <button
              type="button"
              onClick={() => setIsEraser(true)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono-tabular border cursor-pointer ${
                isEraser
                  ? 'bg-[#D97706] border-[#D97706] text-white font-semibold'
                  : 'bg-[#0B0E0D] border-[#232B28] text-[#A5B0AC] hover:text-[#E2E6E4]'
              }`}
            >
              <Eraser size={12} />
              <span>Eraser</span>
            </button>

            <button
              type="button"
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              title="Undo last stroke"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#0B0E0D] hover:bg-[#19201E] disabled:opacity-40 border border-[#232B28] text-xs font-mono-tabular text-[#A5B0AC] hover:text-[#E2E6E4] cursor-pointer"
            >
              <Undo2 size={12} />
              <span>Undo</span>
            </button>

            <button
              type="button"
              onClick={handleClearWriting}
              title="Erase all writing"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#0B0E0D] hover:bg-[#19201E] border border-[#232B28] text-xs font-mono-tabular text-[#F87171] cursor-pointer"
            >
              <Trash2 size={12} />
              <span>Clear Ink</span>
            </button>
          </div>
        </div>

        {/* 4. Blank Document Background Selector (9 Backgrounds) */}
        {isBlankDocMode && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono-tabular text-[11px] text-[#4ADE80] font-semibold">
              BACKGROUND:
            </span>
            <select
              value={backgroundType}
              onChange={(e) =>
                handleSelectBackground(e.target.value as BlankDocumentBackground)
              }
              className="bg-[#0B0E0D] border border-[#16A34A] rounded px-2.5 py-1 text-xs font-mono-tabular text-[#E2E6E4] focus:outline-none cursor-pointer"
            >
              {BLANK_BACKGROUND_OPTIONS.map((bg) => (
                <option key={bg.id} value={bg.id}>
                  {bg.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Quick Background Chips Bar for Blank Document Mode */}
      {isBlankDocMode && (
        <div
          className="bg-[#0E1311] border-b border-[#232B28] px-4 sm:px-6 py-2 flex items-center gap-1.5 overflow-x-auto shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="font-mono-tabular text-[10px] text-[#8C9692] mr-1 shrink-0">
            SURFACE TEXTURES:
          </span>
          {BLANK_BACKGROUND_OPTIONS.map((bg) => {
            const active = backgroundType === bg.id;
            return (
              <button
                key={bg.id}
                type="button"
                onClick={() => handleSelectBackground(bg.id)}
                className={`px-2.5 py-1 rounded text-[11px] font-mono-tabular whitespace-nowrap border transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#16A34A] border-[#16A34A] text-white font-semibold'
                    : 'bg-[#0B0E0D] border-[#232B28] text-[#A5B0AC] hover:text-[#E2E6E4]'
                }`}
              >
                {bg.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Interactive Dual-Layer Canvas Viewport */}
      <div
        className="flex-1 overflow-auto p-4 sm:p-6 flex items-center justify-center select-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            width: canvasSize.width,
            height: canvasSize.height,
          }}
          className="relative max-w-full border-2 border-[#232B28] shadow-2xl rounded overflow-hidden bg-[#0B0E0D]"
        >
          {/* Base Image Visual Backing when annotating an existing image */}
          {!isBlankDocMode && baseImageUrl && (
            <img
              src={baseImageUrl}
              alt={noteTitle}
              referrerPolicy="no-referrer"
              className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none"
            />
          )}

          {/* Layer 1: Background Image or Procedural Texture */}
          <canvas
            ref={bgCanvasRef}
            width={canvasSize.width}
            height={canvasSize.height}
            className="absolute inset-0 w-full h-full pointer-events-none"
          />

          {/* Layer 2: User Ink & Eraser Layer */}
          <canvas
            ref={inkCanvasRef}
            width={canvasSize.width}
            height={canvasSize.height}
            style={{ touchAction: 'none' }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onPointerLeave={handlePointerUp}
            className="absolute inset-0 w-full h-full cursor-crosshair"
          />
        </div>
      </div>
    </div>
  );
};
