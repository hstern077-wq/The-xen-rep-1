'use client';

import { useState } from 'react';
import { Project, Asset, AssetType, AssetStatus } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { generateId } from '@/lib/utils';
import { generateAssetsFromStoryboard } from '@/lib/generators';

interface AssetTrackerProps {
  project: Project;
  onChange: (updates: Partial<Project>) => void;
}

const assetTypeOptions: { value: AssetType; label: string }[] = [
  { value: 'image', label: 'Image' },
  { value: 'video', label: 'Video' },
  { value: 'voice', label: 'Voice' },
  { value: 'music', label: 'Music' },
  { value: 'sfx', label: 'SFX' },
  { value: 'lip_sync', label: 'Lip Sync' },
  { value: 'edit', label: 'Edit' },
  { value: 'reference', label: 'Reference' },
  { value: 'other', label: 'Other' },
];

const assetStatusOptions: { value: AssetStatus; label: string }[] = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'prompting', label: 'Prompting' },
  { value: 'generated', label: 'Generated' },
  { value: 'needs_refinement', label: 'Needs Refinement' },
  { value: 'approved', label: 'Approved' },
  { value: 'in_edit', label: 'In Edit' },
  { value: 'final', label: 'Final' },
];

export function AssetTracker({ project, onChange }: AssetTrackerProps) {
  const [filterStatus, setFilterStatus] = useState<AssetStatus | 'all'>('all');
  const [filterShot, setFilterShot] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const updateAssets = (assets: Asset[]) => onChange({ assets });

  const addAsset = () => {
    const newAsset: Asset = {
      id: generateId('asset'),
      shotId: project.shots[0]?.id ?? '',
      assetType: 'image',
      tool: '',
      promptVersion: 1,
      fileName: '',
      status: 'not_started',
      problem: '',
      nextAction: '',
      approvedVersion: '',
      notes: '',
    };
    updateAssets([...project.assets, newAsset]);
    setExpandedId(newAsset.id);
  };

  const deleteAsset = (id: string) => updateAssets(project.assets.filter((a) => a.id !== id));

  const duplicateAsset = (a: Asset) => {
    const copy = { ...a, id: generateId('asset'), status: 'not_started' as AssetStatus, fileName: '', approvedVersion: '' };
    updateAssets([...project.assets, copy]);
  };

  const updateAsset = (id: string, updates: Partial<Asset>) => {
    updateAssets(project.assets.map((a) => (a.id === id ? { ...a, ...updates } : a)));
  };

  const handleGenerate = () => {
    const generated = generateAssetsFromStoryboard(project);
    updateAssets(generated);
  };

  const filtered = project.assets.filter((a) => {
    if (filterStatus !== 'all' && a.status !== filterStatus) return false;
    if (filterShot !== 'all' && a.shotId !== filterShot) return false;
    return true;
  });

  const statusCounts = assetStatusOptions.map((opt) => ({
    ...opt,
    count: project.assets.filter((a) => a.status === opt.value).length,
  }));

  const missingShots = project.shots.filter(
    (s) => !project.assets.some((a) => a.shotId === s.id && (a.assetType === 'image' || a.assetType === 'video'))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-zinc-100">Asset Tracker</h2>
          <p className="text-sm text-zinc-500 mt-1">{project.assets.length} assets tracked · {project.assets.filter(a => a.status === 'final').length} final</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={handleGenerate}>Generate from Storyboard</Button>
          <Button variant="primary" size="sm" onClick={addAsset}>+ Add Asset</Button>
        </div>
      </div>

      {/* Progress summary */}
      <div className="grid grid-cols-3 md:grid-cols-7 gap-2">
        {statusCounts.map((s) => (
          <div key={s.value} className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-center">
            <div className="text-lg font-bold text-zinc-100">{s.count}</div>
            <div className="text-xs text-zinc-500 truncate">{s.label}</div>
          </div>
        ))}
      </div>

      {missingShots.length > 0 && (
        <div className="bg-amber-950/30 border border-amber-800/30 rounded-xl px-4 py-3">
          <p className="text-xs text-amber-400 font-medium mb-1">Shots without assets:</p>
          <p className="text-xs text-amber-300">{missingShots.map((s) => `Shot ${s.shotNumber}`).join(', ')}</p>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select
          options={[{ value: 'all', label: 'All Shots' }, ...project.shots.map((s) => ({ value: s.id, label: `Shot ${s.shotNumber}` }))]}
          value={filterShot}
          onChange={(e) => setFilterShot(e.target.value)}
          className="max-w-[140px]"
        />
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${filterStatus === 'all' ? 'bg-zinc-700 text-zinc-100 border-zinc-600' : 'bg-transparent text-zinc-500 border-zinc-700 hover:text-zinc-300'}`}
          >
            All
          </button>
          {assetStatusOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilterStatus(opt.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${filterStatus === opt.value ? 'bg-zinc-700 text-zinc-100 border-zinc-600' : 'bg-transparent text-zinc-500 border-zinc-700 hover:text-zinc-300'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Asset list */}
      <div className="space-y-2">
        {filtered.map((asset) => {
          const shot = project.shots.find((s) => s.id === asset.shotId);
          const isExpanded = expandedId === asset.id;

          return (
            <div key={asset.id} className="border border-zinc-800 rounded-xl bg-zinc-900 overflow-hidden">
              <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-zinc-800/40 transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : asset.id)}
              >
                <span className="text-xs text-zinc-500 font-mono w-10">S{shot?.shotNumber ?? '?'}</span>
                <span className="text-xs px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-zinc-400">{asset.assetType}</span>
                <span className="text-sm text-zinc-300 flex-1 truncate">{asset.fileName || 'No file yet'}</span>
                <span className="text-xs text-zinc-500">{asset.tool}</span>
                <StatusBadge status={asset.status} />
                {asset.problem && (
                  <span className="text-xs text-amber-400">⚠</span>
                )}
                <button className="text-xs text-zinc-600 hover:text-zinc-300 ml-1">{isExpanded ? '▲' : '▼'}</button>
              </div>

              {isExpanded && (
                <div className="px-4 pb-4 space-y-3 border-t border-zinc-800">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3">
                    <Select
                      label="Shot"
                      options={project.shots.map((s) => ({ value: s.id, label: `Shot ${s.shotNumber}` }))}
                      value={asset.shotId}
                      onChange={(e) => updateAsset(asset.id, { shotId: e.target.value })}
                    />
                    <Select
                      label="Asset Type"
                      options={assetTypeOptions}
                      value={asset.assetType}
                      onChange={(e) => updateAsset(asset.id, { assetType: e.target.value as AssetType })}
                    />
                    <Select
                      label="Status"
                      options={assetStatusOptions}
                      value={asset.status}
                      onChange={(e) => updateAsset(asset.id, { status: e.target.value as AssetStatus })}
                    />
                    <Input
                      label="Tool"
                      value={asset.tool}
                      onChange={(e) => updateAsset(asset.id, { tool: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input
                      label="File Name"
                      value={asset.fileName}
                      onChange={(e) => updateAsset(asset.id, { fileName: e.target.value })}
                    />
                    <Input
                      label="Approved Version"
                      value={asset.approvedVersion}
                      onChange={(e) => updateAsset(asset.id, { approvedVersion: e.target.value })}
                    />
                  </div>
                  <Textarea
                    label="Problem"
                    value={asset.problem}
                    onChange={(e) => updateAsset(asset.id, { problem: e.target.value })}
                    className="min-h-[60px]"
                    placeholder="What's wrong with the current version?"
                  />
                  <Textarea
                    label="Next Action"
                    value={asset.nextAction}
                    onChange={(e) => updateAsset(asset.id, { nextAction: e.target.value })}
                    className="min-h-[60px]"
                    placeholder="What needs to happen next?"
                  />
                  <Textarea
                    label="Notes"
                    value={asset.notes}
                    onChange={(e) => updateAsset(asset.id, { notes: e.target.value })}
                    className="min-h-[60px]"
                  />
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => duplicateAsset(asset)}>Duplicate</Button>
                    <Button variant="danger" size="sm" onClick={() => deleteAsset(asset.id)}>Delete</Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-zinc-600">
          <p className="text-base mb-2">No assets found.</p>
          <p className="text-sm">Generate from storyboard or add assets manually.</p>
        </div>
      )}
    </div>
  );
}
