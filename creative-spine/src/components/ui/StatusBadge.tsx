import { ShotStatus, AssetStatus } from '@/lib/types';

type Status = ShotStatus | AssetStatus;

const colors: Record<Status, string> = {
  idea: 'bg-zinc-700 text-zinc-300',
  prompt_ready: 'bg-blue-900/50 text-blue-300',
  generated: 'bg-purple-900/50 text-purple-300',
  needs_refinement: 'bg-amber-900/50 text-amber-300',
  approved: 'bg-emerald-900/50 text-emerald-300',
  in_edit: 'bg-cyan-900/50 text-cyan-300',
  final: 'bg-emerald-600 text-white',
  not_started: 'bg-zinc-700/50 text-zinc-400',
  prompting: 'bg-blue-900/50 text-blue-300',
};

const labels: Record<Status, string> = {
  idea: 'Idea',
  prompt_ready: 'Prompt Ready',
  generated: 'Generated',
  needs_refinement: 'Needs Refinement',
  approved: 'Approved',
  in_edit: 'In Edit',
  final: 'Final',
  not_started: 'Not Started',
  prompting: 'Prompting',
};

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] ?? 'bg-zinc-700 text-zinc-300'} ${className}`}>
      {labels[status] ?? status}
    </span>
  );
}
