/**
 * Layout engine for quadrant-based window management
 * Reserves center space for main terminal and snaps topic windows to TL/TR/BL/BR
 */

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LayoutRects {
  TL: Rect;
  TR: Rect;
  BL: Rect;
  BR: Rect;
  OVERFLOW_ORIGIN: { x: number; y: number };
  bounds: Rect;
}

export type Quadrant = 'TL' | 'TR' | 'BL' | 'BR' | 'OVERFLOW';

/**
 * Compute layout rectangles for quadrants given viewport and center rect
 */
export function computeLayoutRects(
  vw: number,
  vh: number,
  center: Rect,
  gap = 16
): LayoutRects {
  const safeTop = 48; // menu bar
  const safeBottom = 32; // reduced - no dock visible

  const Lx = gap;
  const Rx = vw - gap;
  const Ty = safeTop + gap;
  const By = vh - safeBottom - gap;

  // Calculate quadrant dimensions
  const leftW = Math.max(360, Math.floor(center.x - gap * 2));
  const rightW = Math.max(360, Math.floor(vw - (center.x + center.w) - gap * 2));
  const topH = Math.max(260, Math.floor(center.y - Ty - gap));
  const botH = Math.max(260, Math.floor(By - (center.y + center.h) - gap));

  const TL: Rect = { x: Lx, y: Ty, w: leftW, h: topH };
  const TR: Rect = { x: center.x + center.w + gap, y: Ty, w: rightW, h: topH };
  const BL: Rect = { x: Lx, y: center.y + center.h + gap, w: leftW, h: botH };
  const BR: Rect = { x: center.x + center.w + gap, y: center.y + center.h + gap, w: rightW, h: botH };

  const OVERFLOW_ORIGIN = {
    x: Lx,
    y: Math.min(By - 280, center.y + center.h + gap),
  };

  const bounds: Rect = {
    x: gap,
    y: Ty,
    w: vw - gap * 2,
    h: By - Ty,
  };

  return { TL, TR, BL, BR, OVERFLOW_ORIGIN, bounds };
}

/**
 * Map window index to quadrant
 */
export function snapToQuadrant(index: number): Quadrant {
  const quadrants: Quadrant[] = ['TL', 'TR', 'BL', 'BR'];
  return quadrants[index] || 'OVERFLOW';
}

/**
 * Clamp window position/size to bounds
 */
export function clampToBounds(
  win: Rect,
  bounds: Rect,
  minW = 360,
  minH = 220
): Rect {
  const w = Math.max(minW, Math.min(win.w, bounds.w));
  const h = Math.max(minH, Math.min(win.h, bounds.h));
  const x = Math.min(Math.max(win.x, bounds.x), bounds.x + bounds.w - w);
  const y = Math.min(Math.max(win.y, bounds.y), bounds.y + bounds.h - h);
  return { x, y, w, h };
}

/**
 * Handle small screens with 2-up grid
 */
export function isSmallScreen(vw: number, vh: number): boolean {
  return vw < 1024 || vh < 720;
}

/**
 * Compute 2-up layout for small screens
 */
export function compute2UpLayout(
  vw: number,
  vh: number,
  center: Rect,
  gap = 16
): LayoutRects {
  const safeTop = 48;
  const safeBottom = 32; // reduced - no dock visible

  const Ty = safeTop + gap;
  const By = vh - safeBottom - gap;

  const halfW = Math.max(360, Math.floor((vw - gap * 3) / 2));
  const topH = Math.max(260, Math.floor((center.y - gap * 2) * 0.8));

  const TL: Rect = { x: gap, y: Ty, w: halfW, h: topH };
  const TR: Rect = { x: gap * 2 + halfW, y: Ty, w: halfW, h: topH };
  const BL: Rect = { x: gap, y: Ty + topH + gap, w: halfW, h: topH };
  const BR: Rect = { x: gap * 2 + halfW, y: Ty + topH + gap, w: halfW, h: topH };

  const OVERFLOW_ORIGIN = {
    x: gap,
    y: Ty + topH * 2 + gap * 2,
  };

  const bounds: Rect = {
    x: gap,
    y: Ty,
    w: vw - gap * 2,
    h: By - Ty,
  };

  return { TL, TR, BL, BR, OVERFLOW_ORIGIN, bounds };
}
