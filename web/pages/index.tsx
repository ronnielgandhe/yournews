import { useState, useRef, useEffect } from 'react';
import Head from 'next/head';

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
    items: Array<{
      title: string;
      url: string;
      source: string;
      timeAgo: string;
    }>;
  } | null;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';

export default function Home() {
  const [windows, setWindows] = useState<WindowData[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [maxZ, setMaxZ] = useState(1);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const splitAndNormalize = (input: string): string[] => {
    return input.split(/,| and /i).map(s => s.trim()).filter(s => s.length > 0);
  };

  const createPanel = async (topic: string, index: number) => {
    const windowId = `${topic}-${Date.now()}-${index}`;
    const newWindow: WindowData = {
      id: windowId, topic, x: 120 + index * 30, y: 120 + index * 30, z: maxZ + index,
      minimized: false, loading: true, error: null, data: null,
    };
    setWindows(prev => [...prev, newWindow]);
    setMaxZ(prev => prev + index + 1);

    try {
      const response = await fetch(`${API_BASE}/search/panels`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: topic }),
      });
      if (!response.ok) throw new Error(`API returned ${response.status}`);
      const result = await response.json();
      const panel = result.panels?.[0];
      if (!panel) throw new Error('No panel data received');
      setWindows(prev => prev.map(w => w.id === windowId ? {
        ...w, loading: false, data: {
          summaryMd: panel.summaryMd || '',
          items: (panel.items || []).slice(0, 7),
        }
      } : w));
    } catch (err) {
      setWindows(prev => prev.map(w => w.id === windowId
        ? { ...w, loading: false, error: err instanceof Error ? err.message : 'Failed' } : w));
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchInput.trim();
    if (trimmed === 'clear') { setWindows([]); setSearchInput(''); return; }
    if (!trimmed) return;
    splitAndNormalize(trimmed).forEach((topic, idx) => createPanel(topic, idx));
    setSearchInput('');
  };

  const closeWindow = (id: string) => setWindows(prev => prev.filter(w => w.id !== id));
  const toggleMinimize = (id: string) => setWindows(prev => prev.map(w => w.id === id ? { ...w, minimized: !w.minimized } : w));
  const bringToFront = (id: string) => { setMaxZ(prev => prev + 1); setWindows(prev => prev.map(w => w.id === id ? { ...w, z: maxZ + 1 } : w)); };
  const moveWindow = (id: string, dx: number, dy: number) => setWindows(prev => prev.map(w => w.id === id ? { ...w, x: Math.max(0, w.x + dx), y: Math.max(0, w.y + dy) } : w));

  return (<>
    <Head><title>YourNews</title></Head>
    <div className="fixed inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(/mac-background1.jpg)' }}>
      {/* macOS Menu Bar */}
      <div className="h-6 bg-gradient-to-b from-gray-100/90 to-gray-50/80 backdrop-blur-xl border-b border-gray-300/50 flex items-center px-3 text-xs font-medium shadow-sm">
        <div className="flex items-center space-x-3 text-gray-800">
          <span className="font-bold">🗞️</span>
          <span className="font-semibold">YourNews</span>
          <span className="cursor-default hover:bg-blue-500/20 px-2 py-0.5 rounded">File</span>
          <span className="cursor-default hover:bg-blue-500/20 px-2 py-0.5 rounded">Edit</span>
          <span className="cursor-default hover:bg-blue-500/20 px-2 py-0.5 rounded">View</span>
        </div>
        <div className="ml-auto flex items-center space-x-3 text-gray-700">
          <span>{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
          <span>{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>
      {/* Main Terminal Window - centered */}
      <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 120px)', paddingTop: '60px' }}>
        <div className="w-full max-w-2xl mx-4">
          <div className="bg-gray-900/95 backdrop-blur-2xl rounded-xl shadow-2xl overflow-hidden border border-gray-700/50">
            {/* Terminal Title Bar */}
            <div className="h-8 bg-gradient-to-b from-gray-300 to-gray-200 border-b border-gray-400/50 flex items-center px-3 select-none">
              <div className="flex space-x-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500 shadow-sm" />
                <div className="w-3 h-3 rounded-full bg-yellow-500 shadow-sm" />
                <div className="w-3 h-3 rounded-full bg-green-500 shadow-sm" />
              </div>
              <div className="flex-1 text-center text-xs font-medium text-gray-700">
                YourNews Terminal
              </div>
            </div>

            {/* Terminal Body */}
            <div className="p-5 font-mono text-sm">
              <div className="text-green-400 mb-3">
                <div className="text-sm mb-1.5 font-semibold">YourNews Terminal v1.0</div>
                <div className="text-gray-400 text-xs mt-2 leading-relaxed">
                  Search for news topics separated by commas:<br/>
                  <span className="text-cyan-400">trump, climate change, switzerland</span>
                </div>
                <div className="text-gray-500 text-xs mt-2">
                  <span className="text-yellow-400">Cmd+K</span> focus • <span className="text-yellow-400">Esc</span> close • <span className="text-yellow-400">clear</span> close all
                </div>
              </div>

              <form onSubmit={handleSearch} className="flex items-center mt-4 bg-gray-800/50 rounded px-3 py-2 border border-gray-700">
                <span className="text-cyan-400 mr-2 font-bold">$</span>
                <input ref={inputRef} type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)}
                  placeholder="type anything — get YOUR news" 
                  className="flex-1 bg-transparent text-white outline-none placeholder-gray-500 caret-cyan-400" 
                  autoFocus />
              </form>

              {windows.length > 0 && (
                <div className="mt-3 text-gray-500 text-xs">
                  ▸ Active: {windows.filter(w => !w.minimized).length} window(s)
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Draggable News Windows */}
      {windows.map(win => (
        <DraggableWindow key={win.id} window={win} onClose={closeWindow} onMinimize={toggleMinimize} onFocus={bringToFront} onMove={moveWindow} />
      ))}

      {/* macOS Dock */}
      <div className="fixed bottom-2 left-0 right-0 flex justify-center pointer-events-none">
        <div className="bg-white/10 backdrop-blur-3xl rounded-2xl px-2 py-1.5 border border-white/20 shadow-2xl pointer-events-auto">
          <div className="flex items-end space-x-1">
            {/* Minimized windows in dock */}
            {windows.filter(w => w.minimized).map(win => (
              <button
                key={win.id}
                onClick={() => toggleMinimize(win.id)}
                className="w-12 h-12 bg-gradient-to-b from-gray-600 to-gray-800 rounded-lg border border-white/30 flex items-center justify-center text-white hover:scale-110 transition-transform shadow-lg overflow-hidden group relative"
                title={`Restore: ${win.topic}`}
              >
                <span className="text-[10px] font-mono truncate px-1 group-hover:hidden">{win.topic.slice(0, 6)}</span>
                <span className="text-lg hidden group-hover:block">📰</span>
              </button>
            ))}
            {/* YourNews icon (always visible) */}
            <div className="w-14 h-14 bg-gradient-to-b from-blue-500 to-blue-700 rounded-xl border border-white/30 flex items-center justify-center shadow-lg transform hover:scale-110 transition-all">
              <span className="text-2xl">🗞️</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </>);
}

interface DraggableWindowProps { window: WindowData; onClose: (id: string) => void; onMinimize: (id: string) => void; onFocus: (id: string) => void; onMove: (id: string, dx: number, dy: number) => void; }

function DraggableWindow({ window: win, onClose, onMinimize, onFocus, onMove }: DraggableWindowProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.window-controls')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    onFocus(win.id);
  };

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e: MouseEvent) => { onMove(win.id, e.clientX - dragStart.x, e.clientY - dragStart.y); setDragStart({ x: e.clientX, y: e.clientY }); };
    const handleMouseUp = () => setIsDragging(false);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => { document.removeEventListener('mousemove', handleMouseMove); document.removeEventListener('mouseup', handleMouseUp); };
  }, [isDragging, dragStart, win.id, onMove]);

  if (win.minimized) return null;

  return (
    <div className="fixed bg-gray-900/95 backdrop-blur-2xl rounded-xl border border-gray-700/50 shadow-2xl overflow-hidden" 
      style={{ left: win.x, top: win.y, zIndex: win.z, width: '650px', maxHeight: '550px', cursor: isDragging ? 'grabbing' : 'default' }} 
      onClick={() => onFocus(win.id)}>
      {/* macOS Title Bar */}
      <div className="h-8 bg-gradient-to-b from-gray-300 to-gray-200 border-b border-gray-400/50 flex items-center px-3 cursor-grab active:cursor-grabbing select-none shadow-sm"
        onMouseDown={handleMouseDown}>
        <div className="flex space-x-1.5 window-controls">
          <button onClick={e => { e.stopPropagation(); onClose(win.id); }} 
            className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 transition shadow-sm flex items-center justify-center group" 
            title="Close">
            <span className="text-[8px] text-red-900 opacity-0 group-hover:opacity-100 font-bold">×</span>
          </button>
          <button onClick={e => { e.stopPropagation(); onMinimize(win.id); }} 
            className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-600 transition shadow-sm flex items-center justify-center group" 
            title="Minimize">
            <span className="text-[8px] text-yellow-900 opacity-0 group-hover:opacity-100 font-bold">−</span>
          </button>
          <div className="w-3 h-3 rounded-full bg-green-500 shadow-sm" title="Fullscreen (disabled)" />
        </div>
        <div className="flex-1 text-center text-xs font-medium text-gray-700 truncate px-4">{win.topic}</div>
      </div>
      {/* Window Content */}
      <div className="p-5 overflow-y-auto text-sm" style={{ maxHeight: '490px', backgroundColor: '#1a1a1a' }}>
        {win.loading && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-400 mb-3" />
            <span className="text-gray-400 font-mono text-xs">Fetching news...</span>
          </div>
        )}

        {win.error && (
          <div className="text-red-400 font-mono bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <div className="font-bold mb-2 flex items-center">
              <span className="text-lg mr-2">⚠️</span> Error
            </div>
            <div className="text-sm">{win.error}</div>
            <div className="text-xs text-gray-500 mt-2">Backend: {API_BASE}</div>
          </div>
        )}

        {win.data && (
          <div>
            {/* AI Summary */}
            <div className="mb-6 text-gray-200 leading-relaxed whitespace-pre-wrap font-sans text-sm">
              {win.data.summaryMd}
            </div>

            {/* Article Links */}
            {win.data.items.length > 0 && (
              <div className="border-t border-gray-700 pt-4 mt-4">
                <div className="text-cyan-400 font-mono text-xs mb-3 font-semibold flex items-center">
                  <span className="mr-2">📰</span> Related Articles
                </div>
                <div className="space-y-3">
                  {win.data.items.map((item, idx) => (
                    <div key={idx} className="group">
                      <a href={item.url} target="_blank" rel="noopener noreferrer" 
                        className="text-blue-400 hover:text-blue-300 hover:underline block text-xs leading-snug font-medium">
                        {item.title}
                      </a>
                      <div className="text-gray-500 mt-1 text-[10px] font-mono flex items-center space-x-2">
                        <span>{item.source}</span>
                        <span>•</span>
                        <span>{item.timeAgo}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
