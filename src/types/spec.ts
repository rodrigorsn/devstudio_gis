export type StageId =
  | 'brainstorm'
  | 'prd'
  | 'architecture'
  | 'features'
  | 'screens'
  | 'tasks'
  | 'implementation'
  | 'verification';

export type StageStatus = 'locked' | 'pending' | 'in_progress' | 'completed';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  suggestedAnswer?: string;
  isReadyToGenerate?: boolean;
}

export interface FeatureItem {
  id: string;
  slug: string;
  title: string;
  description: string;
  prdRefs: string[];
  specMarkdown?: string;
  screensMarkdown?: string;
  wireframeHtml?: string;
}

export interface TaskAction {
  action: string;
  expectedResult: string;
}

export interface TaskItem {
  id: string;
  code: string; // e.g. "T001"
  featureSlug: string;
  title: string;
  objective: string;
  files: string[];
  refs: string[];
  actions: TaskAction[];
  acceptanceCriteria: string[];
  howToVerify: string;
  outOfScope: string;
  markdown: string;
  completed: boolean;
}

export interface ADRItem {
  id: string;
  number: string;
  title: string;
  filename: string;
  content: string;
}

export interface StageState {
  id: StageId;
  status: StageStatus;
  chatHistory: ChatMessage[];
  documentContent?: string;
  outdatedWarning?: boolean;
  approvedAt?: number;
}

export interface ProjectData {
  id: string;
  name: string;
  summary?: string;
  createdAt: number;
  updatedAt: number;
  stages: Record<StageId, StageState>;
  features: FeatureItem[];
  tasks: TaskItem[];
  adrs: ADRItem[];
  activeStageId: StageId;
  selectedFeatureId?: string;
  selectedTaskId?: string;
  verificationChecks: Record<string, boolean>; // key: `${taskCode}-${index}` -> checked
}

export interface StageInfo {
  id: StageId;
  order: number;
  title: string;
  shortDesc: string;
  docPath: string;
  isMultiItem?: boolean;
  iconName: string;
}

export const STAGES_LIST: StageInfo[] = [
  {
    id: 'brainstorm',
    order: 1,
    title: '1. Brainstorm',
    shortDesc: 'Ideia, público, problema, diferenciais e escopo',
    docPath: 'docs/00-brainstorm.md',
    iconName: 'Lightbulb',
  },
  {
    id: 'prd',
    order: 2,
    title: '2. PRD',
    shortDesc: 'Objetivos, personas, RFs, RNFs e métricas',
    docPath: 'docs/01-prd.md',
    iconName: 'FileText',
  },
  {
    id: 'architecture',
    order: 3,
    title: '3. Arquitetura',
    shortDesc: 'Stack, pastas, modelo de dados (ERD) e ADRs',
    docPath: 'docs/02-arquitetura.md',
    iconName: 'Layers',
  },
  {
    id: 'features',
    order: 4,
    title: '4. Features',
    shortDesc: 'Specs detalhadas com regras e fluxo mermaid',
    docPath: 'docs/specs/NNN-nome/spec.md',
    isMultiItem: true,
    iconName: 'Boxes',
  },
  {
    id: 'screens',
    order: 5,
    title: '5. Telas',
    shortDesc: 'Componentes, tabela de ações e wireframes interativos',
    docPath: 'docs/specs/NNN-nome/telas.md',
    isMultiItem: true,
    iconName: 'Layout',
  },
  {
    id: 'tasks',
    order: 6,
    title: '6. Tarefas',
    shortDesc: 'Decomposição em tarefas atômicas (T001, T002...)',
    docPath: 'docs/tasks/NNN-nome/T001.md',
    isMultiItem: true,
    iconName: 'CheckSquare',
  },
  {
    id: 'implementation',
    order: 7,
    title: '7. Implementação',
    shortDesc: 'Acompanhamento e importação de STATUS.md',
    docPath: 'STATUS.md',
    iconName: 'Terminal',
  },
  {
    id: 'verification',
    order: 8,
    title: '8. Verificação',
    shortDesc: 'Checklist consolidado de critérios de aceite',
    docPath: 'Critérios de Aceite',
    iconName: 'ShieldCheck',
  },
];
