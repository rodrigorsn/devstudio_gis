import React, { useState, useEffect } from 'react';
import {
  FileText,
  Eye,
  Edit3,
  Sparkles,
  CheckCircle2,
  RotateCcw,
  RefreshCw,
  Plus,
  Trash2,
  MoveUp,
  MoveDown,
  Layers,
  Layout,
  CheckSquare,
  AlertTriangle,
  FolderOpen,
  Monitor,
} from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { MarkdownDocPreview } from './MarkdownDocPreview';
import { WireframePreview } from './WireframePreview';
import { STAGES_LIST, StageId, FeatureItem, TaskItem } from '../types/spec';

interface DocumentColumnProps {
  isGenerating?: boolean;
  onGenerateDoc: () => void;
}

export const DocumentColumn: React.FC<DocumentColumnProps> = ({
  isGenerating = false,
  onGenerateDoc,
}) => {
  const {
    project,
    activeStageId,
    approveStage,
    reopenStage,
    updateStageDocument,
    selectedFeatureId,
    setSelectedFeatureId,
    selectedTaskId,
    setSelectedTaskId,
    updateFeature,
    addFeature,
    removeFeature,
    reorderFeatures,
    setFeaturesList,
    updateTask,
    addTask,
    removeTask,
    setTasksList,
    getApprovedDocsContext,
  } = useProject();

  const [activeTab, setActiveTab] = useState<'preview' | 'edit' | 'wireframe'>('preview');
  const [localEditContent, setLocalEditContent] = useState('');
  const [isProposingFeatures, setIsProposingFeatures] = useState(false);
  const [isBreakingDownTasks, setIsBreakingDownTasks] = useState(false);
  const [isGeneratingWireframe, setIsGeneratingWireframe] = useState(false);

  const stageState = project.stages[activeStageId];
  const stageInfo = STAGES_LIST.find((s) => s.id === activeStageId)!;
  const isCompleted = stageState?.status === 'completed';

  // Determine current active document content and path
  let currentDocContent = '';
  let currentDocPath = stageInfo.docPath;

  const currentFeature =
    project.features.find((f) => f.id === selectedFeatureId) || project.features[0];
  const currentTask =
    project.tasks.find((t) => t.id === selectedTaskId) || project.tasks[0];

  if (activeStageId === 'features') {
    if (currentFeature) {
      currentDocContent = currentFeature.specMarkdown || '';
      currentDocPath = `docs/specs/${currentFeature.slug}/spec.md`;
    }
  } else if (activeStageId === 'screens') {
    if (currentFeature) {
      currentDocContent = currentFeature.screensMarkdown || '';
      currentDocPath = `docs/specs/${currentFeature.slug}/telas.md`;
    }
  } else if (activeStageId === 'tasks') {
    if (currentTask) {
      currentDocContent = currentTask.markdown || '';
      currentDocPath = `docs/tasks/${currentTask.featureSlug}/${currentTask.code}.md`;
    }
  } else {
    currentDocContent = stageState?.documentContent || '';
  }

  // Sync local edit content when switching stages or items
  useEffect(() => {
    setLocalEditContent(currentDocContent);
  }, [activeStageId, selectedFeatureId, selectedTaskId, currentDocContent]);

  // Handle saving manual edits
  const handleContentChange = (newVal: string) => {
    setLocalEditContent(newVal);
    if (activeStageId === 'features' && currentFeature) {
      updateFeature(currentFeature.id, { specMarkdown: newVal });
    } else if (activeStageId === 'screens' && currentFeature) {
      updateFeature(currentFeature.id, { screensMarkdown: newVal });
    } else if (activeStageId === 'tasks' && currentTask) {
      updateTask(currentTask.id, { markdown: newVal });
    } else {
      updateStageDocument(activeStageId, newVal);
    }
  };

  // Stage 4: Propose Features from PRD with Gemini
  const handleProposeFeatures = async () => {
    try {
      setIsProposingFeatures(true);
      const contextDocs = getApprovedDocsContext();
      const res = await fetch('/api/propose-features', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contextDocs }),
      });
      if (!res.ok) throw new Error('Falha ao propor features');
      const { features } = await res.json();
      if (Array.isArray(features) && features.length > 0) {
        setFeaturesList(features);
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao consultar Gemini para propor features. Tente novamente.');
    } finally {
      setIsProposingFeatures(false);
    }
  };

  // Stage 5: Generate Wireframe HTML
  const handleGenerateWireframe = async () => {
    if (!currentFeature) return;
    try {
      setIsGeneratingWireframe(true);
      const contextDocs = getApprovedDocsContext();
      const res = await fetch('/api/generate-wireframe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          featureTitle: currentFeature.title,
          featureSlug: currentFeature.slug,
          screensMarkdown: currentFeature.screensMarkdown,
          contextDocs,
        }),
      });
      if (!res.ok) throw new Error('Falha ao gerar wireframe');
      const { wireframeHtml } = await res.json();
      updateFeature(currentFeature.id, { wireframeHtml });
      setActiveTab('wireframe');
    } catch (err) {
      console.error(err);
      alert('Erro ao gerar wireframe HTML.');
    } finally {
      setIsGeneratingWireframe(false);
    }
  };

  // Stage 6: Break down tasks with Gemini
  const handleBreakdownTasks = async () => {
    if (!currentFeature) return;
    try {
      setIsBreakingDownTasks(true);
      const res = await fetch('/api/breakdown-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          featureSlug: currentFeature.slug,
          featureTitle: currentFeature.title,
          featureSpec: currentFeature.specMarkdown,
          startIndex: project.tasks.length + 1,
        }),
      });
      if (!res.ok) throw new Error('Falha ao detalhar tarefas');
      const { tasks } = await res.json();
      if (Array.isArray(tasks) && tasks.length > 0) {
        // Append or replace for this feature
        const otherTasks = project.tasks.filter((t) => t.featureSlug !== currentFeature.slug);
        const newTasksList = [...otherTasks, ...tasks];
        setTasksList(newTasksList);
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao decompor tarefas com Gemini.');
    } finally {
      setIsBreakingDownTasks(false);
    }
  };

  return (
    <div className="flex h-full flex-col border-l border-slate-800 bg-slate-950">
      {/* Top Header: Doc Path & Stage Actions */}
      <div className="border-b border-slate-800 bg-slate-950/80 p-3">
        <div className="flex items-center justify-between gap-2 mb-2">
          {/* File path pill */}
          <div className="flex items-center gap-1.5 font-mono text-xs text-slate-300">
            <FileText className="h-3.5 w-3.5 text-emerald-400" />
            <span className="truncate max-w-[260px]">{currentDocPath}</span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {isCompleted ? (
              <button
                onClick={() => reopenStage(activeStageId)}
                title="Reabrir esta etapa para fazer edições"
                className="flex items-center gap-1 rounded bg-slate-800 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-700 transition"
              >
                <RotateCcw className="h-3 w-3" />
                Reabrir Etapa
              </button>
            ) : (
              <button
                onClick={() => approveStage(activeStageId)}
                disabled={!currentDocContent}
                title="Aprova esta etapa e desbloqueia a próxima"
                className="flex items-center gap-1 rounded bg-emerald-600 px-3 py-1 text-xs font-semibold text-white shadow hover:bg-emerald-500 disabled:opacity-40 transition"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Aprovar Etapa
              </button>
            )}

            <button
              onClick={onGenerateDoc}
              disabled={isGenerating}
              className="flex items-center gap-1 rounded bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition"
            >
              <RefreshCw className={`h-3 w-3 ${isGenerating ? 'animate-spin' : ''}`} />
              {currentDocContent ? 'Regenerar' : 'Gerar Documento'}
            </button>
          </div>
        </div>

        {/* Warning if stage is marked outdated */}
        {stageState?.outdatedWarning && (
          <div className="mb-2 flex items-center gap-1.5 rounded bg-amber-500/10 border border-amber-500/30 p-2 text-[11px] text-amber-300">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400" />
            <span>Uma etapa anterior foi reaberta. O conteúdo deste documento pode estar desatualizado.</span>
          </div>
        )}

        {/* Multi-Item Management bar (Stages 4, 5, 6) */}
        {activeStageId === 'features' && (
          <div className="mt-2 rounded-lg border border-slate-800 bg-slate-900/60 p-2">
            <div className="flex items-center justify-between mb-1.5 text-[11px]">
              <span className="font-semibold text-slate-300 flex items-center gap-1">
                <Layers className="h-3.5 w-3.5 text-indigo-400" />
                Features do MVP ({project.features.length})
              </span>
              <button
                onClick={handleProposeFeatures}
                disabled={isProposingFeatures}
                className="flex items-center gap-1 text-[11px] text-indigo-300 hover:text-indigo-200"
              >
                <Sparkles className="h-3 w-3" />
                {isProposingFeatures ? 'Propondo...' : 'Propor com Gemini'}
              </button>
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {project.features.map((feat, idx) => (
                <button
                  key={feat.id}
                  onClick={() => setSelectedFeatureId(feat.id)}
                  className={`flex shrink-0 items-center gap-1.5 rounded px-2.5 py-1 text-xs transition ${
                    selectedFeatureId === feat.id
                      ? 'bg-emerald-600 text-white font-semibold'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <span className="font-mono text-[10px] opacity-75">{feat.slug}</span>
                  <span className="truncate max-w-[120px]">{feat.title}</span>
                </button>
              ))}

              <button
                onClick={() => {
                  const title = window.prompt('Nome da nova feature:', 'Nova Feature');
                  if (title) {
                    const slug = `00${project.features.length + 1}-${title
                      .toLowerCase()
                      .replace(/[^a-z0-9]/g, '-')}`;
                    addFeature({
                      id: 'feat-' + Date.now(),
                      slug,
                      title,
                      description: 'Descrição da feature',
                      prdRefs: ['RF-01'],
                      specMarkdown: `# Spec: ${title}\n**Slug:** ${slug}\n\n## 1. Visão Geral\nRegras de negócio aqui...`,
                    });
                  }
                }}
                className="flex shrink-0 items-center gap-1 rounded border border-dashed border-slate-700 px-2 py-1 text-xs text-slate-400 hover:border-slate-500 hover:text-slate-200"
              >
                <Plus className="h-3 w-3" />
                Adicionar
              </button>
            </div>
          </div>
        )}

        {/* Multi-Item bar for Stage 5 (Screens) */}
        {activeStageId === 'screens' && (
          <div className="mt-2 rounded-lg border border-slate-800 bg-slate-900/60 p-2">
            <div className="flex items-center justify-between mb-1.5 text-[11px]">
              <span className="font-semibold text-slate-300 flex items-center gap-1">
                <Layout className="h-3.5 w-3.5 text-indigo-400" />
                Selecione a Feature para Telas:
              </span>
              <button
                onClick={handleGenerateWireframe}
                disabled={isGeneratingWireframe || !currentFeature}
                className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300"
              >
                <Monitor className="h-3 w-3" />
                {isGeneratingWireframe ? 'Gerando...' : 'Gerar Wireframe'}
              </button>
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {project.features.map((feat) => (
                <button
                  key={feat.id}
                  onClick={() => setSelectedFeatureId(feat.id)}
                  className={`flex shrink-0 items-center gap-1.5 rounded px-2.5 py-1 text-xs transition ${
                    selectedFeatureId === feat.id
                      ? 'bg-emerald-600 text-white font-semibold'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <span className="font-mono text-[10px] opacity-75">{feat.slug}</span>
                  <span className="truncate max-w-[120px]">{feat.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Multi-Item bar for Stage 6 (Tasks) */}
        {activeStageId === 'tasks' && (
          <div className="mt-2 rounded-lg border border-slate-800 bg-slate-900/60 p-2">
            <div className="flex items-center justify-between mb-1.5 text-[11px]">
              <span className="font-semibold text-slate-300 flex items-center gap-1">
                <CheckSquare className="h-3.5 w-3.5 text-indigo-400" />
                Tarefas Atômicas ({project.tasks.length})
              </span>
              <button
                onClick={handleBreakdownTasks}
                disabled={isBreakingDownTasks}
                className="flex items-center gap-1 text-[11px] text-indigo-300 hover:text-indigo-200"
              >
                <Sparkles className="h-3 w-3" />
                {isBreakingDownTasks ? 'Decompondo...' : 'Decompor com Gemini'}
              </button>
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {project.tasks.map((task) => (
                <button
                  key={task.id}
                  onClick={() => setSelectedTaskId(task.id)}
                  className={`flex shrink-0 items-center gap-1.5 rounded px-2.5 py-1 text-xs transition font-mono ${
                    selectedTaskId === task.id
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <span>{task.code}</span>
                  <span className="font-sans font-normal truncate max-w-[100px]">{task.title}</span>
                </button>
              ))}

              <button
                onClick={() => {
                  const code = `T${String(project.tasks.length + 1).padStart(3, '0')}`;
                  const title = window.prompt(`Título da tarefa ${code}:`, 'Nova tarefa atômica');
                  if (title) {
                    const featureSlug = currentFeature?.slug || '001-feature';
                    const markdown = `# ${code} — ${title}\n**Feature:** ${featureSlug} | **Refs:** RF-01\n\n## Objetivo\nObjetivo aqui.\n\n## Arquivos que pode criar/alterar\n- src/...\n\n## Ação → Resultado esperado\n| Ação | Resultado esperado |\n| --- | --- |\n| Implementar | Sucesso |\n\n## Critérios de aceite\n- [ ] Critério 1\n\n## Como verificar\nnpm test\n\n## Fora de escopo\nNada extra.`;
                    addTask({
                      id: 'task-' + Date.now(),
                      code,
                      featureSlug,
                      title,
                      objective: 'Objetivo da tarefa',
                      files: ['src/...'],
                      refs: ['RF-01'],
                      actions: [{ action: 'Implementar', expectedResult: 'Sucesso' }],
                      acceptanceCriteria: ['Critério 1'],
                      howToVerify: 'npm test',
                      outOfScope: 'Nada extra',
                      markdown,
                      completed: false,
                    });
                  }
                }}
                className="flex shrink-0 items-center gap-1 rounded border border-dashed border-slate-700 px-2 py-1 text-xs text-slate-400 hover:border-slate-500 hover:text-slate-200"
              >
                <Plus className="h-3 w-3" />
                Nova Tarefa
              </button>
            </div>
          </div>
        )}

        {/* Tab switcher */}
        <div className="mt-2 flex items-center justify-between border-t border-slate-800/80 pt-2">
          <div className="flex gap-1 rounded bg-slate-900 p-0.5">
            <button
              onClick={() => setActiveTab('preview')}
              className={`flex items-center gap-1.5 rounded px-3 py-1 text-xs font-medium transition ${
                activeTab === 'preview'
                  ? 'bg-slate-800 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              Preview Renderizado
            </button>
            <button
              onClick={() => setActiveTab('edit')}
              className={`flex items-center gap-1.5 rounded px-3 py-1 text-xs font-medium transition ${
                activeTab === 'edit'
                  ? 'bg-slate-800 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Edit3 className="h-3.5 w-3.5" />
              Editar Markdown
            </button>

            {activeStageId === 'screens' && (
              <button
                onClick={() => setActiveTab('wireframe')}
                className={`flex items-center gap-1.5 rounded px-3 py-1 text-xs font-medium transition ${
                  activeTab === 'wireframe'
                    ? 'bg-slate-800 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Monitor className="h-3.5 w-3.5" />
                Wireframe Interativo
              </button>
            )}
          </div>

          <div className="text-[11px] text-slate-400 font-mono">
            {localEditContent.length} caracteres
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 bg-slate-900/60">
        {activeTab === 'wireframe' ? (
          <WireframePreview
            html={currentFeature?.wireframeHtml || ''}
            onRegenerate={handleGenerateWireframe}
            isGenerating={isGeneratingWireframe}
          />
        ) : activeTab === 'edit' ? (
          <div className="flex h-full flex-col">
            <textarea
              value={localEditContent}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder="Digite ou edite o documento markdown aqui..."
              className="flex-1 w-full resize-none rounded-lg border border-slate-800 bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-200 placeholder-slate-600 outline-none focus:border-emerald-500"
            />
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
              <span>Edições manuais salvas automaticamente no localStorage.</span>
              <span className="font-mono text-emerald-400">✓ Sincronizado</span>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <MarkdownDocPreview content={localEditContent} />

            {/* In stage 5 (Screens), also show wireframe below doc in Preview! */}
            {activeStageId === 'screens' && currentFeature?.wireframeHtml && (
              <div className="mt-6 border-t border-slate-800 pt-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                  <Monitor className="h-4 w-4 text-emerald-400" />
                  Protótipo Wireframe (Sandbox iframe)
                </h3>
                <WireframePreview
                  html={currentFeature.wireframeHtml}
                  onRegenerate={handleGenerateWireframe}
                  isGenerating={isGeneratingWireframe}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
