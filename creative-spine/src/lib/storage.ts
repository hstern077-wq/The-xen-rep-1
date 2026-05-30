import { Project } from './types';
import { sampleProject } from './sampleData';

const STORAGE_KEY = 'creative-spine-project';

export function loadProject(): Project {
  if (typeof window === 'undefined') return sampleProject;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...sampleProject };
    const parsed = JSON.parse(raw) as Project;
    return parsed;
  } catch {
    return { ...sampleProject };
  }
}

export function saveProject(project: Project): void {
  if (typeof window === 'undefined') return;
  try {
    const updated = { ...project, updatedAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Storage quota exceeded or unavailable
  }
}

export function resetToSampleData(): Project {
  if (typeof window === 'undefined') return sampleProject;
  const fresh = { ...sampleProject, updatedAt: new Date().toISOString() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  return fresh;
}
