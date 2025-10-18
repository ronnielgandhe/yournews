# Live Status Indicators - Implementation Summary

## Overview
Added real-time status indicators to both the main terminal and spawned topic windows.

## Changes Made

### 1. Main Terminal - Live Indicator
**Location**: Main terminal titlebar (left side after traffic lights)

**Features**:
- Green pulsing dot (animated)
- "Live" text in green
- Only shows when API status is 'ok'
- Positioned next to traffic lights

**Implementation**:
```tsx
{apiStatus === 'ok' && (
  <div className='flex items-center gap-1.5 ml-3'>
    <div className='w-2 h-2 rounded-full bg-green-400 animate-pulse' />
    <span className='text-green-400 text-xs font-medium'>Live</span>
  </div>
)}
```

### 2. Topic Windows - Latest Update Time
**Location**: Each spawned window titlebar (left side after traffic lights)

**Features**:
- Cyan dot (static, not pulsing)
- Shows time of most recent article (e.g., "2h ago", "5m ago")
- Only shows when data is loaded and articles exist
- Uses the first article's timeAgo value
- Positioned next to traffic lights

**Implementation**:
```tsx
{win.data && win.data.items.length > 0 && win.data.items[0].timeAgo && (
  <div className='flex items-center gap-1.5 ml-3'>
    <div className='w-2 h-2 rounded-full bg-cyan-400' />
    <span className='text-cyan-400 text-xs font-medium'>{win.data.items[0].timeAgo}</span>
  </div>
)}
```

## Visual Design

### Main Terminal
```
┌───────────────────────────────┐
│ ○ ○ ○  ● Live                │ ← Green pulsing dot + "Live"
├───────────────────────────────┤
│ YourNews Terminal v1.0        │
│ ...                           │
└───────────────────────────────┘
```

### Topic Windows
```
┌───────────────────────────────┐
│ ○ ○ ○  ● 2h ago              │ ← Cyan dot + latest article time
├───────────────────────────────┤
│ trump  #Trump #Politics       │
│ ...                           │
└───────────────────────────────┘
```

## Color Scheme

| Indicator | Color | Hex | Animation |
|-----------|-------|-----|-----------|
| **Main Terminal Live** | Green | `#4ade80` (green-400) | Pulsing |
| **Topic Latest Update** | Cyan | `#22d3ee` (cyan-400) | Static |

## CSS Updates

Added pulse animation:
```css
.window-titlebar .animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

## Layout

### Titlebar Structure
```
┌─────────────────────────────────────────┐
│ [Traffic Lights] [Live/Time Indicator]  │
│ ○ ○ ○           ● Live / ● 2h ago       │
└─────────────────────────────────────────┘
```

**Spacing**:
- Traffic lights: Default gap (8px from CSS)
- Indicator: 12px margin-left (ml-3 = 0.75rem)
- Dot to text: 6px gap (gap-1.5)

## Behavior

### Main Terminal "Live"
- **Shows**: When `apiStatus === 'ok'`
- **Hides**: When API is down or checking
- **Animation**: Continuous 2s pulse

### Topic Windows Time
- **Shows**: When window has loaded data AND has articles
- **Content**: Most recent article's `timeAgo` value
- **Updates**: When window data refreshes
- **No animation**: Static display

## Time Display Format

Uses existing `timeAgo()` function:
- `Xm ago` - Less than 1 hour
- `Xh ago` - Less than 1 day
- `Xd ago` - 1 day or more

## Files Modified

1. **YourNewsTerminal.tsx**
   - Added Live indicator to main terminal titlebar
   - Added latest update time to topic window titlebars
   
2. **glass.css**
   - Added pulse animation keyframes
   - Added animation class for titlebar

## Testing Checklist

- [ ] Main terminal shows green "Live" when API is ok
- [ ] Main terminal hides "Live" when API is down
- [ ] Green dot pulses smoothly
- [ ] Topic windows show cyan dot + time after loading
- [ ] Time format is correct (e.g., "2h ago")
- [ ] Time reflects the most recent article
- [ ] Indicators don't break titlebar layout
- [ ] Dragging still works properly
- [ ] Traffic lights still functional

## Screenshots

**Main Terminal**:
- Green pulsing dot next to traffic lights
- "Live" text in green-400

**Topic Window**:
- Cyan static dot next to traffic lights
- Latest article time (e.g., "2h ago") in cyan-400

## Future Enhancements

1. **Auto-refresh**: Update times automatically every minute
2. **Click interaction**: Click time to refresh that window
3. **Status tooltip**: Hover to see full timestamp
4. **Multiple indicators**: Show article count badge
5. **Color coding**: Red if articles > 24h old, green if fresh

---

**Status**: ✅ Complete  
**Date**: October 18, 2025  
**Testing**: Ready for verification  
**Server**: http://localhost:4321/
