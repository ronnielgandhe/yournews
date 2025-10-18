# ✨ Live Indicators - Quick Reference

## What's New?

### Main Terminal
```
┌─────────────────────────────────────┐
│ ○ ○ ○  ● Live          (pulsing)   │ ← NEW: Green "Live" indicator
├─────────────────────────────────────┤
│ YourNews Terminal v1.0              │
│ Type topics separated by commas     │
│ Cmd+K focus • Esc close             │
│                                     │
│ $ type anything...                  │
└─────────────────────────────────────┘
```

### Topic Windows
```
┌─────────────────────────────────────┐
│ ○ ○ ○  ● 2h ago        (static)    │ ← NEW: Latest article time
├─────────────────────────────────────┤
│ trump  #Trump #Politics #2024       │
│                                     │
│ ┌─────────────────────────────┐    │
│ │ 🎯 Key Insights             │    │
│ │ • Point 1                   │    │
│ │ • Point 2                   │    │
│ └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

## Visual Specs

| Element | Color | Style | Location |
|---------|-------|-------|----------|
| **Live Dot** | Green (#4ade80) | Pulsing 2s | Main terminal titlebar |
| **Live Text** | Green (#4ade80) | xs font-medium | Next to green dot |
| **Time Dot** | Cyan (#22d3ee) | Static | Topic window titlebar |
| **Time Text** | Cyan (#22d3ee) | xs font-medium | Next to cyan dot |

## Spacing

```
Traffic Lights    Gap    Indicator
     ○ ○ ○         →      ● Live
      8px gap     12px    6px gap
```

## Display Logic

### Main Terminal "Live"
- ✅ Shows: When `apiStatus === 'ok'`
- ❌ Hides: When API down or checking
- 🎬 Animates: Continuous pulse

### Topic Windows Time
- ✅ Shows: When data loaded + articles exist
- ❌ Hides: During loading or on error
- 📊 Content: `items[0].timeAgo` (most recent article)

## Time Format

- **Minutes**: `5m ago`, `45m ago`
- **Hours**: `2h ago`, `23h ago`
- **Days**: `1d ago`, `3d ago`

## Testing Quick Check

1. **Load page** → Should see green pulsing "Live" in main terminal
2. **Search "trump"** → Window shows cyan "Xh ago" or "Xm ago"
3. **API down** → Main terminal "Live" disappears
4. **Multiple windows** → Each shows its own latest time

## Code Locations

**Main Terminal**: Line ~152-164
```tsx
{apiStatus === 'ok' && (
  <div className='flex items-center gap-1.5 ml-3'>
    <div className='w-2 h-2 rounded-full bg-green-400 animate-pulse' />
    <span className='text-green-400 text-xs font-medium'>Live</span>
  </div>
)}
```

**Topic Windows**: Line ~231-237
```tsx
{win.data && win.data.items.length > 0 && win.data.items[0].timeAgo && (
  <div className='flex items-center gap-1.5 ml-3'>
    <div className='w-2 h-2 rounded-full bg-cyan-400' />
    <span className='text-cyan-400 text-xs font-medium'>{win.data.items[0].timeAgo}</span>
  </div>
)}
```

---

**Status**: ✅ Deployed to GitHub  
**Commit**: `b16d91c` - feat: Add live status indicators  
**Ready to test**: http://localhost:4321/
