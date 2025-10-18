import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  computeLayoutRects, 
  snapToQuadrant, 
  clampToBounds, 
  isSmallScreen, 
  compute2UpLayout,
  type Quadrant,
  type Rect
} from '../../lib/layout';

interface WindowData {
  id: string;
  topic: string;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  quadrant?: Quadrant;
  minimized: boolean;
  loading: boolean;
  error: string | null;
  data: {
    summaryMd: string;
    insights: string[];
    takeaways?: string[];
    actions?: string[];
    watch?: string[];
    tags: string[];
    items: Array<{
      title: string;
      url: string;
      source: string;
      pubDate?: string;
      timeAgo?: string;
    }>;
  } | null;
}

function timeAgo(date: string | undefined): string {
  if (!date) return '';
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function YourNewsTerminal() {
  const [windows, setWindows] = useState<WindowData[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [maxZ, setMaxZ] = useState(1000);
  const [apiStatus, setApiStatus] = useState<'ok' | 'down' | 'unknown'>('unknown');
  const inputRef = useRef<HTMLInputElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  // Current topics for chips (trending + recent)
  const trendingTopics = ["Technology", "AI", "Markets", "Climate", "Security", "Product"];
  const recentQueries = typeof localStorage !== 'undefined' 
    ? JSON.parse(localStorage.getItem("yn_recentQueries") || "[]") 
    : [];

  // Map topic to chip color class
  function chipClassFor(topic: string): string {
    const t = topic.toLowerCase();
    if (['learning', 'technology', 'climate', 'security', 'product'].some(k => t.includes(k))) {
      return 'yn-chip yn-chip--green';
    }
    if (['ai', 'science', 'space', 'data'].some(k => t.includes(k))) {
      return 'yn-chip yn-chip--blue';
    }
    return 'yn-chip yn-chip--violet';
  }

  // Map topic to ranking profile
  type RankProfileName = 'default' | 'technology' | 'finance' | 'sports' | 'world' | 'ai';
  function mapTopicToProfile(topic: string): RankProfileName {
    const s = topic.toLowerCase();
    if (s.includes('tech') || s.includes('apple') || s.includes('semiconductor')) return 'technology';
    if (s.includes('market') || s.includes('stocks') || s.includes('fed')) return 'finance';
    if (s.includes('ai') || s.includes('llm') || s.includes('model')) return 'ai';
    return 'default';
  }
  
  // Center rect for main terminal - measured dynamically
  // Initialize with viewport-centered estimate
  const centerRectRef = useRef<Rect>({ 
    x: typeof window !== 'undefined' ? window.innerWidth / 2 - 350 : 400, 
    y: typeof window !== 'undefined' ? window.innerHeight / 2 - 180 : 200, 
    w: 700, 
    h: 360 
  });

  // Measure main terminal position
  useEffect(() => {
    if (!terminalRef.current) return;
    const updateCenterRect = () => {
      if (!terminalRef.current) return;
      const rect = terminalRef.current.getBoundingClientRect();
      centerRectRef.current = {
        x: rect.left,
        y: rect.top,
        w: rect.width,
        h: rect.height,
      };
      console.info('[YN] Terminal rect updated:', centerRectRef.current);
      // Reflow windows after terminal position is known
      if (windows.length > 0) {
        reflowWindows();
      }
    };
    // Initial measurement after a short delay to ensure layout is complete
    const timer = setTimeout(updateCenterRect, 100);
    updateCenterRect();
    window.addEventListener('resize', updateCenterRect);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateCenterRect);
    };
  }, []);

  // Reflow windows to quadrants
  const reflowWindows = () => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const rects = isSmallScreen(vw, vh) 
      ? compute2UpLayout(vw, vh, centerRectRef.current)
      : computeLayoutRects(vw, vh, centerRectRef.current);

    console.info('[YN] Reflow layout rects:', {
      center: centerRectRef.current,
      TL: rects.TL,
      TR: rects.TR,
      BL: rects.BL,
      BR: rects.BR,
    });

    setWindows(prev => {
      return prev.map((win, i) => {
        const quad = snapToQuadrant(i);
        let target: Rect;

        if (quad === 'TL') target = rects.TL;
        else if (quad === 'TR') target = rects.TR;
        else if (quad === 'BL') target = rects.BL;
        else if (quad === 'BR') target = rects.BR;
        else {
          // OVERFLOW: cascade along bottom
          const overflowIndex = i - 4;
          target = {
            x: rects.OVERFLOW_ORIGIN.x + overflowIndex * 24,
            y: rects.OVERFLOW_ORIGIN.y + overflowIndex * 8,
            w: 420,
            h: 280,
          };
        }

        // Preserve user-resized dimensions if they exist, otherwise use target
        const w = win.w || target.w;
        const h = win.h || target.h;
        const clamped = clampToBounds({ x: target.x, y: target.y, w, h }, rects.bounds);

        return {
          ...win,
          quadrant: quad,
          x: clamped.x,
          y: clamped.y,
          w: clamped.w,
          h: clamped.h,
        };
      });
    });
  };

  // Reflow on window resize
  useEffect(() => {
    window.addEventListener('resize', reflowWindows);
    return () => window.removeEventListener('resize', reflowWindows);
  }, [windows.length]);

  useEffect(() => {
    console.info('[YN] UI mounted');
    fetch('/api/ai/status')
      .then(res => res.json())
      .then(data => { console.info('[YN] status', data); setApiStatus('ok'); })
      .catch(err => { console.error('[YN] Health check failed:', err); setApiStatus('down'); });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape' && windows.length > 0) {
        const frontWindow = windows.reduce((prev, curr) => curr.z > prev.z ? curr : prev);
        closeWindow(frontWindow.id);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [windows]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const raw = (inputRef.current?.value ?? searchInput).trim();
    if (!raw) return;
    spawnFromRaw(raw);
    return false;
  };

  const spawnFromRaw = (raw: string, options?: { profile?: RankProfileName }) => {
    console.info('[YN] submit', raw, options);
    const topics = raw.split(/,| and /gi).map(s => s.trim()).filter(Boolean);
    
    // Save to recent queries in localStorage (only if not from chip click)
    if (!options?.profile && typeof localStorage !== 'undefined') {
      const recent = JSON.parse(localStorage.getItem("yn_recentQueries") || "[]");
      const updated = Array.from(new Set([...topics, ...recent])).slice(0, 10);
      localStorage.setItem("yn_recentQueries", JSON.stringify(updated));
    }
    
    topics.forEach((topic, idx) => createPanel(topic, idx, options?.profile));
    if (inputRef.current) inputRef.current.value = '';
    setSearchInput('');
  };

  const createPanel = async (topic: string, index: number, profile?: RankProfileName) => {
    if (profile) {
      console.info('[YN] trending chip clicked', topic, profile);
    }
    console.info('[YN] spawn', topic);
    const windowId = `${topic}-${Date.now()}-${index}`;
    
    // Compute initial layout
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const rects = isSmallScreen(vw, vh) 
      ? compute2UpLayout(vw, vh, centerRectRef.current)
      : computeLayoutRects(vw, vh, centerRectRef.current);
    
    const currentIndex = windows.length + index;
    const quad = snapToQuadrant(currentIndex);
    let initialRect: Rect;

    if (quad === 'TL') initialRect = rects.TL;
    else if (quad === 'TR') initialRect = rects.TR;
    else if (quad === 'BL') initialRect = rects.BL;
    else if (quad === 'BR') initialRect = rects.BR;
    else {
      const overflowIndex = currentIndex - 4;
      initialRect = {
        x: rects.OVERFLOW_ORIGIN.x + overflowIndex * 24,
        y: rects.OVERFLOW_ORIGIN.y + overflowIndex * 8,
        w: 420,
        h: 280,
      };
    }

    setWindows(prev => [...prev, {
      id: windowId, 
      topic, 
      x: initialRect.x, 
      y: initialRect.y, 
      w: initialRect.w,
      h: initialRect.h,
      z: maxZ + index,
      quadrant: quad,
      minimized: false, 
      loading: true, 
      error: null, 
      data: null
    }]);
    setMaxZ(prev => prev + index + 1);
    try {
      console.info('[YN] Fetching POST /api/search-panels for:', topic, profile ? `profile: ${profile}` : '');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      const response = await fetch('/api/search-panels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: topic, profile }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      console.info('[YN] Response status:', response.status, response.statusText);
      if (!response.ok) {
        const errorText = await response.text().catch(() => `HTTP ${response.status}`);
        console.error('[YN] API error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      const result = await response.json();
      console.info('[YN] Response JSON:', result);
      if (!result.panels || !Array.isArray(result.panels) || result.panels.length === 0) {
        throw new Error('Empty panel response');
      }
      const panel = result.panels[0];
      if (!panel.summaryMd || !Array.isArray(panel.items)) {
        console.error('[YN] Invalid panel structure:', panel);
        throw new Error('Invalid panel');
      }
      console.info('[YN] panel', { 
        topic, 
        insights: panel.insights?.length || 0,
        takeaways: panel.takeaways?.length || 0,
        actions: panel.actions?.length || 0,
        watch: panel.watch?.length || 0,
        tags: panel.tags?.length || 0, 
        items: panel.items.length,
        usedOpenAI: panel.meta?.usedOpenAI 
      });
      setWindows(prev => prev.map(w => w.id === windowId ? {
        ...w,
        loading: false,
        data: {
          summaryMd: panel.summaryMd,
          insights: panel.insights || [],
          takeaways: panel.takeaways || [],
          actions: panel.actions || [],
          watch: panel.watch || [],
          tags: panel.tags || [],
          items: panel.items.slice(0, 7).map((item: any) => ({ ...item, timeAgo: timeAgo(item.pubDate) })),
        }
      } : w));
      setMaxZ(prev => prev + 1);
      setWindows(prev => prev.map(w => w.id === windowId ? { ...w, z: maxZ + 1 } : w));
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load';
      console.error('[YN] error', topic, errorMsg, err);
      setWindows(prev => prev.map(w => w.id === windowId ? { ...w, loading: false, error: errorMsg } : w));
    }
  };

  const closeWindow = (id: string) => setWindows(prev => prev.filter(w => w.id !== id));
  const toggleMinimize = (id: string) => setWindows(prev => prev.map(w => w.id === id ? { ...w, minimized: !w.minimized } : w));
  const bringToFront = (id: string) => { setMaxZ(prev => prev + 1); setWindows(prev => prev.map(w => w.id === id ? { ...w, z: maxZ + 1 } : w)); };
  
  const moveWindow = (id: string, dx: number, dy: number) => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const rects = isSmallScreen(vw, vh) 
      ? compute2UpLayout(vw, vh, centerRectRef.current)
      : computeLayoutRects(vw, vh, centerRectRef.current);

    setWindows(prev => prev.map(w => {
      if (w.id !== id) return w;
      const newX = w.x + dx;
      const newY = w.y + dy;
      const clamped = clampToBounds({ x: newX, y: newY, w: w.w, h: w.h }, rects.bounds);
      return { ...w, x: clamped.x, y: clamped.y };
    }));
  };

  const resizeWindow = (id: string, newW: number, newH: number) => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const rects = isSmallScreen(vw, vh) 
      ? compute2UpLayout(vw, vh, centerRectRef.current)
      : computeLayoutRects(vw, vh, centerRectRef.current);

    setWindows(prev => prev.map(w => {
      if (w.id !== id) return w;
      const clamped = clampToBounds({ x: w.x, y: w.y, w: newW, h: newH }, rects.bounds, 360, 220);
      return { ...w, w: clamped.w, h: clamped.h };
    }));
  };

  return (
    <>
      {apiStatus === 'down' && (
        <div className='fixed top-4 left-4 bg-red-500/90 text-white px-4 py-2 rounded-lg text-sm z-[10000]'>
          ⚠️ API down
        </div>
      )}
      <div ref={terminalRef} className='glass-pane rounded-2xl border shadow-lg w-full max-w-4xl mx-4 overflow-hidden'>
        <div className='window-titlebar'>
          <div className='flex-1' />
          {apiStatus === 'ok' && (
            <div className='flex items-center gap-2'>
              <div className='w-3 h-3 rounded-full bg-green-400 animate-pulse' />
              <span className='text-green-400 text-sm font-semibold'>Live</span>
            </div>
          )}
        </div>
        <div className='window-body'>
          <div className='yn-hero'>
            <h1 className='yn-hero-title'>YourNews</h1>
            <p className='yn-hero-sub'>Search anything — get <span className='yn-accent'>YOUR</span> news</p>

            <form onSubmit={handleSubmit} noValidate>
              <input 
                ref={inputRef}
                type='text' 
                value={searchInput} 
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder='trump, g7, apple m4'
                className='yn-search'
                autoComplete='off' 
                spellCheck={false} 
                autoFocus 
              />
            </form>

            {/* Trending row (colored chips) */}
            <div className='mt-4'>
              <div className='yn-section-label text-center'>Trending</div>
              <div className='yn-row justify-center'>
                {trendingTopics.map(topic => (
                  <button 
                    key={topic} 
                    className={chipClassFor(topic)}
                    onClick={() => spawnFromRaw(topic, { profile: mapTopicToProfile(topic) })}
                    type='button'
                  >
                    #{topic}
                  </button>
                ))}
              </div>
            </div>

            {/* Recent row (neutral chips) */}
            {recentQueries.length > 0 && (
              <div className='mt-3'>
                <div className='yn-section-label text-center'>Recent</div>
                <div className='yn-row justify-center'>
                  {recentQueries.slice(0, 6).map((topic: string) => (
                    <button 
                      key={topic} 
                      className='yn-chip yn-chip--recent'
                      onClick={() => spawnFromRaw(topic)}
                      type='button'
                    >
                      #{topic}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {windows.length > 0 && (
              <div className='mt-4 text-gray-400 text-xs text-center'>
                Active: {windows.filter(w => !w.minimized).length} / Total: {windows.length}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className='fixed inset-0 pointer-events-none' style={{ zIndex: 999 }}>
        {windows.map(win => (
          <div key={win.id} className='pointer-events-auto'>
            <DraggableWindow 
              window={win} 
              onClose={closeWindow} 
              onMinimize={toggleMinimize} 
              onFocus={bringToFront} 
              onMove={moveWindow}
              onResize={resizeWindow}
            />
          </div>
        ))}
      </div>
    </>
  );
}

interface DraggableWindowProps {
  window: WindowData;
  onClose: (id: string) => void;
  onMinimize: (id: string) => void;
  onFocus: (id: string) => void;
  onMove: (id: string, dx: number, dy: number) => void;
  onResize: (id: string, newW: number, newH: number) => void;
}

function DraggableWindow({ window: win, onClose, onMinimize, onFocus, onMove, onResize }: DraggableWindowProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, w: 0, h: 0 });
  
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    onFocus(win.id);
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({ x: e.clientX, y: e.clientY, w: win.w, h: win.h });
    onFocus(win.id);
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      onMove(win.id, e.clientX - dragStart.x, e.clientY - dragStart.y);
      setDragStart({ x: e.clientX, y: e.clientY });
    };
    const handleMouseUp = () => setIsDragging(false);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart, win.id, onMove]);

  useEffect(() => {
    if (!isResizing) return;
    const handleMouseMove = (e: MouseEvent) => {
      const newW = Math.max(360, resizeStart.w + (e.clientX - resizeStart.x));
      const newH = Math.max(220, resizeStart.h + (e.clientY - resizeStart.y));
      onResize(win.id, newW, newH);
    };
    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.userSelect = '';
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
    };
  }, [isResizing, resizeStart, win.id, onResize]);

  if (win.minimized) return null;

  const bodyHeight = win.h - 32; // subtract titlebar height

  return (
    <div 
      className='glass-pane rounded-2xl border shadow-lg'
      style={{ 
        left: win.x, 
        top: win.y, 
        zIndex: win.z, 
        width: `${win.w}px`, 
        height: `${win.h}px`,
      }}
      onClick={() => onFocus(win.id)}
    >
      <div className='window-titlebar' onMouseDown={handleMouseDown}>
        <div className='window-traffic'>
          <button 
            onClick={(e) => { e.stopPropagation(); onClose(win.id); }} 
            className='window-dot red' 
            aria-label='Close'
          />
          <button 
            onClick={(e) => { e.stopPropagation(); onMinimize(win.id); }} 
            className='window-dot yellow' 
            aria-label='Minimize'
          />
          <div className='window-dot green' aria-label='Maximize' />
        </div>
        <div className='flex-1' />
        {win.data && win.data.items.length > 0 && win.data.items[0].timeAgo && (
          <div className='flex items-center gap-1.5'>
            <div className='w-2 h-2 rounded-full bg-cyan-400' />
            <span className='text-cyan-400 text-xs font-medium'>{win.data.items[0].timeAgo}</span>
          </div>
        )}
      </div>
      <div className='window-body text-sm text-white' style={{ height: `${bodyHeight}px` }}>
        {win.loading && (
          <div className='flex items-center justify-center py-12'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400' />
            <span className='ml-3 text-gray-400'>Loading...</span>
          </div>
        )}
        {win.error && (
          <div className='text-red-400'>
            <div className='font-bold mb-2'>⚠️ Error:</div>
            <div className='text-sm'>{win.error}</div>
          </div>
        )}
        {win.data && (
          <div className='yn-card'>
            <header className='yn-header'>
              <span className='yn-topic'>{win.topic}</span>
              {win.data.tags && win.data.tags.length > 0 && (
                <div className='yn-chips'>
                  {win.data.tags.map((tag, idx) => (
                    <span key={idx} className='yn-chip'>
                      {tag.slice(0, 24)}
                    </span>
                  ))}
                </div>
              )}
            </header>

            {win.data.insights && win.data.insights.length > 0 && (
              <section className='yn-insights'>
                <div className='yn-insights-title'>🎯 Key Insights</div>
                <ul className='yn-insights-list'>
                  {win.data.insights.slice(0, 5).map((insight, idx) => (
                    <li key={idx}>{insight}</li>
                  ))}
                </ul>
              </section>
            )}

            {win.data.takeaways && win.data.takeaways.length > 0 && (
              <section className='yn-insights'>
                <div className='yn-insights-title'>💡 AI Takeaways</div>
                <ul className='yn-insights-list'>
                  {win.data.takeaways.map((takeaway, idx) => (
                    <li key={idx}>{takeaway}</li>
                  ))}
                </ul>
              </section>
            )}

            {win.data.actions && win.data.actions.length > 0 && (
              <section className='yn-insights'>
                <div className='yn-insights-title'>✅ What you can do</div>
                <ul className='yn-insights-list'>
                  {win.data.actions.map((action, idx) => (
                    <li key={idx}>{action}</li>
                  ))}
                </ul>
              </section>
            )}

            {win.data.watch && win.data.watch.length > 0 && (
              <section className='yn-insights'>
                <div className='yn-insights-title'>👀 Next to watch</div>
                <ul className='yn-insights-list'>
                  {win.data.watch.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </section>
            )}

            {win.data.summaryMd && (
              <section className='yn-explainer'>
                <ReactMarkdown
                  components={{
                    a: ({ node, ...props }) => (
                      <a {...props} target='_blank' rel='noopener noreferrer' />
                    ),
                  }}
                >
                  {win.data.summaryMd}
                </ReactMarkdown>
              </section>
            )}

            {win.data.items.length > 0 && (
              <section className='yn-articles'>
                <div className='yn-section-title'>📰 Articles</div>
                <ul>
                  {win.data.items.map((item, idx) => (
                    <li key={idx}>
                      <a href={item.url} target='_blank' rel='noopener noreferrer'>
                        {item.title}
                      </a>
                      <div className='yn-article-meta'>
                        {item.source} · {item.timeAgo}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
        <div 
          className='yn-resizer' 
          onMouseDown={handleResizeStart}
          aria-label='Resize'
        />
      </div>
    </div>
  );
}
