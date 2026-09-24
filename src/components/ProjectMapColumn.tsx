import React, { useState } from 'react';
import {
  Lightbulb,
  FileText,
  Layers,
  Boxes,
  Layout,
  CheckSquare,
  Terminal,
  ShieldCheck,
  Lock,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  PlusCircle,
  Sparkles,
  Info,
} from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { STAGES_LIST, StageId, StageStatus } from '../types/spec';

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  Lightbulb,
  FileText,
  Layers,
  Boxes,
  Layout,
  CheckSquare,
  Terminal,
  ShieldCheck,
};

export const ProjectMapColumn: React.FC = () => {
  const {
    project,
    activeStageId,
    setActiveStageId,
    isStageAccessible,
    resetToNewProject,
    loadDemo,
    updateProjectName,
  } = useProject();

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(project.name);

  // Compute overall progress
  const completedStagesCount = STAGES_LIST.filter(
    (stage) => project.stages[stage.id]?.status === 'completed'
  ).length;
  const progressPercent = Math.round((completedStagesCount / STAGES_LIST.length) * 100);

  const handleTitleSubmit = () => {
    if (titleInput.trim()) {
      updateProjectName(titleInput.trim());
    }
    setIsEditingTitle(false);
  };

  const getStatusBadge = (status: StageStatus, outdatedWarning?: boolean) => {
    if (outdatedWarning) {
      return (
        <span
          title="Esta etapa foi aprovada com base em versões anteriores e pode estar desatualizada"
          className="flex items-center gap-1 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-300 border border-amber-500/40"
        >
          <AlertTriangle className="h-3 w-3 text-amber-400" />
          Desatualizada
        </span>
      );
    }

    switch (status) {
      case 'completed':
        return (
          <span className="flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="h-3 w-3" />
            Concluída
          </span>
        );
      case 'in_progress':
        return (
          <span className="flex items-center gap-1 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-300 border border-amber-500/40 animate-pulse">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400"></span>
            Em andamento
          </span>
        );
      case 'pending':
        return (
          <span className="flex items-center gap-1 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
            <Clock className="h-3 w-3" />
            Pendente
          </span>
        );
      case 'locked':
      default:
        return (
          <span className="flex items-center gap-1 rounded bg-slate-900 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
            <Lock className="h-3 w-3" />
            Bloqueada
          </span>
        );
    }
  };

  return (
    <div className="flex h-full flex-col border-r border-slate-800 bg-slate-950 select-none">
      {/* App Branding & Project Title */}
      <div className="border-b border-slate-800 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-emerald-600 to-indigo-600 text-white font-black text-sm shadow-md">
              S
            </div>
            <div>
              <span className="text-sm font-bold tracking-tight text-white">Spec Studio</span>
              <span className="ml-1.5 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400">
                SDD
              </span>
            </div>
          </div>
        </div>

        {/* Project Name editable */}
        <div className="rounded-lg bg-slate-900/80 p-2.5 border border-slate-800/80">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
            Projeto Atual
          </div>
          {isEditingTitle ? (
            <input
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
              autoFocus
              className="w-full rounded bg-slate-950 px-2 py-1 text-xs text-white border border-emerald-500 outline-none"
            />
          ) : (
            <div
              onClick={() => {
                setTitleInput(project.name);
                setIsEditingTitle(true);
              }}
              title="Clique para renomear o projeto"
              className="group flex cursor-pointer items-center justify-between text-xs font-semibold text-slate-100 hover:text-emerald-400"
            >
              <span className="truncate">{project.name}</span>
              <span className="text-[10px] text-slate-500 opacity-0 group-hover:opacity-100 transition">
                Editar
              </span>
            </div>
          )}
        </div>

        {/* Global Progress Bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
            <span className="font-medium">Progresso Geral</span>
            <span className="font-mono text-emerald-400 font-semibold">
              {completedStagesCount} de {STAGES_LIST.length} ({progressPercent}%)
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-indigo-500 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Vertical Stages List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Mapa de Etapas
        </div>

        {STAGES_LIST.map((stage) => {
          const state = project.stages[stage.id];
          const status = state?.status || 'locked';
          const isActive = activeStageId === stage.id;
          const accessible = isStageAccessible(stage.id);
          const IconComponent = ICON_MAP[stage.iconName] || FileText;

          return (
            <div
              key={stage.id}
              onClick={() => {
                if (accessible || status !== 'locked') {
                  setActiveStageId(stage.id);
                }
              }}
              className={`group relative flex flex-col rounded-lg border p-2.5 transition cursor-pointer ${
                isActive
                  ? 'border-emerald-500/60 bg-emerald-950/20 shadow-sm'
                  : accessible
                  ? 'border-slate-800/80 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/80 text-slate-300'
                  : 'border-slate-900 bg-slate-950/40 opacity-50 cursor-not-allowed text-slate-500'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`rounded p-1.5 transition ${
                      status === 'completed'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : status === 'in_progress'
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    <IconComponent className="h-4 w-4" />
                  </div>
                  <div>
                    <h4
                      className={`text-xs font-semibold leading-tight ${
                        isActive ? 'text-white' : 'text-slate-200'
                      }`}
                    >
                      {stage.title}
                    </h4>
                    <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                      {stage.shortDesc}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 ml-2">
                  {getStatusBadge(status, state?.outdatedWarning)}
                </div>
              </div>

              {/* Multi-item badge preview */}
              {stage.id === 'features' && project.features.length > 0 && (
                <div className="mt-2 flex items-center gap-1.5 border-t border-slate-800/60 pt-1.5 text-[10px] text-slate-400">
                  <span className="font-semibold text-emerald-400">{project.features.length}</span>{' '}
                  features mapeadas
                </div>
              )}
              {stage.id === 'tasks' && project.tasks.length > 0 && (
                <div className="mt-2 flex items-center justify-between border-t border-slate-800/60 pt-1.5 text-[10px] text-slate-400">
                  <span>
                    <strong className="text-emerald-400">
                      {project.tasks.filter((t) => t.completed).length}
                    </strong>
                    /{project.tasks.length} tarefas concluídas
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Actions: Novo Projeto, Carregar Exemplo */}
      <div className="border-t border-slate-800 bg-slate-950 p-3 space-y-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (
                window.confirm(
                  'Deseja criar um novo projeto em branco? As alterações não salvas serão substituídas.'
                )
              ) {
                const name = window.prompt('Nome do novo projeto:', 'Meu Novo App');
                resetToNewProject(name || undefined);
              }
            }}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition"
          >
            <PlusCircle className="h-3.5 w-3.5 text-slate-400" />
            Novo Projeto
          </button>
          <button
            onClick={() => {
              if (
                window.confirm(
                  'Carregar o projeto de exemplo DevPulse? O projeto atual será substituído no localStorage.'
                )
              ) {
                loadDemo();
              }
            }}
            title="Carregar projeto de exemplo já preenchido"
            className="flex items-center justify-center gap-1.5 rounded-lg border border-indigo-900/50 bg-indigo-950/40 px-2.5 py-1.5 text-xs font-medium text-indigo-300 hover:bg-indigo-900/50 transition"
          >
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            Exemplo
          </button>
        </div>

        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
          <span>Persistência Local (LocalStorage)</span>
          <span className="font-mono text-emerald-400">Ativa</span>
        </div>
      </div>
    </div>
  );
};
