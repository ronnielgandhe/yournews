# Quadrant Layout Fix - Bottom Panels

## Issue
Bottom quadrants (BL and BR) were overlapping the center terminal instead of positioning below it.

## Root Cause
The height calculation for top and bottom quadrants was incorrect:
- Old: `topH = center.y - gap * 2` (wrong reference point)
- Old: `botH = vh - (center.y + center.h) - safeBottom - gap * 2` (incorrect calculation)

## Solution
Fixed the quadrant height calculations to properly reference the safe zones:
- New: `topH = center.y - Ty - gap` (height from safe top to center top)
- New: `botH = By - (center.y + center.h) - gap` (height from center bottom to safe bottom)

## Changes Made

### 1. `/astro-theme/src/lib/layout.ts`
```typescript
// Before
const topH = Math.max(260, Math.floor(center.y - gap * 2));
const botH = Math.max(260, Math.floor(vh - (center.y + center.h) - safeBottom - gap * 2));

// After  
const topH = Math.max(260, Math.floor(center.y - Ty - gap));
const botH = Math.max(260, Math.floor(By - (center.y + center.h) - gap));
```

### 2. `/astro-theme/src/layouts/AppLayout.tsx`
- Commented out `<MobileDock />` and `<DesktopDock />`
- Removed bottom padding (dock no longer visible)

### 3. `/astro-theme/src/lib/layout.ts` - Safe Zones
- Reduced `safeBottom` from 90px to 32px (no dock)
- Applied to both `computeLayoutRects()` and `compute2UpLayout()`

### 4. `/astro-theme/src/components/global/YourNewsTerminal.tsx`
- Added logging to `reflowWindows()` to debug layout rects
- Improved center rect initialization
- Added reflow trigger after terminal measurement

## Expected Behavior

### Terminal Position
- Center of viewport (horizontally and vertically)
- Measured dynamically via `terminalRef.current.getBoundingClientRect()`

### Quadrant Layout
```
┌─────────┬─────────┬─────────┐
│   TL    │         │   TR    │
│ (trump) │ Center  │ (elon)  │
│         │Terminal │         │
├─────────┤         ├─────────┤
│   BL    │         │   BR    │
│ (CIBC)  │         │ (RBC)   │
│         │         │         │
└─────────┴─────────┴─────────┘
```

### Quadrant Positions
- **TL**: `(gap, safeTop+gap)` → width: `center.x - gap*2`, height: `center.y - (safeTop+gap) - gap`
- **TR**: `(center.x+center.w+gap, safeTop+gap)` → width: `vw - (center.x+center.w) - gap*2`, height: same as TL
- **BL**: `(gap, center.y+center.h+gap)` → width: same as TL, height: `(vh-safeBottom-gap) - (center.y+center.h) - gap`
- **BR**: `(center.x+center.w+gap, center.y+center.h+gap)` → width: same as TR, height: same as BL

## Testing
1. Open http://localhost:4321/
2. Type: `trump, elon, CIBC, RBC`
3. Verify:
   - Trump → Top Left
   - Elon → Top Right
   - CIBC → Bottom Left (BELOW center, not overlapping)
   - RBC → Bottom Right (BELOW center, not overlapping)
   - Center terminal fully visible

## Console Debugging
Check browser console for:
```javascript
[YN] Terminal rect updated: { x: 400, y: 300, w: 700, h: 360 }
[YN] Reflow layout rects: {
  center: { x: 400, y: 300, w: 700, h: 360 },
  TL: { x: 16, y: 64, w: 368, h: 220 },
  TR: { x: 1116, y: 64, w: 368, h: 220 },
  BL: { x: 16, y: 676, w: 368, h: 260 },
  BR: { x: 1116, y: 676, w: 368, h: 260 }
}
```

Verify:
- `BL.y` and `BR.y` should equal `center.y + center.h + gap` (676 in example)
- This places bottom panels BELOW the center terminal

## Files Modified
- ✅ `astro-theme/src/lib/layout.ts` - Fixed quadrant height calculations
- ✅ `astro-theme/src/layouts/AppLayout.tsx` - Hid docks, adjusted safe bottom
- ✅ `astro-theme/src/components/global/YourNewsTerminal.tsx` - Added debug logging

## No Dock Visible
- Dock components are commented out in AppLayout.tsx
- Safe bottom reduced from 90px to 32px
- More vertical space for bottom quadrants
