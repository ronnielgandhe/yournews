# Glass Pane Styling - Testing Guide

## Quick Test Checklist

### 1. Visual Verification
Open `http://localhost:4321/` and verify:

#### Main Terminal
- [ ] Window has translucent glass appearance
- [ ] Wallpaper is visible through the window
- [ ] Only three traffic lights visible in top-left (no title text)
- [ ] Traffic lights are red, yellow, green from left to right
- [ ] Titlebar is slim (approximately 32px tall)
- [ ] Input field and terminal content clearly visible
- [ ] Hover over window shows subtle lift effect

#### Spawned Windows
- [ ] Search for a topic (e.g., "technology, climate change")
- [ ] New windows appear with same glass styling
- [ ] Topic title NOT visible in titlebar (only traffic lights)
- [ ] Each window has translucent background
- [ ] Content is readable against glass pane

### 2. Interaction Testing

#### Dragging
- [ ] Hover over titlebar shows "grab" cursor
- [ ] Click and drag titlebar moves window
- [ ] While dragging, cursor changes to "grabbing"
- [ ] Cannot drag by clicking window body
- [ ] Window moves smoothly without lag

#### Traffic Lights (Spawned Windows)
- [ ] Red dot closes the window when clicked
- [ ] Yellow dot minimizes the window when clicked
- [ ] Green dot is present but non-functional (expected)
- [ ] Clicking traffic lights doesn't initiate drag

#### Keyboard Shortcuts
- [ ] `Cmd+K` (or `Ctrl+K`) focuses the input field
- [ ] `Esc` closes the frontmost spawned window
- [ ] Shortcuts work regardless of focus

### 3. Multiple Windows
- [ ] Create 3-4 windows
- [ ] All windows have consistent glass styling
- [ ] Windows stack with proper z-index
- [ ] Clicking a window brings it to front
- [ ] Each window independently draggable
- [ ] Hover effects work on all windows

### 4. Content Verification

#### Main Terminal
- [ ] Welcome text visible and readable
- [ ] Input placeholder text clear
- [ ] Active/Total window counter appears when windows exist
- [ ] Text has good contrast against glass background

#### Result Windows
- [ ] Loading spinner displays during fetch
- [ ] Summary text displays with proper formatting
- [ ] Article links are blue and clickable
- [ ] Source and time metadata visible
- [ ] Scroll works when content exceeds window height

### 5. Responsive Behavior
- [ ] Glass blur effect is smooth (no artifacts)
- [ ] Hover lift animation is subtle and smooth
- [ ] No flickering or rendering issues
- [ ] Backdrop blur works (wallpaper is blurred behind window)

### 6. Edge Cases

#### Wallpaper Testing
- [ ] Change wallpaper (if multiple options)
- [ ] Glass effect adapts to different backgrounds
- [ ] Text remains readable on all backgrounds

#### Window Positioning
- [ ] Drag window to edge of screen
- [ ] Window cannot be dragged off-screen (x/y min: 0)
- [ ] Multiple windows cascade properly (offset positioning)

#### Error States
- [ ] If API is down, red warning appears in top-left
- [ ] Error message displays properly in window body
- [ ] Glass styling maintained even with errors

### 7. Browser Testing

#### Chrome/Edge
- [ ] Glass blur renders correctly
- [ ] All animations smooth
- [ ] Traffic lights functional

#### Firefox
- [ ] Backdrop blur supported (Firefox 103+)
- [ ] Glass effect visible
- [ ] All features work

#### Safari
- [ ] -webkit-backdrop-filter works
- [ ] Glass appearance correct
- [ ] No visual glitches

### 8. Performance

#### Smooth Operation
- [ ] Window dragging has no lag
- [ ] Hover effects instant (<16ms)
- [ ] Multiple windows don't slow down UI
- [ ] Blur doesn't cause performance issues

#### Memory
- [ ] Opening/closing windows doesn't leak memory
- [ ] Long sessions remain responsive

## Test Scenarios

### Scenario 1: Single Search
1. Load page
2. Type "artificial intelligence"
3. Press Enter
4. Verify glass window spawns
5. Check content loads correctly
6. Drag window around
7. Close with red dot

### Scenario 2: Multiple Topics
1. Load page
2. Type "tech, sports, weather"
3. Press Enter
4. Verify 3 windows spawn with cascade
5. Each has glass styling
6. Click different windows to bring to front
7. Close all with Esc key

### Scenario 3: Minimization
1. Create a window
2. Click yellow dot
3. Window disappears
4. Active count decreases
5. Total count stays same

### Scenario 4: Error Handling
1. Stop backend server
2. Search for topic
3. Error displays in glass window
4. Red "API down" banner appears
5. Styling remains consistent

## Expected Results

### Visual
- **Background**: Very subtle white tint (6% opacity)
- **Border**: Fine white outline (12% opacity)
- **Shadow**: Deep, multi-layered shadow
- **Blur**: 18px backdrop blur with 120% saturation
- **Traffic Lights**: 12px circles, proper macOS colors
- **Titlebar**: 32px tall gradient strip
- **Hover**: 1px upward lift with enhanced shadow

### Behavior
- **Dragging**: Smooth, titlebar-only, visual feedback
- **Focus**: Click brings window to front
- **Controls**: Red closes, yellow minimizes
- **Keyboard**: Cmd+K focuses, Esc closes

### Performance
- **FPS**: 60fps for all animations
- **Lag**: <16ms for interactions
- **Load**: Fast initial render
- **Memory**: Stable over time

## Known Issues (None Expected)

If you encounter any issues, check:
1. Browser supports backdrop-filter (modern browsers only)
2. Hardware acceleration enabled
3. No conflicting CSS from browser extensions
4. Console for JavaScript errors

## Success Criteria

✅ All windows have glass appearance
✅ No title text in headers
✅ Only traffic lights visible in titlebar
✅ Dragging works smoothly
✅ Content readable on glass
✅ Hover effects work
✅ All controls functional
✅ Performance is smooth
✅ No visual glitches
✅ Consistent styling everywhere

## Testing Complete! 🎉

If all checkboxes pass:
- Glass pane implementation is successful
- UI is polished and professional
- macOS aesthetic achieved
- User experience is smooth
- Code is clean and maintainable
