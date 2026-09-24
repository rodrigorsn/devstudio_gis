import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Sparkles,
  Layout,
  Monitor,
  Code,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Edit2,
  Check,
  X,
  FileCode,
  Layers,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { FeatureItem, PageItem, ComponentItem, BehaviorItem } from '../types/spec';
import { WireframePreview } from './WireframePreview';

interface ScreensManagerProps {
  feature: FeatureItem;
  onUpdatePages: (pages: PageItem[]) => void;
  contextDocs: Record<string, string>;
}

export const ScreensManager: React.FC<ScreensManagerProps> = ({
  feature,
  onUpdatePages,
  contextDocs,
}) => {
  const pages = feature.pages || [];
  const [selectedPageId, setSelectedPageId] = useState<string>(() => pages[0]?.id || '');
  const [isGeneratingPages, setIsGeneratingPages] = useState(false);
  const [isGeneratingWireframe, setIsGeneratingWireframe] = useState(false);
  const [editingPageMeta, setEditingPageMeta] = useState(false);

  // Keep selectedPageId valid
  const activePage = pages.find((p) => p.id === selectedPageId) || pages[0];

  // Helper to persist page updates
  const handleUpdateCurrentPage = (updatedPage: PageItem) => {
    const newPages = pages.map((p) => (p.id === updatedPage.id ? updatedPage : p));
    onUpdatePages(newPages);
  };

  // Generate pages via Gemini
  const handleGeneratePages = async () => {
    try {
      setIsGeneratingPages(true);
      const res = await fetch('/api/generate-pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          featureTitle: feature.title,
          featureSlug: feature.slug,
          featureSpec: feature.specMarkdown,
          contextDocs,
        }),
      });

      if (!res.ok) throw new Error('Falha ao gerar páginas.');
      const { pages: generatedPages } = await res.json();

      if (Array.isArray(generatedPages) && generatedPages.length > 0) {
        onUpdatePages(generatedPages);
        setSelectedPageId(generatedPages[0]?.id || '');
      }
    } catch (err: any) {
      console.error(err);
      alert('Erro ao gerar páginas com IA: ' + err.message);
    } finally {
      setIsGeneratingPages(false);
    }
  };

  // Generate wireframe for the currently selected page
  const handleGeneratePageWireframe = async () => {
    if (!activePage) return;
    try {
      setIsGeneratingWireframe(true);
      const res = await fetch('/api/generate-wireframe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          featureTitle: feature.title,
          featureSlug: feature.slug,
          pageId: activePage.id,
          pageName: activePage.name,
          pageRoute: activePage.route,
          pagePurpose: activePage.purpose,
          pageComponents: activePage.components,
          contextDocs,
        }),
      });

      if (!res.ok) throw new Error('Falha ao gerar wireframe.');
      const { wireframeHtml } = await res.json();

      handleUpdateCurrentPage({
        ...activePage,
        wireframeHtml,
      });
    } catch (err: any) {
      console.error(err);
      alert('Erro ao gerar wireframe da página: ' + err.message);
    } finally {
      setIsGeneratingWireframe(false);
    }
  };

  // Add a new page
  const handleAddPage = () => {
    const name = window.prompt('Nome da nova página:', 'Nova Página');
    if (!name) return;
    const route = window.prompt('Rota da página (ex: /dashboard):', `/${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`);
    const purpose = window.prompt('Objetivo da página:', 'Permitir ao usuário...') || '';

    const newPage: PageItem = {
      id: 'page-' + Date.now(),
      name,
      route: route || '/',
      purpose,
      components: [
        {
          id: 'comp-' + Date.now(),
          name: 'MainContainer',
          description: 'Contêiner principal da interface',
          behaviors: [
            {
              trigger: 'Acessa a rota da página',
              expectedResult: 'Renderiza a tela com o estado inicial',
              errorCase: 'Se falhar carregamento, exibe mensagem de erro',
            },
          ],
        },
      ],
    };

    const newPages = [...pages, newPage];
    onUpdatePages(newPages);
    setSelectedPageId(newPage.id);
  };

  // Remove a page
  const handleRemovePage = (pageId: string) => {
    if (pages.length <= 1) {
      alert('A feature deve ter pelo menos uma página.');
      return;
    }
    if (window.confirm('Excluir esta página e todos os seus componentes?')) {
      const newPages = pages.filter((p) => p.id !== pageId);
      onUpdatePages(newPages);
      if (selectedPageId === pageId) {
        setSelectedPageId(newPages[0]?.id || '');
      }
    }
  };

  // Component management for activePage
  const handleAddComponent = () => {
    if (!activePage) return;
    const name = window.prompt('Nome do novo componente (ex: TaskFilterBar):', 'NovoComponente');
    if (!name) return;
    const description = window.prompt('Descrição do componente:', 'Elemento de interface') || '';

    const newComp: ComponentItem = {
      id: 'comp-' + Date.now(),
      name,
      description,
      behaviors: [
        {
          trigger: 'Interage com o componente',
          expectedResult: 'Executa a ação correspondente',
          errorCase: '-',
        },
      ],
    };

    handleUpdateCurrentPage({
      ...activePage,
      components: [...activePage.components, newComp],
    });
  };

  const handleUpdateComponent = (compId: string, patch: Partial<ComponentItem>) => {
    if (!activePage) return;
    const updatedComponents = activePage.components.map((c) =>
      c.id === compId ? { ...c, ...patch } : c
    );
    handleUpdateCurrentPage({
      ...activePage,
      components: updatedComponents,
    });
  };

  const handleRemoveComponent = (compId: string) => {
    if (!activePage) return;
    if (window.confirm('Excluir este componente e seus comportamentos?')) {
      const updatedComponents = activePage.components.filter((c) => c.id !== compId);
      handleUpdateCurrentPage({
        ...activePage,
        components: updatedComponents,
      });
    }
  };

  // Behavior management for a component
  const handleAddBehavior = (compId: string) => {
    if (!activePage) return;
    const comp = activePage.components.find((c) => c.id === compId);
    if (!comp) return;

    const newBehavior: BehaviorItem = {
      trigger: 'Nova ação do usuário',
      expectedResult: 'Resultado esperado na interface',
      errorCase: '-',
    };

    handleUpdateComponent(compId, {
      behaviors: [...comp.behaviors, newBehavior],
    });
  };

  const handleUpdateBehavior = (
    compId: string,
    behaviorIdx: number,
    field: keyof BehaviorItem,
    value: string
  ) => {
    if (!activePage) return;
    const comp = activePage.components.find((c) => c.id === compId);
    if (!comp) return;

    const updatedBehaviors = comp.behaviors.map((b, idx) =>
      idx === behaviorIdx ? { ...b, [field]: value } : b
    );

    handleUpdateComponent(compId, {
      behaviors: updatedBehaviors,
    });
  };

  const handleRemoveBehavior = (compId: string, behaviorIdx: number) => {
    if (!activePage) return;
    const comp = activePage.components.find((c) => c.id === compId);
    if (!comp) return;

    const updatedBehaviors = comp.behaviors.filter((_, idx) => idx !== behaviorIdx);
    handleUpdateComponent(compId, {
      behaviors: updatedBehaviors,
    });
  };

  return (
    <div className="flex flex-col space-y-4">
      {/* Pages Selection Bar */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Layout className="h-4 w-4 text-emerald-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Páginas da Feature ({pages.length})
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleGeneratePages}
              disabled={isGeneratingPages}
              className="flex items-center gap-1.5 rounded bg-indigo-600/90 px-2.5 py-1 text-xs font-semibold text-white shadow hover:bg-indigo-500 disabled:opacity-50 transition"
              title="Gera a estrutura hierárquica de páginas, componentes e comportamentos usando Gemini"
            >
              <Sparkles className={`h-3 w-3 ${isGeneratingPages ? 'animate-spin' : ''}`} />
              {isGeneratingPages ? 'Gerando...' : 'Gerar Páginas com IA'}
            </button>

            <button
              onClick={handleAddPage}
              className="flex items-center gap-1 rounded border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-200 hover:bg-slate-700 transition"
            >
              <Plus className="h-3 w-3" />
              Nova Página
            </button>
          </div>
        </div>

        {/* Page tabs */}
        {pages.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">
            <p>Nenhuma página cadastrada para esta feature.</p>
            <p className="mt-1 text-slate-500">
              Clique em &quot;Gerar Páginas com IA&quot; para estruturar automaticamente ou &quot;Nova Página&quot;.
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 pt-1">
            {pages.map((p) => {
              const isSelected = p.id === (activePage?.id || selectedPageId);
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedPageId(p.id)}
                  className={`group flex items-center gap-2 rounded-md px-3 py-1.5 text-xs cursor-pointer transition border ${
                    isSelected
                      ? 'bg-emerald-950/40 border-emerald-500/80 text-white font-semibold'
                      : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  <span className="font-medium truncate max-w-[150px]">{p.name}</span>
                  <span className="font-mono text-[10px] text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/40">
                    {p.route}
                  </span>
                  {pages.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemovePage(p.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 hover:text-rose-400 p-0.5 transition"
                      title="Excluir página"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected Page Workspace */}
      {activePage && (
        <div className="space-y-4">
          {/* Page Details Card */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Página:
                  </span>
                  <input
                    type="text"
                    value={activePage.name}
                    onChange={(e) =>
                      handleUpdateCurrentPage({ ...activePage, name: e.target.value })
                    }
                    className="font-bold text-sm text-white bg-slate-950/80 px-2 py-0.5 rounded border border-slate-700 focus:border-emerald-500 outline-none"
                    placeholder="Nome da Página"
                  />
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-2">
                    Rota:
                  </span>
                  <input
                    type="text"
                    value={activePage.route}
                    onChange={(e) =>
                      handleUpdateCurrentPage({ ...activePage, route: e.target.value })
                    }
                    className="font-mono text-xs text-emerald-400 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-700 focus:border-emerald-500 outline-none w-36"
                    placeholder="/rota"
                  />
                </div>

                <div className="flex items-start gap-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider shrink-0 mt-1">
                    Objetivo:
                  </span>
                  <input
                    type="text"
                    value={activePage.purpose}
                    onChange={(e) =>
                      handleUpdateCurrentPage({ ...activePage, purpose: e.target.value })
                    }
                    className="flex-1 text-xs text-slate-200 bg-slate-950/80 px-2 py-1 rounded border border-slate-700 focus:border-emerald-500 outline-none"
                    placeholder="Qual é o propósito desta página?"
                  />
                </div>
              </div>

              {/* Wireframe generation button */}
              <button
                onClick={handleGeneratePageWireframe}
                disabled={isGeneratingWireframe}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-emerald-500 disabled:opacity-50 transition shrink-0"
              >
                <Monitor className={`h-3.5 w-3.5 ${isGeneratingWireframe ? 'animate-spin' : ''}`} />
                {isGeneratingWireframe ? 'Gerando Wireframe...' : 'Gerar Wireframe da Página'}
              </button>
            </div>
          </div>

          {/* Wireframe Preview for this page */}
          <div className="rounded-lg border border-slate-800 bg-slate-950/90 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/80 px-4 py-2">
              <div className="flex items-center gap-2">
                <Monitor className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Wireframe Interativo: {activePage.name}
                </span>
                <span className="font-mono text-[10px] text-slate-400">({activePage.route})</span>
              </div>
              <button
                onClick={handleGeneratePageWireframe}
                disabled={isGeneratingWireframe}
                className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300"
              >
                <RefreshCw className={`h-3 w-3 ${isGeneratingWireframe ? 'animate-spin' : ''}`} />
                {activePage.wireframeHtml ? 'Regenerar Wireframe' : 'Gerar Wireframe'}
              </button>
            </div>

            <div className="p-3">
              {activePage.wireframeHtml ? (
                <WireframePreview
                  html={activePage.wireframeHtml}
                  onRegenerate={handleGeneratePageWireframe}
                  isGenerating={isGeneratingWireframe}
                />
              ) : (
                <div className="py-8 text-center border border-dashed border-slate-800 rounded-lg">
                  <Monitor className="mx-auto h-8 w-8 text-slate-600 mb-2" />
                  <p className="text-xs text-slate-400">Nenhum wireframe gerado para esta página ainda.</p>
                  <button
                    onClick={handleGeneratePageWireframe}
                    disabled={isGeneratingWireframe}
                    className="mt-3 inline-flex items-center gap-1.5 rounded bg-slate-800 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-slate-700 transition"
                  >
                    <Sparkles className="h-3 w-3" />
                    Gerar Wireframe com IA
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Components & Behaviors List */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-indigo-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Componentes & Comportamentos ({activePage.components.length})
                </h4>
              </div>
              <button
                onClick={handleAddComponent}
                className="flex items-center gap-1 rounded bg-slate-800 border border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-200 hover:bg-slate-700 transition"
              >
                <Plus className="h-3 w-3 text-emerald-400" />
                Adicionar Componente
              </button>
            </div>

            {activePage.components.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400 border border-dashed border-slate-800 rounded-lg">
                <p>Nenhum componente cadastrado nesta página.</p>
                <button
                  onClick={handleAddComponent}
                  className="mt-2 text-emerald-400 hover:underline"
                >
                  + Adicionar o primeiro componente
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {activePage.components.map((comp) => (
                  <div
                    key={comp.id}
                    className="rounded-lg border border-slate-800/90 bg-slate-950/80 p-3.5 space-y-3"
                  >
                    {/* Component Header */}
                    <div className="flex items-center justify-between gap-3 border-b border-slate-800/60 pb-2.5">
                      <div className="flex-1 flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-indigo-400">&lt;</span>
                        <input
                          type="text"
                          value={comp.name}
                          onChange={(e) =>
                            handleUpdateComponent(comp.id, { name: e.target.value })
                          }
                          className="font-mono text-xs font-bold text-white bg-slate-900/90 px-2 py-0.5 rounded border border-slate-700 focus:border-indigo-500 outline-none w-52"
                          placeholder="NomeComponente"
                        />
                        <span className="font-mono text-xs font-bold text-indigo-400">/&gt;</span>

                        <input
                          type="text"
                          value={comp.description}
                          onChange={(e) =>
                            handleUpdateComponent(comp.id, { description: e.target.value })
                          }
                          className="flex-1 text-xs text-slate-300 bg-slate-900/60 px-2 py-0.5 rounded border border-slate-800 focus:border-slate-600 outline-none"
                          placeholder="Descrição do papel do componente..."
                        />
                      </div>

                      <button
                        onClick={() => handleRemoveComponent(comp.id)}
                        className="text-slate-500 hover:text-rose-400 p-1 transition"
                        title="Remover componente"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Behaviors Table */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Tabela de Comportamentos (Ação → Resultado → Erro)
                        </span>
                        <button
                          onClick={() => handleAddBehavior(comp.id)}
                          className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300"
                        >
                          <Plus className="h-3 w-3" />
                          Adicionar Linha
                        </button>
                      </div>

                      <div className="overflow-x-auto rounded border border-slate-800 bg-slate-900/40">
                        <table className="w-full text-left text-xs">
                          <thead className="border-b border-slate-800 bg-slate-900 text-[10px] uppercase tracking-wider text-slate-400">
                            <tr>
                              <th className="py-1.5 px-2.5 font-semibold w-1/3">Ação do Usuário</th>
                              <th className="py-1.5 px-2.5 font-semibold w-1/3">Resultado Esperado</th>
                              <th className="py-1.5 px-2.5 font-semibold w-1/4">Caso de Erro</th>
                              <th className="py-1.5 px-2 font-semibold w-10 text-center">Ações</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {comp.behaviors.map((b, bIdx) => (
                              <tr key={bIdx} className="hover:bg-slate-800/30 group">
                                <td className="p-1.5">
                                  <input
                                    type="text"
                                    value={b.trigger}
                                    onChange={(e) =>
                                      handleUpdateBehavior(comp.id, bIdx, 'trigger', e.target.value)
                                    }
                                    className="w-full bg-slate-950/70 border border-slate-800 px-2 py-1 rounded text-xs text-slate-200 focus:border-emerald-500 outline-none"
                                    placeholder="O que o usuário faz..."
                                  />
                                </td>
                                <td className="p-1.5">
                                  <input
                                    type="text"
                                    value={b.expectedResult}
                                    onChange={(e) =>
                                      handleUpdateBehavior(comp.id, bIdx, 'expectedResult', e.target.value)
                                    }
                                    className="w-full bg-slate-950/70 border border-slate-800 px-2 py-1 rounded text-xs text-slate-200 focus:border-emerald-500 outline-none"
                                    placeholder="O que o sistema responde..."
                                  />
                                </td>
                                <td className="p-1.5">
                                  <input
                                    type="text"
                                    value={b.errorCase || ''}
                                    onChange={(e) =>
                                      handleUpdateBehavior(comp.id, bIdx, 'errorCase', e.target.value)
                                    }
                                    className="w-full bg-slate-950/70 border border-slate-800 px-2 py-1 rounded text-xs text-slate-200 focus:border-emerald-500 outline-none"
                                    placeholder="Comportamento em caso de falha..."
                                  />
                                </td>
                                <td className="p-1.5 text-center">
                                  <button
                                    onClick={() => handleRemoveBehavior(comp.id, bIdx)}
                                    className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 p-1 transition"
                                    title="Remover linha"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
