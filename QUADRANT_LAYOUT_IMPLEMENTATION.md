# Quadrant Layout Implementation

## Overview
Implemented a quadrant-based window management system that reserves the center for the main terminal and snaps up to 4 topic windows into TL/TR/BL/BR quadrants, with overflow windows cascading along the bottom.

## Architecture

### Layout Engine (`src/lib/layout.ts`)
New utility module providing:
- **computeLayoutRects()**: Calculates quadrant positions based on viewport and center rect
- **snapToQuadrant()**: Maps window index to TL/TR/BL/BR or OVERFLOW
- **clampToBounds()**: Ensures windows stay within viewport bounds
- **isSmallScreen()**: Detects viewports < 1024px or < 720px height
- **compute2UpLayout()**: Alternative 2-up grid for small screens

### Window State Enhancement
Extended `WindowData` interface with:
```typescript
{
  w: number;              // width
  h: number;              // height
  quadrant?: Quadrant;    // 'TL'|'TR'|'BL'|'BR'|'OVERFLOW'
}
```

## Key Features

### 1. Quadrant Snapping
- **First 4 windows**: Auto-snap to TL, TR, BL, BR quadrants
- **5+ windows**: Cascade in overflow strip with 24px X / 8px Y offsets
- **Center reserved**: Main terminal always visible in center

### 2. Resizable Windows
- **Bottom-right handle** (`.yn-resizer`) with nwse-resize cursor
- **Min size**: 360px × 220px
- **Max size**: Clamped to viewport bounds
- **Visual feedback**: Handle shows grip lines, hover state
- **User select disabled** during resize for smooth interaction

### 3. Dynamic Reflow
- **On spawn**: New windows placed in next available quadrant
- **On resize**: All windows recalculate positions to stay within bounds
- **Preserves user sizing**: If user resized a window, that size is maintained during reflow

### 4. Center Rect Measurement
- **terminalRef**: Measures main terminal's DOM rect on mount
- **Updates on resize**: Recalculates center position when viewport changes
- **Layout calculation**: All quadrants computed relative to center rect

### 5. Small Screen Adaptation
- **Threshold**: < 1024px width or < 720px height
- **2-up grid**: First two windows top-left/top-right
- **Wrapping overflow**: Additional windows wrap in 2-column grid

## Component Changes

### YourNewsTerminal.tsx
**Added State:**
- `terminalRef`: Ref for main terminal container
- `centerRectRef`: Stores measured terminal rect

**New Functions:**
- `reflowWindows()`: Recalculates all window positions/sizes
- `resizeWindow()`: Updates window w/h with clamping
- Enhanced `moveWindow()`: Clamps to layout bounds
- Enhanced `createPanel()`: Computes initial quadrant position

**Event Handlers:**
- Window resize listener triggers reflow
- Resize handle mousedown/move/up handlers

### DraggableWindow Component
**New State:**
- `isResizing`: Boolean tracking resize operation
- `resizeStart`: Stores initial mouse + window dimensions

**New Handlers:**
- `handleResizeStart()`: Captures resize start position
- Resize useEffect: Tracks mouse movement, updates w/h

**Render Changes:**
- Dynamic width/height from `win.w`/`win.h`
- Body height calculated as `win.h - 32` (titlebar)
- Resize handle rendered inside window-body

## CSS Updates (`src/styles/glass.css`)

### .glass-pane
- Added `position: absolute`
- Added `overflow: hidden`

### .window-body
- Added `overflow: auto`
- Added `max-height: 100%`
- Added `position: relative` (for resizer positioning)

### .yn-resizer
- 16px × 16px handle in bottom-right
- Translucent white background (12% opacity)
- Hover state (22% opacity)
- Grip lines via ::before/::after pseudo-elements
- `cursor: nwse-resize`

## Layout Algorithm

### Initial Placement
```typescript
const quad = snapToQuadrant(windowIndex);
if (quad === 'TL') → rects.TL
if (quad === 'TR') → rects.TR
if (quad === 'BL') → rects.BL
if (quad === 'BR') → rects.BR
else → OVERFLOW_ORIGIN + offset
```

### Quadrant Dimensions
```typescript
leftW  = Math.max(360, center.x - gap*2)
rightW = Math.max(360, vw - (center.x + center.w) - gap*2)
topH   = Math.max(260, center.y - gap*2)
botH   = Math.max(260, vh - (center.y + center.h) - safeBottom - gap*2)
```

### Safe Zones
- **Top**: 48px (menu bar)
- **Bottom**: 90px (dock)
- **Gap**: 16px between windows

## User Interactions

### Spawn Windows
1. Type "trump, climate, switzerland, g7"
2. Four windows snap to TL/TR/BL/BR
3. Center terminal remains visible
4. Each window auto-sized to quadrant

### Resize Windows
1. Hover over bottom-right corner
2. Cursor changes to nwse-resize
3. Drag to resize
4. Size clamped to 360×220 min, viewport max

### Drag Windows
1. Drag titlebar to move
2. Position clamped to viewport bounds
3. Center terminal remains accessible

### Overflow Behavior
1. Type fifth topic
2. Window appears in overflow strip
3. Cascade offset: 24px right, 8px down
4. Doesn't cover center terminal

## Testing Checklist

- [x] Spawn 4 windows → snap to TL/TR/BL/BR
- [x] Center terminal visible and accessible
- [x] Resize via bottom-right handle
- [x] Min size enforced (360×220)
- [x] Spawn 5th window → overflow cascade
- [x] Viewport resize → windows reflow
- [x] Drag still works
- [x] Click brings to front (z-index)
- [x] Minimize/close still work
- [x] Glass styling intact
- [x] Markdown/insights/tags intact
- [x] Live indicators intact

## Performance Notes

- **Reflow triggered**: Only on viewport resize, not every interaction
- **Clamping**: Runs on every move/resize but is O(1)
- **Layout calculation**: Memoized in refs, not recalculated on every render
- **No layout thrashing**: Updates batched via setState

## Future Enhancements (Optional)

1. **localStorage persistence**: Save window positions/sizes
2. **Snap zones**: Visual guides when dragging near quadrants
3. **Maximize**: Double-click titlebar to fill quadrant
4. **Keyboard navigation**: Arrow keys to move between windows
5. **Grid overlay**: Show quadrant boundaries in debug mode

## Browser Compatibility

- **backdrop-filter**: Supported in modern Chrome/Safari/Firefox
- **CSS variables**: All major browsers
- **Mouse events**: Standard DOM API
- **Resize observer**: Could enhance with ResizeObserver for terminal measurement

## Code Examples

### Creating a window in TL quadrant
```typescript
const rects = computeLayoutRects(vw, vh, centerRect);
const newWindow = {
  x: rects.TL.x,
  y: rects.TL.y,
  w: rects.TL.w,
  h: rects.TL.h,
  quadrant: 'TL'
};
```

### Resizing with bounds
```typescript
const handleResize = (newW, newH) => {
  const clamped = clampToBounds(
    { x: win.x, y: win.y, w: newW, h: newH },
    rects.bounds,
    360, // minW
    220  // minH
  );
  setWindows(prev => prev.map(w => 
    w.id === id ? { ...w, w: clamped.w, h: clamped.h } : w
  ));
};
```

## Migration Notes

### Breaking Changes
- **None**: Existing windows will render, just need w/h initialization
- **State migration**: Old windows missing w/h will get default sizes from layout engine

### Backward Compatibility
- Glass styling: Preserved
- Drag behavior: Enhanced, not changed
- API calls: Unchanged
- Markdown rendering: Unchanged

## Summary

This implementation provides a professional window management system that:
- Keeps the central terminal always visible
- Auto-organizes up to 4 windows in quadrants
- Gracefully handles overflow with cascading
- Supports user-controlled resizing within bounds
- Adapts to different screen sizes
- Maintains all existing features (glass UI, AI panels, live indicators)
