# Structured Panel Output Implementation

## Overview
Successfully implemented structured AI-powered output for topic windows, featuring:
- **Key Insights**: 3-5 crisp bullet points (max 18 words each)
- **Tags**: 3-6 hashtag-style topic tags
- **Explainer**: Markdown summary with "Why it matters" section
- **Articles**: Ranked news items with metadata

## Architecture Changes

### Part 1: Server-Side Structured Output

#### New Function: `buildDigestStructured()`
**Location**: `/astro-theme/src/server/digest.ts`

**Signature**:
```typescript
async function buildDigestStructured(
  urls: string[],
  titles: { title: string; source?: string }[],
  style: 'bullets' | 'short' | 'detailed',
  useOpenAI: boolean,
  windowHours: number = 72
): Promise<StructuredDigestResult>
```

**Returns**:
```typescript
interface StructuredDigestResult {
  insights: string[];      // 3-5 bullets, max 18 words each
  tags: string[];          // 3-6 hashtags like "#Ukraine"
  summaryMd: string;       // Markdown with bullets + "Why it matters"
  usedOpenAI: boolean;     // True if OpenAI was used
}
```

**OpenAI Integration**:
- Uses `gpt-4o-mini` with JSON mode (`response_format: { type: 'json_object' }`)
- Temperature: 0.2 for consistent, factual output
- System prompt enforces structure and conciseness
- Validates and cleans response (truncates long items, ensures hashtag format)

**Fallback Strategy** (when OpenAI unavailable):
```typescript
function fallbackStructured(titles): StructuredDigestResult {
  // Insights: Top 4 headlines (rewritten as statements)
  // Tags: Extracted from sources + capitalized words (entities)
  // SummaryMd: Bullet list + generic "Why it matters" text
}
```

#### Updated API Endpoint
**Location**: `/astro-theme/src/pages/api/search-panels.ts`

**Changes**:
1. Import `buildDigestStructured` instead of `buildDigest`
2. Call with `windowHours` parameter
3. Return extended panel structure:

```typescript
{
  title: string;
  type: "topic";
  summaryMd: string;
  insights: string[];      // NEW
  tags: string[];          // NEW
  items: Article[];
  meta: { usedOpenAI: boolean; recentWindowHours: number }
}
```

4. Enhanced logging:
```typescript
console.info('[YN api] panel', { 
  topic, 
  insights: digest.insights?.length, 
  tags: digest.tags?.length, 
  items: ranked.length,
  usedOpenAI: digest.usedOpenAI 
});
```

### Part 2: UI Components & Styling

#### Updated Component Data Structure
**Location**: `/astro-theme/src/components/global/YourNewsTerminal.tsx`

**Interface Updates**:
```typescript
interface WindowData {
  // ... existing fields
  data: {
    summaryMd: string;
    insights: string[];     // NEW
    tags: string[];         // NEW
    items: Article[];
  } | null;
}
```

#### New Glass Card Layout
**HTML Structure**:
```tsx
<div className="yn-card">
  <header className="yn-header">
    <span className="yn-topic">{topic}</span>
    <div className="yn-chips">
      {tags.map(tag => <span className="yn-chip">{tag}</span>)}
    </div>
  </header>

  <section className="yn-insights">
    <div className="yn-insights-title">🎯 Key Insights</div>
    <ul className="yn-insights-list">
      {insights.map(insight => <li>{insight}</li>)}
    </ul>
  </section>

  <section className="yn-explainer">
    <ReactMarkdown>{summaryMd}</ReactMarkdown>
  </section>

  <section className="yn-articles">
    <div className="yn-section-title">📰 Articles</div>
    <ul>
      {items.map(item => (
        <li>
          <a href={item.url}>{item.title}</a>
          <div className="yn-article-meta">{item.source} · {item.timeAgo}</div>
        </li>
      ))}
    </ul>
  </section>
</div>
```

#### New CSS Styles
**Location**: `/astro-theme/src/styles/glass.css`

**Key Style Classes**:

1. **Topic Header**:
   - `.yn-topic`: Bold 20px title
   - `.yn-chips`: Flex container for tags
   - `.yn-chip`: Greenish pill badges with subtle transparency

2. **Key Insights Panel**:
   - `.yn-insights`: Bordered box with subtle background
   - `.yn-insights-title`: Blue accent color (#9ad1ff)
   - `.yn-insights-list`: Disc-style list with proper spacing

3. **Explainer Section**:
   - `.yn-explainer`: Markdown content container
   - Proper line-height (1.6) for readability
   - Strong tags highlighted in white

4. **Articles List**:
   - `.yn-articles`: Clean list layout
   - `.yn-article-meta`: Gray metadata text
   - Hover effects on links

**Color Palette**:
```css
Main Text:      #e6e9ef
White Accents:  #ffffff
Blue Titles:    #9ad1ff
Green Chips:    #7EF1C4 (bg: rgba(108, 235, 175, 0.10))
Link Color:     #d9e3ff
Meta Text:      #9ca3af
```

### Part 3: Dependencies

**Added**:
- `react-markdown@^9.x` - Markdown rendering
- `remark-gfm@^4.x` - GitHub Flavored Markdown support

**Usage**:
```tsx
import ReactMarkdown from 'react-markdown';

<ReactMarkdown
  components={{
    a: ({ node, ...props }) => (
      <a {...props} target='_blank' rel='noopener noreferrer' />
    ),
  }}
>
  {summaryMd}
</ReactMarkdown>
```

## Data Flow

### 1. User Input → API Request
```
User types: "trump, climate"
↓
YourNewsTerminal splits into topics
↓
For each topic: POST /api/search-panels
```

### 2. Server Processing
```
/api/search-panels receives { query: "trump" }
↓
1. fetchGoogleNews(topic, 20) → raw items
2. Filter by recency (72h default)
3. scoreItems() → ranked by relevance
4. buildDigestStructured() → OpenAI call
   ↓
   OpenAI returns JSON:
   {
     "insights": ["Trump announces...", "Policy changes...", ...],
     "tags": ["#Trump", "#Politics", "#2024Election"],
     "summaryMd": "- Development 1\n- Development 2\n\n**Why it matters:** ..."
   }
   ↓
   Validate & clean (truncate, ensure format)
   ↓
   OR fallback if OpenAI unavailable
5. Return panel with structured fields
```

### 3. UI Rendering
```
YourNewsTerminal receives response
↓
Updates window state with:
  - insights: string[]
  - tags: string[]
  - summaryMd: string
  - items: Article[]
↓
DraggableWindow renders:
  1. Header with topic + tag chips
  2. Key Insights bordered panel
  3. Markdown explainer
  4. Articles list with metadata
```

## Guardrails & Validation

### Server-Side
1. **Insights Limit**: Max 5 items, `.slice(0, 5)`
2. **Tag Limit**: Max 6 items, `.slice(0, 6)`
3. **Tag Length**: Truncated to 24 chars
4. **Hashtag Enforcement**: Prepends `#` if missing
5. **Heading Strip**: Removes top-level `#` from summaryMd
6. **Insight Length**: Max 150 chars per insight

### Client-Side
1. **Tag Display**: `.slice(0, 24)` in render
2. **Insights Display**: `.slice(0, 5)` in render
3. **Fallback Arrays**: `insights || []`, `tags || []`
4. **Conditional Rendering**: Only show sections if data exists

## Logging

### API Logs
```javascript
console.info('[YN api] panel', { 
  topic: 'trump',
  insights: 4,
  tags: 5, 
  items: 7,
  usedOpenAI: true 
});
```

### UI Logs
```javascript
console.info('[YN] panel', { 
  topic: 'climate',
  insights: 3,
  tags: 4,
  items: 7,
  usedOpenAI: true
});
```

## Testing Scenarios

### With OpenAI Enabled
**Input**: "trump, climate change"

**Expected**:
- 2 windows spawn
- Each has 3-5 insights about recent developments
- Tags extracted from content (#Trump, #ClimatePolicy, etc.)
- Markdown summary with bullets + "Why it matters"
- Articles list with timeAgo metadata

### With OpenAI Disabled
**Input**: "sports, tech"

**Expected**:
- Fallback insights from headlines
- Tags derived from sources + capitalized words
- Basic markdown summary
- `usedOpenAI: false` in logs

### Edge Cases
1. **No Results**: Empty arrays, friendly message
2. **API Error**: Error state shown, glass styling maintained
3. **Long Tags**: Truncated to 24 chars
4. **Many Insights**: Limited to 5 displayed

## Performance

### OpenAI Call
- **Model**: gpt-4o-mini (fast, cost-effective)
- **Timeout**: 30s (handled by existing controller)
- **Caching**: None (fresh data per query)

### Rendering
- **Markdown**: Lightweight react-markdown
- **Lists**: Virtualization not needed (max 7 articles)
- **Animations**: CSS-based, GPU-accelerated

## File Changes Summary

### Created
- None (all modifications to existing files)

### Modified
1. `/astro-theme/src/server/digest.ts`
   - Added `StructuredDigestResult` interface
   - Added `buildDigestStructured()` function
   - Added `fallbackStructured()` helper

2. `/astro-theme/src/pages/api/search-panels.ts`
   - Changed import from `buildDigest` to `buildDigestStructured`
   - Updated response structure to include `insights` and `tags`
   - Enhanced logging

3. `/astro-theme/src/components/global/YourNewsTerminal.tsx`
   - Updated `WindowData` interface
   - Added ReactMarkdown import
   - Updated data mapping in `createPanel()`
   - Completely redesigned `DraggableWindow` render with new layout
   - Added structured logging

4. `/astro-theme/src/styles/glass.css`
   - Added `.yn-*` class family for card layout
   - Added chip, insights, explainer, and articles styling
   - Maintained glass theme consistency

5. `/astro-theme/package.json`
   - Added `react-markdown` dependency
   - Added `remark-gfm` dependency

## Acceptance Criteria ✅

### Server
- ✅ POST `/api/search-panels` returns `insights`, `tags`, `summaryMd`
- ✅ OpenAI integration with JSON mode
- ✅ Fallback when OpenAI unavailable
- ✅ Validation and truncation applied
- ✅ Enhanced logging with all metrics

### UI
- ✅ Glass card layout matches design
- ✅ Topic title + tag chips in header
- ✅ Key Insights panel with bullets
- ✅ Markdown explainer with proper formatting
- ✅ Articles list with metadata
- ✅ ReactMarkdown renders safely
- ✅ Links open in new tab
- ✅ Drag/minimize/close still work
- ✅ No layout shifts
- ✅ Landing shell unchanged

### Styling
- ✅ Greenish chips (#7EF1C4)
- ✅ Blue section titles (#9ad1ff)
- ✅ Glass theme maintained
- ✅ Proper spacing and typography
- ✅ Hover effects on links

### Code Quality
- ✅ TypeScript types correct
- ✅ No compile errors
- ✅ Proper error handling
- ✅ Logging at appropriate points
- ✅ Fallback strategies in place

## Known Issues
None. All features working as expected.

## Future Enhancements
1. **Caching**: Cache OpenAI responses for repeated queries
2. **Streaming**: Stream insights as they're generated
3. **Customization**: User preferences for insight count/style
4. **Translations**: Multi-language support for summaries
5. **Entity Links**: Clickable entities in insights
6. **Timeline View**: Visual timeline of developments

---

**Status**: ✅ Complete and Production Ready  
**Date**: October 18, 2025  
**Server**: Running at http://localhost:4321/
