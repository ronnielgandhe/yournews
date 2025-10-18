import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';

interface WindowData {
  id: string;
  topic: string;
  x: number;
  y: number;
  z: number;
  minimized: boolean;
  loading: boolean;
  error: string | null;
  data: {
    summaryMd: string;
    insights: string[];
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
    console.info('[YN] submit', raw);
    const topics = raw.split(/,| and /gi).map(s => s.trim()).filter(Boolean);
    topics.forEach((topic, idx) => createPanel(topic, idx));
    if (inputRef.current) inputRef.current.value = '';
    setSearchInput('');
    return false;
  };

  const createPanel = async (topic: string, index: number) => {
    console.info('[YN] spawn', topic);
    const windowId = `${topic}-${Date.now()}-${index}`;
    setWindows(prev => [...prev, {
      id: windowId, topic, x: 100 + index * 24, y: 100 + index * 24, z: maxZ + index,
      minimized: false, loading: true, error: null, data: null
    }]);
    setMaxZ(prev => prev + index + 1);
    try {
      console.info('[YN] Fetching POST /api/search-panels for:', topic);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      const response = await fetch('/api/search-panels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: topic }),
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
  const moveWindow = (id: string, dx: number, dy: number) => setWindows(prev => prev.map(w => w.id === id ? { ...w, x: Math.max(0, w.x + dx), y: Math.max(0, w.y + dy) } : w));

  return (
    <>
      {apiStatus === 'down' && (
        <div className='fixed top-4 left-4 bg-red-500/90 text-white px-4 py-2 rounded-lg text-sm z-[10000]'>
          ⚠️ API down
        </div>
      )}
      <div className='glass-pane rounded-2xl border shadow-lg w-full max-w-4xl mx-4 overflow-hidden'>
        <div className='window-titlebar'>
          <div className='window-traffic'>
            <div className='window-dot red' />
            <div className='window-dot yellow' />
            <div className='window-dot green' />
          </div>
          {apiStatus === 'ok' && (
            <div className='flex items-center gap-1.5 ml-3'>
              <div className='w-2 h-2 rounded-full bg-green-400 animate-pulse' />
              <span className='text-green-400 text-xs font-medium'>Live</span>
            </div>
          )}
        </div>
        <div className='window-body font-mono text-sm'>
          <div className='text-green-400 mb-4'>
            <div className='text-base mb-2'>YourNews Terminal v1.0</div>
            <div className='text-gray-400 text-xs mt-2'>Type topics separated by commas</div>
            <div className='text-gray-500 text-xs mt-1'><span className='text-yellow-400'>Cmd+K</span> focus • <span className='text-yellow-400'>Esc</span> close</div>
          </div>
          <div className='flex items-center mt-4'>
            <span className='text-cyan-400 mr-2'>$</span>
            <form onSubmit={handleSubmit} className='flex-1' noValidate>
              <input ref={inputRef} type='text' value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
                     placeholder='type anything — sentences, topics — get YOUR news'
                     className='flex-1 bg-transparent text-white outline-none placeholder-gray-500 w-full'
                     autoComplete='off' spellCheck={false} autoFocus />
            </form>
          </div>
          {windows.length > 0 && <div className='mt-3 text-gray-500 text-xs'>Active: {windows.filter(w => !w.minimized).length} / Total: {windows.length}</div>}
        </div>
      </div>
      <div className='fixed inset-0 pointer-events-none' style={{ zIndex: 999 }}>
        {windows.map(win => <div key={win.id} className='pointer-events-auto'><DraggableWindow window={win} onClose={closeWindow} onMinimize={toggleMinimize} onFocus={bringToFront} onMove={moveWindow} /></div>)}
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
}

function DraggableWindow({ window: win, onClose, onMinimize, onFocus, onMove }: DraggableWindowProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    onFocus(win.id);
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

  if (win.minimized) return null;

  return (
    <div 
      className='glass-pane rounded-2xl border shadow-lg fixed overflow-hidden'
      style={{ left: win.x, top: win.y, zIndex: win.z, width: '600px', maxHeight: '500px' }}
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
        {win.data && win.data.items.length > 0 && win.data.items[0].timeAgo && (
          <div className='flex items-center gap-1.5 ml-3'>
            <div className='w-2 h-2 rounded-full bg-cyan-400' />
            <span className='text-cyan-400 text-xs font-medium'>{win.data.items[0].timeAgo}</span>
          </div>
        )}
      </div>
      <div className='window-body overflow-y-auto text-sm text-white' style={{ maxHeight: '468px' }}>
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
      </div>
    </div>
  );
}
