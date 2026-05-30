'use client';

import { Project } from '@/lib/types';
import { formatDate } from '@/lib/utils';

interface TopBarProps {
  project: Project;
  onReset: () => void;
  saveStatus: 'saved' | 'saving' | 'unsaved';
}

export function TopBar({ project, onReset, saveStatus }: TopBarProps) {
  return (
    <header className="h-14 bg-zinc-950 border-b border-zinc-800/60 flex items-center px-6 gap-4 shrink-0">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <h1 className="text-sm font-semibold text-zinc-100 truncate">{project.title}</h1>
        <div className="flex items-center gap-2 shrink-0">
          <span className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-400 font-mono">
            {project.format}
          </span>
          <span className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-400">
            {project.duration}
          </span>
          <span className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-400">
            {project.platform}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-1.5">
          <div
            className={`w-1.5 h-1.5 rounded-full ${
              saveStatus === 'saved'
                ? 'bg-emerald-500'
                : saveStatus === 'saving'
                ? 'bg-amber-500 animate-pulse'
                : 'bg-zinc-600'
            }`}
          />
          <span className="text-xs text-zinc-500">
            {saveStatus === 'saved'
              ? `Saved ${formatDate(project.updatedAt)}`
              : saveStatus === 'saving'
              ? 'Saving...'
              : 'Unsaved'}
          </span>
        </div>

        <button
          onClick={onReset}
          className="px-3 py-1.5 rounded-md text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 border border-zinc-800 transition-colors"
        >
          Reset to sample
        </button>
      </div>
    </header>
  );
}
