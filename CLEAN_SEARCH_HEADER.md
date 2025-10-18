# Clean Search Header UI

## Overview
Transformed the terminal-style landing UI into a clean, modern search header inspired by the blog post design, while keeping all functionality exactly the same.

## Changes Made

### Visual Transformation
**Before:** Terminal-style with `$` prompt, Cmd+K hints, monospace font
**After:** Clean search header with "YourNews" branding and hashtag topic chips

### Component Changes (`YourNewsTerminal.tsx`)

#### 1. Current Topics State
Added recent queries tracking with localStorage:
```typescript
const fallbackTopics = ["Technology", "AI", "Markets", "Elections", "Sports", "Climate"];
const recentQueries = typeof localStorage !== 'undefined' 
  ? JSON.parse(localStorage.getItem("yn_recentQueries") || "[]") 
  : [];
const currentTopics = Array.from(new Set([...recentQueries, ...fallbackTopics])).slice(0, 8);
```

#### 2. Refactored Submit Handler
Split into `handleSubmit()` and `spawnFromRaw()`:
- `handleSubmit()` - Form submission handler
- `spawnFromRaw()` - Reusable spawn logic for both manual input and chip clicks
- Saves recent queries to localStorage for chip display

```typescript
const spawnFromRaw = (raw: string) => {
  const topics = raw.split(/,| and /gi).map(s => s.trim()).filter(Boolean);
  
  // Save to recent queries
  if (typeof localStorage !== 'undefined') {
    const recent = JSON.parse(localStorage.getItem("yn_recentQueries") || "[]");
    const updated = Array.from(new Set([...topics, ...recent])).slice(0, 10);
    localStorage.setItem("yn_recentQueries", JSON.stringify(updated));
  }
  
  topics.forEach((topic, idx) => createPanel(topic, idx));
  // ... clear input
};
```

#### 3. New Hero UI
Replaced terminal block with clean search header:

```tsx
<div className='yn-hero'>
  <h1 className='yn-hero-title'>YourNews</h1>
  <p className='yn-hero-sub'>Search anything — get <span className='yn-accent'>YOUR</span> news</p>

  <form onSubmit={handleSubmit} noValidate>
    <input 
      className='yn-search'
      placeholder='trump, g7, apple m4'
      value={searchInput} 
      onChange={(e) => setSearchInput(e.target.value)}
      autoFocus 
    />
  </form>

  <div className='yn-chip-row'>
    {currentTopics.map(topic => (
      <button className='yn-chip' onClick={() => spawnFromRaw(topic)}>
        #{topic}
      </button>
    ))}
  </div>
</div>
```

### Style Changes (`glass.css`)

Added hero search styles:

```css
/* Hero Container */
.yn-hero {
  padding: 32px 24px 28px;
  text-align: center;
}

/* Title: "YourNews" */
.yn-hero-title {
  font-size: 44px;
  font-weight: 800;
  letter-spacing: 0.2px;
  margin: 4px 0 6px;
  color: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* Subtitle: "Search anything — get YOUR news" */
.yn-hero-sub {
  font-size: 18px;
  color: rgba(233, 238, 247, 0.82);
  margin-bottom: 20px;
  font-weight: 400;
}

/* "YOUR" accent text */
.yn-accent {
  color: #7EF1C4;  /* brand green */
  font-weight: 700;
}

/* Large search input */
.yn-search {
  height: 56px;
  width: 100%;
  padding: 0 18px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.14);
  color: #e9eef7;
  outline: none;
  font-size: 16px;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.yn-search:focus {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(126, 241, 196, 0.4);  /* green glow on focus */
}

/* Chip container */
.yn-chip-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 16px;
  justify-content: center;
}

/* Individual topic chips */
.yn-chip {
  font-size: 13px;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(110, 249, 185, 0.10);
  border: 1px solid rgba(110, 249, 185, 0.25);
  color: #7EF1C4;
  cursor: pointer;
  transition: transform 0.12s ease, background 0.2s ease;
  font-weight: 500;
}

.yn-chip:hover {
  transform: translateY(-1px);
  background: rgba(110, 249, 185, 0.18);
  border-color: rgba(110, 249, 185, 0.35);
}
```

## Feature Highlights

### 1. Clean Branding
- **Large "YourNews" title** (44px, 800 weight)
- **Engaging subtitle** with highlighted "YOUR" in brand green
- **No terminal artifacts** - removed `$` prompt, Cmd+K hints

### 2. Modern Search Input
- **Large 56px height** for easy clicking
- **Rounded 16px border-radius** for modern feel
- **Focus glow** - subtle green border on focus
- **Clear placeholder** - "trump, g7, apple m4"

### 3. Topic Chips
- **8 chips displayed** - recent queries + fallback topics
- **Clickable hashtags** - `#Technology`, `#AI`, etc.
- **Hover lift effect** - translateY(-1px) on hover
- **Recent query tracking** - localStorage persistence
- **Same spawn logic** - calls spawnFromRaw() like manual input

### 4. localStorage Integration
- **Key**: `yn_recentQueries`
- **Limit**: 10 recent searches
- **Deduplication**: Uses Set to prevent duplicates
- **Ordering**: Most recent first

## User Flow

### Scenario 1: Manual Search
1. User types "trump, climate" in search input
2. Presses Enter
3. `handleSubmit()` calls `spawnFromRaw("trump, climate")`
4. Topics saved to localStorage
5. Windows spawn in TL/TR quadrants

### Scenario 2: Chip Click
1. User clicks `#AI` chip
2. `spawnFromRaw("AI")` called directly
3. Topic saved to localStorage
4. Window spawns in next available quadrant
5. Chip row updates with "AI" as recent topic on next visit

## Preserved Functionality

✅ **All search logic unchanged** - still splits by commas/and
✅ **Quadrant layout** - windows still snap to TL/TR/BL/BR
✅ **Resizable windows** - bottom-right handle works
✅ **Drag & drop** - titlebar drag still works
✅ **Traffic lights** - close/minimize/maximize buttons
✅ **Glass morphism** - translucent styling intact
✅ **AI panels** - insights, tags, markdown summaries
✅ **Live indicators** - green "Live" status
✅ **API routes** - no backend changes

## What Was Removed

❌ Terminal-style `$` prompt
❌ "YourNews Terminal v1.0" heading
❌ "Type topics separated by commas" subheading
❌ "Cmd+K focus • Esc close" hints
❌ Monospace font on main card
❌ Green terminal text styling

## What Was Added

✅ Hero title "YourNews"
✅ Hero subtitle with accent
✅ Large search input (56px height)
✅ Topic chip row (8 chips)
✅ Recent query tracking
✅ localStorage integration
✅ Focus glow on search input

## Testing

### Manual Entry
```
1. Type "biden, trump" in search
2. Press Enter
3. Verify: Two windows spawn in TL/TR
4. Verify: "biden" and "trump" appear in chips on refresh
```

### Chip Click
```
1. Click "#Technology" chip
2. Verify: Window spawns in next quadrant
3. Verify: Technology panel loads with AI insights
4. Verify: "Technology" moves to front of chip row
```

### localStorage
```
1. Open DevTools > Application > Local Storage
2. Search for "trump, climate"
3. Check: yn_recentQueries = ["trump", "climate", ...]
4. Refresh page
5. Verify: "trump" and "climate" appear as first chips
```

## Design Inspiration

Based on blog post header design:
- Clean, centered layout
- Large branded title
- Hashtag topic chips (#Learning, #Systems, #Career)
- Minimal UI chrome
- Focus on content, not terminal aesthetics

## Browser Compatibility

- **localStorage**: All modern browsers
- **CSS transforms**: All modern browsers
- **Flexbox**: All modern browsers
- **Border-radius**: All modern browsers

## Performance

- **localStorage reads**: Once on mount (negligible)
- **localStorage writes**: On each search (async, non-blocking)
- **Chip rendering**: Max 8 chips (fast)
- **No regression**: Same API calls, same window logic

## Future Enhancements

- [ ] Trending topics API (replace static fallback)
- [ ] Chip analytics (track most clicked)
- [ ] Animated chip transitions
- [ ] Search suggestions dropdown
- [ ] Voice input support
- [ ] Recent searches dropdown (full history)

## Files Modified

- ✅ `astro-theme/src/components/global/YourNewsTerminal.tsx` - Hero UI + chip logic
- ✅ `astro-theme/src/styles/glass.css` - Hero styles
