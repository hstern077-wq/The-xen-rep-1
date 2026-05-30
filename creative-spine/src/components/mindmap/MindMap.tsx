'use client';

import { useState } from 'react';
import { Project, MindMapNode, NodeType, NodeStrength } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { generateId } from '@/lib/utils';
import { generateMindMapFromIdea } from '@/lib/generators';

interface MindMapProps {
  project: Project;
  onChange: (updates: Partial<Project>) => void;
}

const nodeTypeOptions: { value: NodeType; label: string }[] = [
  { value: 'core_idea', label: 'Core Idea' },
  { value: 'emotion', label: 'Emotion' },
  { value: 'character', label: 'Character' },
  { value: 'conflict', label: 'Conflict' },
  { value: 'visual_metaphor', label: 'Visual Metaphor' },
  { value: 'location', label: 'Location' },
  { value: 'sound_world', label: 'Sound World' },
  { value: 'style_reference', label: 'Style Reference' },
  { value: 'ending', label: 'Ending' },
  { value: 'crazy_idea', label: 'Crazy Idea' },
  { value: 'production_note', label: 'Production Note' },
];

const typeColors: Record<NodeType, string> = {
  core_idea: 'border-emerald-600 bg-emerald-950/30',
  emotion: 'border-pink-700 bg-pink-950/20',
  character: 'border-violet-700 bg-violet-950/20',
  conflict: 'border-red-700 bg-red-950/20',
  visual_metaphor: 'border-amber-700 bg-amber-950/20',
  location: 'border-cyan-700 bg-cyan-950/20',
  sound_world: 'border-indigo-700 bg-indigo-950/20',
  style_reference: 'border-orange-700 bg-orange-950/20',
  ending: 'border-teal-700 bg-teal-950/20',
  crazy_idea: 'border-yellow-600 bg-yellow-950/20',
  production_note: 'border-zinc-600 bg-zinc-800/40',
};

const strengthDot: Record<NodeStrength, string> = {
  low: 'bg-zinc-600',
  medium: 'bg-amber-500',
  high: 'bg-emerald-500',
};

export function MindMap({ project, onChange }: MindMapProps) {
  const [filterType, setFilterType] = useState<NodeType | 'all'>('all');

  const updateNodes = (nodes: MindMapNode[]) => onChange({ mindMapNodes: nodes });

  const addNode = () => {
    const newNode: MindMapNode = {
      id: generateId('node'),
      label: 'New Node',
      type: 'core_idea',
      content: '',
      strength: 'medium',
      isWeird: false,
      connectedTo: [],
    };
    updateNodes([...project.mindMapNodes, newNode]);
  };

  const deleteNode = (id: string) => updateNodes(project.mindMapNodes.filter((n) => n.id !== id));

  const duplicateNode = (node: MindMapNode) => {
    const copy = { ...node, id: generateId('node'), label: node.label + ' (copy)' };
    updateNodes([...project.mindMapNodes, copy]);
  };

  const updateNode = (id: string, updates: Partial<MindMapNode>) => {
    updateNodes(project.mindMapNodes.map((n) => (n.id === id ? { ...n, ...updates } : n)));
  };

  const handleGenerate = () => {
    const generated = generateMindMapFromIdea(project);
    updateNodes([...project.mindMapNodes, ...generated]);
  };

  const filtered =
    filterType === 'all' ? project.mindMapNodes : project.mindMapNodes.filter((n) => n.type === filterType);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-zinc-100">Mind Map</h2>
          <p className="text-sm text-zinc-500 mt-1">Explore every dimension of your idea. Nothing is too weird here.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={handleGenerate}>Generate from Idea</Button>
          <Button variant="primary" size="sm" onClick={addNode}>+ Add Node</Button>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setFilterType('all')}
          className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${filterType === 'all' ? 'bg-zinc-700 text-zinc-100 border-zinc-600' : 'bg-transparent text-zinc-500 border-zinc-700 hover:text-zinc-300'}`}
        >
          All ({project.mindMapNodes.length})
        </button>
        {nodeTypeOptions.map((opt) => {
          const count = project.mindMapNodes.filter((n) => n.type === opt.value).length;
          if (count === 0) return null;
          return (
            <button
              key={opt.value}
              onClick={() => setFilterType(opt.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${filterType === opt.value ? 'bg-zinc-700 text-zinc-100 border-zinc-600' : 'bg-transparent text-zinc-500 border-zinc-700 hover:text-zinc-300'}`}
            >
              {opt.label} ({count})
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((node) => (
          <div
            key={node.id}
            className={`border rounded-xl p-4 space-y-3 ${typeColors[node.type]}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${strengthDot[node.strength]}`} />
                {node.isWeird && (
                  <span className="px-1.5 py-0.5 bg-yellow-900/50 border border-yellow-700/50 rounded text-xs text-yellow-300">⚡ Weird</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => updateNode(node.id, { strength: node.strength === 'high' ? 'low' : node.strength === 'medium' ? 'high' : 'medium' })}
                  className="p-1 rounded text-zinc-500 hover:text-zinc-200 transition-colors text-xs"
                  title="Toggle strength"
                >★</button>
                <button
                  onClick={() => updateNode(node.id, { isWeird: !node.isWeird })}
                  className="p-1 rounded text-zinc-500 hover:text-yellow-300 transition-colors text-xs"
                  title="Mark weird"
                >⚡</button>
                <button
                  onClick={() => duplicateNode(node)}
                  className="p-1 rounded text-zinc-500 hover:text-zinc-200 transition-colors text-xs"
                  title="Duplicate"
                >⧉</button>
                <button
                  onClick={() => deleteNode(node.id)}
                  className="p-1 rounded text-zinc-500 hover:text-red-400 transition-colors text-xs"
                  title="Delete"
                >✕</button>
              </div>
            </div>

            <Input
              value={node.label}
              onChange={(e) => updateNode(node.id, { label: e.target.value })}
              placeholder="Node label"
              className="text-sm font-semibold"
            />

            <Select
              options={nodeTypeOptions}
              value={node.type}
              onChange={(e) => updateNode(node.id, { type: e.target.value as NodeType })}
            />

            <Textarea
              value={node.content}
              onChange={(e) => updateNode(node.id, { content: e.target.value })}
              placeholder="What does this node mean? Describe, explore, expand..."
              className="min-h-[80px] text-xs"
            />

            <Select
              label="Strength"
              options={[
                { value: 'low', label: 'Low — not sure yet' },
                { value: 'medium', label: 'Medium — feels right' },
                { value: 'high', label: 'High — core to the film' },
              ]}
              value={node.strength}
              onChange={(e) => updateNode(node.id, { strength: e.target.value as NodeStrength })}
            />
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-zinc-600">
          <p className="text-lg mb-2">No nodes yet.</p>
          <p className="text-sm">Add a node or generate from your idea.</p>
        </div>
      )}
    </div>
  );
}
