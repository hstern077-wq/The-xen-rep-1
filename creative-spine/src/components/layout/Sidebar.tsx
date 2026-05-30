'use client';

import { Section } from '@/lib/types';

interface SidebarProps {
  activeSection: Section;
  onSelect: (section: Section) => void;
}

const sections: { id: Section; label: string; icon: string; description: string }[] = [
  { id: 'brief', label: 'Project Brief', icon: '📋', description: 'Define the project' },
  { id: 'idea', label: 'Idea Dump', icon: '💡', description: 'Raw thoughts' },
  { id: 'insight', label: 'Insight', icon: '🔍', description: 'Find the meaning' },
  { id: 'mindmap', label: 'Mind Map', icon: '🗺️', description: 'Explore connections' },
  { id: 'concepts', label: 'Concepts', icon: '🎬', description: 'Creative directions' },
  { id: 'beats', label: 'Beat Sheet', icon: '🎵', description: 'Story structure' },
  { id: 'storyboard', label: 'Storyboard', icon: '🎞️', description: 'Shot by shot' },
  { id: 'prompts', label: 'Prompt Factory', icon: '⚡', description: 'AI prompts' },
  { id: 'assets', label: 'Asset Tracker', icon: '📦', description: 'Track materials' },
  { id: 'export', label: 'Export Pack', icon: '📤', description: 'Export everything' },
];

export function Sidebar({ activeSection, onSelect }: SidebarProps) {
  return (
    <aside className="w-60 bg-zinc-950 border-r border-zinc-800/60 flex flex-col h-full">
      <div className="px-4 py-5 border-b border-zinc-800/60">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-emerald-600 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
            </svg>
          </div>
          <span className="text-sm font-bold text-zinc-100 tracking-tight">Creative Spine</span>
        </div>
        <p className="text-xs text-zinc-500 mt-1">Production OS</p>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {sections.map((section, i) => (
          <button
            key={section.id}
            onClick={() => onSelect(section.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all group ${
              activeSection === section.id
                ? 'bg-zinc-800 text-zinc-100'
                : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
            }`}
          >
            <span className="text-sm w-5 text-center">{section.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate">{section.label}</div>
              {activeSection === section.id && (
                <div className="text-xs text-zinc-500 truncate">{section.description}</div>
              )}
            </div>
            <span className="text-xs text-zinc-600 shrink-0">{String(i + 1).padStart(2, '0')}</span>
          </button>
        ))}
      </nav>

      <div className="px-4 py-3 border-t border-zinc-800/60">
        <p className="text-xs text-zinc-600">Local first · No account needed</p>
      </div>
    </aside>
  );
}
