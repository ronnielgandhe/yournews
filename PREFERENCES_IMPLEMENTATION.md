# User Preferences Implementation

## Overview
Added comprehensive user preferences system with hover-based settings UI, localStorage persistence, and full backend integration. All existing functionality preserved.

## Files Created
- **src/lib/prefs.ts** - Single source of truth for preferences (DEFAULT_PREFS, loadPrefs, savePrefs)

## Files Modified

### Frontend
1. **src/components/global/MacToolbar.tsx**
   - Added settings popover with hover trigger
   - 6 preference controls: Summary Level (radio), Time Window (segmented), Per-Domain Cap (segmented), Recency Weight (slider), AI Toggle (switch), Default Profile (select)
   - Auto-saves to localStorage on every change

2. **src/components/global/YourNewsTerminal.tsx**
   - Loads preferences with `loadPrefs()` on search/chip click
   - Sends `preferences` in POST body to `/api/search-panels`
   - Added `usedOpenAI` boolean to WindowData interface
   - Shows loading shimmer (skeleton UI) instead of spinner
   - Displays AI badge ("AI: On" or "AI: Off") in panel titlebar

3. **src/styles/glass.css**
   - Added `.yn-skel` and `@keyframes yn-shimmer` for loading animation
   - Added `.yn-settings-popover` and all settings UI styles
   - Added `.yn-ai-badge` styles (on/off variants)

### Backend
4. **src/pages/api/search-panels.ts**
   - Accepts `req.body.preferences` (optional)
   - Applies preference overrides to ranking profile: `perDomainCap`, `recencyAlpha`, `windowHours`
   - Passes `summaryLevel` and `openai` toggle to digest builder
   - Returns `meta.usedOpenAI` in panel response

5. **src/server/digest.ts**
   - Changed signature: `buildDigestStructured(urls, titles, summaryLevel, useOpenAI, windowHours)`
   - Adjusts OpenAI prompt based on summaryLevel:
     - **short**: 2-3 insights, 2 takeaways, 2-3 actions, 3-5 tags
     - **medium**: 3-5 insights, 3 takeaways, 3-4 actions, 5-6 tags
     - **long**: 5-7 insights (with context), 4-5 takeaways, 5-6 actions, 6-8 tags
   - Returns `usedOpenAI: false` when AI disabled or fallback triggered

## Preferences Schema
```typescript
export type AppPrefs = {
  summaryLevel: 'short' | 'medium' | 'long';
  windowHours: 24 | 36 | 48 | 72;
  perDomainCap: 1 | 2 | 3;
  recencyAlpha: number; // 0..0.6
  openai: boolean;
  defaultProfile: 'default' | 'technology' | 'finance' | 'ai' | 'sports' | 'world';
};
```

## User Flow
1. **Hover "Settings"** in top navbar → popover appears
2. **Adjust preferences** → auto-saved to localStorage (`yn_prefs`)
3. **Search or click hashtag** → preferences loaded and sent to API
4. **API applies overrides** → ranking uses custom `perDomainCap`, `recencyAlpha`, `windowHours`
5. **Digest respects settings** → OpenAI called only if `openai: true`, summary length varies
6. **Panel shows AI badge** → "AI: On" (green) or "AI: Off" (gray) based on `usedOpenAI`
7. **Loading shimmer** → skeleton UI with animated gradient while fetching

## Testing Checklist
- [x] Settings popover opens on hover, stays open when hovering popover itself
- [x] All 6 controls update state and save to localStorage
- [x] Page refresh preserves settings
- [x] AI toggle off → panels show "AI: Off" badge and fallback text
- [x] Per-domain cap 3 → more domain diversity in results
- [x] Recency alpha 0.55 → fresher items prioritized
- [x] Summary level "long" → noticeably longer digest sections
- [x] Loading shimmer displays during fetch, disappears on render
- [x] No console errors or broken layouts
- [x] Existing search/chip flows unchanged

## Acceptance Criteria Met
✅ No code paths renamed  
✅ Existing UX preserved  
✅ Preferences persist across reloads  
✅ Backend deterministically applies overrides  
✅ Loading shimmer shows/hides correctly  
✅ AI badge displays based on actual OpenAI usage  
✅ No runtime errors

## Commit
```
77a3ba9 - Add user preferences with settings popover, loading shimmer, and AI badge
```

6 files changed, 405 insertions(+), 24 deletions(-)
- Created: src/lib/prefs.ts
- Modified: MacToolbar.tsx, YourNewsTerminal.tsx, glass.css, search-panels.ts, digest.ts
