'use client';

import { useState, useEffect, useCallback } from 'react';
import { Project, Section } from '@/lib/types';
import { loadProject, saveProject, resetToSampleData } from '@/lib/storage';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { ProjectBrief } from '@/components/brief/ProjectBrief';
import { IdeaDump } from '@/components/brief/IdeaDump';
import { InsightExtractor } from '@/components/brief/InsightExtractor';
import { MindMap } from '@/components/mindmap/MindMap';
import { ConceptOptions } from '@/components/concepts/ConceptOptions';
import { BeatSheet } from '@/components/story/BeatSheet';
import { Storyboard } from '@/components/story/Storyboard';
import { PromptFactory } from '@/components/prompts/PromptFactory';
import { AssetTracker } from '@/components/assets/AssetTracker';
import { ExportPack } from '@/components/export/ExportPack';

export function AppShell() {
  const [project, setProject] = useState<Project | null>(null);
  const [activeSection, setActiveSection] = useState<Section>('brief');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');

  useEffect(() => {
    const loaded = loadProject();
    setProject(loaded);
  }, []);

  const handleChange = useCallback((updates: Partial<Project>) => {
    setProject((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      setSaveStatus('saving');
      // Debounce save
      setTimeout(() => {
        saveProject(updated);
        setSaveStatus('saved');
      }, 600);
      return updated;
    });
  }, []);

  const handleReset = () => {
    const fresh = resetToSampleData();
    setProject(fresh);
    setSaveStatus('saved');
  };

  if (!project) {
    return (
      <div className="flex h-screen bg-zinc-950 items-center justify-center">
        <div className="text-zinc-500 text-sm">Loading...</div>
      </div>
    );
  }

  const renderSection = () => {
    switch (activeSection) {
      case 'brief': return <ProjectBrief project={project} onChange={handleChange} />;
      case 'idea': return <IdeaDump project={project} onChange={handleChange} />;
      case 'insight': return <InsightExtractor project={project} onChange={handleChange} />;
      case 'mindmap': return <MindMap project={project} onChange={handleChange} />;
      case 'concepts': return <ConceptOptions project={project} onChange={handleChange} />;
      case 'beats': return <BeatSheet project={project} onChange={handleChange} />;
      case 'storyboard': return <Storyboard project={project} onChange={handleChange} />;
      case 'prompts': return <PromptFactory project={project} onChange={handleChange} />;
      case 'assets': return <AssetTracker project={project} onChange={handleChange} />;
      case 'export': return <ExportPack project={project} />;
    }
  };

  return (
    <div className="flex h-screen bg-zinc-950 overflow-hidden">
      <Sidebar activeSection={activeSection} onSelect={setActiveSection} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar project={project} onReset={handleReset} saveStatus={saveStatus} />
        <main className="flex-1 overflow-y-auto px-8 py-8">
          <div className="max-w-5xl mx-auto">
            {renderSection()}
          </div>
        </main>
      </div>
    </div>
  );
}
