export type ProjectFormat = '9:16' | '1:1' | '16:9' | 'custom';

export type ShotStatus =
  | 'idea'
  | 'prompt_ready'
  | 'generated'
  | 'needs_refinement'
  | 'approved'
  | 'in_edit'
  | 'final';

export type AssetStatus =
  | 'not_started'
  | 'prompting'
  | 'generated'
  | 'needs_refinement'
  | 'approved'
  | 'in_edit'
  | 'final';

export type BeatRole =
  | 'hook'
  | 'setup'
  | 'escalation'
  | 'transformation'
  | 'reveal'
  | 'punch';

export type NodeType =
  | 'core_idea'
  | 'emotion'
  | 'character'
  | 'conflict'
  | 'visual_metaphor'
  | 'location'
  | 'sound_world'
  | 'style_reference'
  | 'ending'
  | 'crazy_idea'
  | 'production_note';

export type NodeStrength = 'low' | 'medium' | 'high';

export type ConceptDirectionType = 'safe' | 'cinematic' | 'weird';

export type PromptType =
  | 'image'
  | 'text_to_video'
  | 'image_to_video'
  | 'character_consistency'
  | 'style'
  | 'negative'
  | 'voice_over'
  | 'sound_design'
  | 'lip_sync'
  | 'editing_note';

export type ToolTarget =
  | 'General'
  | 'Midjourney'
  | 'Sora'
  | 'Runway'
  | 'Kling'
  | 'Veo'
  | 'ElevenLabs'
  | 'Suno'
  | 'Lip Sync Tool'
  | 'Editing Software';

export type AssetType =
  | 'image'
  | 'video'
  | 'voice'
  | 'music'
  | 'sfx'
  | 'lip_sync'
  | 'edit'
  | 'reference'
  | 'other';

export interface Idea {
  messyIdea: string;
  randomImages: string;
  references: string;
  wants: string;
  avoid: string;
  fears: string;
  excitement: string;
}

export interface Insight {
  coreInsight: string;
  emotionalGoal: string;
  viewerTakeaway: string;
  conflict: string;
  metaphor: string;
  tension: string;
  whyItWorks: string;
  risks: string;
  oneSentenceSummary: string;
}

export interface MindMapNode {
  id: string;
  label: string;
  type: NodeType;
  content: string;
  strength: NodeStrength;
  isWeird: boolean;
  connectedTo: string[];
}

export interface Concept {
  id: string;
  title: string;
  directionType: ConceptDirectionType;
  logline: string;
  whyItWorks: string;
  character: string;
  conflict: string;
  visualWorld: string;
  beginning: string;
  middle: string;
  end: string;
  punch: string;
  risks: string;
  productionDifficulty: string;
  selected: boolean;
}

export interface Beat {
  id: string;
  beatNumber: number;
  duration: string;
  role: BeatRole;
  whatWeSee: string;
  whatWeHear: string;
  whatChanges: string;
  emotion: string;
  storyPurpose: string;
  visualStyle: string;
}

export interface Shot {
  id: string;
  shotNumber: number;
  duration: string;
  shotType: string;
  cameraAngle: string;
  cameraMovement: string;
  location: string;
  character: string;
  action: string;
  whatWeSee: string;
  whatWeHear: string;
  voiceOver: string;
  dialogue: string;
  soundEffects: string;
  musicNote: string;
  visualStyle: string;
  lighting: string;
  color: string;
  composition: string;
  imagePrompt: string;
  videoPrompt: string;
  negativePrompt: string;
  tool: string;
  status: ShotStatus;
  notes: string;
}

export interface Prompt {
  id: string;
  shotId: string;
  type: PromptType;
  toolTarget: ToolTarget;
  version: number;
  text: string;
  notes: string;
}

export interface Asset {
  id: string;
  shotId: string;
  assetType: AssetType;
  tool: string;
  promptVersion: number;
  fileName: string;
  status: AssetStatus;
  problem: string;
  nextAction: string;
  approvedVersion: string;
  notes: string;
}

export interface Project {
  id: string;
  title: string;
  format: ProjectFormat;
  duration: string;
  platform: string;
  targetAudience: string;
  mainEmotion: string;
  mainMessage: string;
  creativeTension: string;
  hook: string;
  payoff: string;
  visualPromise: string;
  tools: string;
  notes: string;
  idea: Idea;
  insight: Insight;
  mindMapNodes: MindMapNode[];
  concepts: Concept[];
  beats: Beat[];
  shots: Shot[];
  prompts: Prompt[];
  assets: Asset[];
  createdAt: string;
  updatedAt: string;
}

export type Section =
  | 'brief'
  | 'idea'
  | 'insight'
  | 'mindmap'
  | 'concepts'
  | 'beats'
  | 'storyboard'
  | 'prompts'
  | 'assets'
  | 'export';
