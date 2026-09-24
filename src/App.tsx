import React, { useState } from 'react';
import { ProjectProvider, useProject } from './context/ProjectContext';
import { ProjectMapColumn } from './components/ProjectMapColumn';
import { ChatColumn } from './components/ChatColumn';
import { DocumentColumn } from './components/DocumentColumn';
import { ExportModal } from './components/ExportModal';
import {
  Download,
  Sparkles,
  Layers,
  CheckCircle,
  FileText,
  Terminal,
  ShieldCheck,
  AlertTriangle,
  FolderTree,
} from 'lucide-react';
import { STAGES_LIST, StageId } from './types/spec';

const MainLayout: React.FC = () => {
  const {
    project,
    activeStageId,
    updateStageDocument,
    updateFeature,
    updateFeaturePages,
    updateTask,
    selectedFeatureId,
    selectedTaskId,
    getApprovedDocsContext,
    addChatMessage,
    setAdrsList,
  } = useProject();

  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isGeneratingDoc, setIsGeneratingDoc] = useState(false);

  // Requirement: Export button enabled after stage 6 (Tarefas)
  // Stage 6 is 'tasks'. So if stage 6 is completed or active stage is 7 ('implementation') or 8 ('verification')
  const isExportEnabled =
    project.stages.tasks.status === 'completed' ||
    project.stages.implementation.status === 'completed' ||
    project.stages.verification.status === 'completed' ||
    project.tasks.length > 0;

  // Active stage info
  const activeStageInfo = STAGES_LIST.find((s) => s.id === activeStageId)!;
  const currentFeature =
    project.features.find((f) => f.id === selectedFeatureId) || project.features[0];
  const currentTask =
    project.tasks.find((t) => t.id === selectedTaskId) || project.tasks[0];

  // Core Document Generation function triggered by button in Chat or Document column
  const handleGenerateDoc = async () => {
    try {
      setIsGeneratingDoc(true);
      const stageState = project.stages[activeStageId];
      const contextDocs = getApprovedDocsContext();

      // Special handling for Stage 5: Screens (Pages -> Components -> Behaviors)
      if (activeStageId === 'screens') {
        if (!currentFeature) throw new Error('Nenhuma feature selecionada para gerar telas');
        const pagesRes = await fetch('/api/generate-pages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            featureTitle: currentFeature.title,
            featureSlug: currentFeature.slug,
            featureSpec: currentFeature.specMarkdown,
            contextDocs,
          }),
        });
        if (!pagesRes.ok) throw new Error('Falha ao gerar páginas da feature');
        const { pages } = await pagesRes.json();
        if (Array.isArray(pages) && pages.length > 0) {
          updateFeaturePages(currentFeature.id, pages);
        }
        addChatMessage(activeStageId, {
          role: 'model',
          text: `Páginas e componentes gerados com sucesso para a feature **${currentFeature.title}**! O telas.md foi compilado automaticamente pelo código na hierarquia Página → Componentes → Comportamentos.`,
        });
        return;
      }

      let itemContext: any = null;
      if (activeStageId === 'features') {
        itemContext = currentFeature;
      } else if (activeStageId === 'tasks') {
        itemContext = currentTask;
      }

      // Special handling for architecture ADRs
      if (activeStageId === 'architecture') {
        try {
          const adrRes = await fetch('/api/generate-adrs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contextDocs }),
          });
          if (adrRes.ok) {
            const { adrs } = await adrRes.json();
            if (Array.isArray(adrs) && adrs.length > 0) {
              setAdrsList(adrs);
            }
          }
        } catch (e) {
          console.warn('ADR generation failed, continuing with doc', e);
        }
      }

      const res = await fetch('/api/generate-doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stageId: activeStageId,
          messages: stageState?.chatHistory || [],
          contextDocs,
          itemContext,
        }),
      });

      if (!res.ok) {
        throw new Error('Falha ao gerar o documento');
      }

      const { markdown } = await res.json();

      // Apply markdown to corresponding target
      if (activeStageId === 'features' && currentFeature) {
        updateFeature(currentFeature.id, { specMarkdown: markdown });
      } else if (activeStageId === 'tasks' && currentTask) {
        updateTask(currentTask.id, { markdown });
      } else {
        updateStageDocument(activeStageId, markdown);
      }

      // Inform in chat
      addChatMessage(activeStageId, {
        role: 'model',
        text: `Documento da etapa gerado com sucesso! Você pode visualizá-lo na coluna da direita, editar se necessário e clicar em "Aprovar etapa" para avançar.`,
      });
    } catch (err: any) {
      console.error('Erro na geração de documento:', err);
      alert(`Erro ao gerar documento: ${err.message}`);
    } finally {
      setIsGeneratingDoc(false);
    }
  };

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-slate-950 text-slate-100 font-sans">
      {/* Top Navigation Bar */}
      <header className="flex h-13 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-950 px-4 select-none">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-emerald-500 to-indigo-600 text-white font-extrabold shadow-md">
            S
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-tight text-white">Spec Studio</h1>
              <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-emerald-400">
                SDD v1.0
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Planejamento de Software Orientado a Especificações
            </p>
          </div>
        </div>

        {/* Center: Current active stage banner */}
        <div className="hidden md:flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/80 px-4 py-1 text-xs">
          <span className="text-slate-400">Etapa ativa:</span>
          <span className="font-semibold text-emerald-400">{activeStageInfo.title}</span>
          <span className="text-slate-600">•</span>
          <span className="font-mono text-[11px] text-slate-400">{activeStageInfo.docPath}</span>
        </div>

        {/* Right: Export Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsExportOpen(true)}
            disabled={!isExportEnabled}
            title={
              isExportEnabled
                ? 'Exportar pacote completo de especificações para Claude Code / Cursor / Codex'
                : 'Conclua até a Etapa 6 (Tarefas) para habilitar a exportação do pacote SDD'
            }
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold shadow-md transition ${
              isExportEnabled
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 cursor-pointer ring-1 ring-emerald-400/50'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
            }`}
          >
            <FolderTree className="h-4 w-4" />
            <span>Exportar Pacote</span>
            {!isExportEnabled && (
              <span className="hidden sm:inline text-[10px] text-slate-500">(requer etapa 6)</span>
            )}
          </button>
        </div>
      </header>

      {/* Main 3-Column Work Area */}
      <main className="grid flex-1 grid-cols-1 md:grid-cols-12 overflow-hidden">
        {/* Column 1: Left - Mapa do projeto (2.5 cols ~ 21%) */}
        <section className="col-span-12 md:col-span-3 lg:col-span-3 h-full overflow-hidden">
          <ProjectMapColumn />
        </section>

        {/* Column 2: Center - Conversa com Gemini (4.5 cols ~ 37%) */}
        <section className="col-span-12 md:col-span-4 lg:col-span-4 h-full overflow-hidden border-r border-slate-800">
          <ChatColumn
            onTriggerGenerateDoc={handleGenerateDoc}
            isGeneratingDoc={isGeneratingDoc}
          />
        </section>

        {/* Column 3: Right - Documento: Preview & Editar (5 cols ~ 42%) */}
        <section className="col-span-12 md:col-span-5 lg:col-span-5 h-full overflow-hidden">
          <DocumentColumn
            onGenerateDoc={handleGenerateDoc}
            isGenerating={isGeneratingDoc}
          />
        </section>
      </main>

      {/* Export Package Modal */}
      <ExportModal isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} />
    </div>
  );
};

export default function App() {
  return (
    <ProjectProvider>
      <MainLayout />
    </ProjectProvider>
  );
}
