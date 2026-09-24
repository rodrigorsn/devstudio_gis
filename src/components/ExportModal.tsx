import React, { useState, useMemo } from 'react';
import JSZip from 'jszip';
import {
  X,
  Download,
  FolderTree,
  FileText,
  Copy,
  Check,
  CheckCircle2,
  Sparkles,
  Edit3,
  Eye,
  Loader2,
  Plus,
  Trash2,
  Wrench,
  BookOpen,
  Terminal,
  Code2,
  Layers,
} from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import {
  generateAgentsMd,
  generateClaudeMd,
  generateCursorMdc,
  generateStatusMd,
} from '../utils/demoData';
import {
  WORKFLOW_COMMANDS,
  formatClaudeSkill,
  formatCursorRule,
  formatDocsSkill,
  DEFAULT_DEMO_SKILLS,
} from '../utils/exportTemplates';
import { SkillItem } from '../types/spec';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose }) => {
  const {
    project,
    updateAgentsMd,
    setSkillsList,
    updateSkill,
    getApprovedDocsContext,
  } = useProject();

  const [mainView, setMainView] = useState<'files' | 'skills'>('files');
  const [selectedFilePath, setSelectedFilePath] = useState<string>('AGENTS.md');
  const [copied, setCopied] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [isGeneratingAgentsMd, setIsGeneratingAgentsMd] = useState(false);
  const [isGeneratingSkills, setIsGeneratingSkills] = useState(false);
  const [isEditingAgentsMd, setIsEditingAgentsMd] = useState(false);
  const [selectedSkillSlug, setSelectedSkillSlug] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  // Active skills
  const skills: SkillItem[] = useMemo(() => {
    if (project.skills && project.skills.length > 0) {
      return project.skills;
    }
    return DEFAULT_DEMO_SKILLS;
  }, [project.skills]);

  // Set default selected skill when opening skills tab
  const activeSkill = useMemo(() => {
    return skills.find((s) => s.slug === selectedSkillSlug) || skills[0] || null;
  }, [skills, selectedSkillSlug]);

  // Generate virtual file system
  const filesMap = useMemo(() => {
    const files: Record<string, string> = {};

    // 1. Root instruction files (use project.agentsMd if available, fallback to template)
    files['AGENTS.md'] = project.agentsMd || generateAgentsMd(project);
    files['CLAUDE.md'] = generateClaudeMd();
    files['.cursor/rules/core.mdc'] = generateCursorMdc();
    files['STATUS.md'] = generateStatusMd(project);

    // 2. Workflow commands (.claude/commands/ and docs/workflow/)
    files['.claude/commands/plan.md'] = WORKFLOW_COMMANDS.claudePlan;
    files['.claude/commands/execute.md'] = WORKFLOW_COMMANDS.claudeExecute;
    files['docs/workflow/plan.md'] = WORKFLOW_COMMANDS.docsPlan;
    files['docs/workflow/execute.md'] = WORKFLOW_COMMANDS.docsExecute;

    // 3. Stack Skills (3 locations per skill)
    skills.forEach((skill) => {
      files[`.claude/skills/${skill.slug}/SKILL.md`] = formatClaudeSkill(skill);
      files[`.cursor/rules/${skill.slug}.mdc`] = formatCursorRule(skill);
      files[`docs/skills/${skill.slug}.md`] = formatDocsSkill(skill);
    });

    // 4. docs/
    if (project.stages.brainstorm.documentContent) {
      files['docs/00-brainstorm.md'] = project.stages.brainstorm.documentContent;
    }
    if (project.stages.prd.documentContent) {
      files['docs/01-prd.md'] = project.stages.prd.documentContent;
    }
    if (project.stages.architecture.documentContent) {
      files['docs/02-arquitetura.md'] = project.stages.architecture.documentContent;
    }

    // ADRs
    project.adrs.forEach((adr) => {
      files[`docs/adr/${adr.filename}`] = adr.content;
    });

    // Features Specs & Screens
    project.features.forEach((feat) => {
      if (feat.specMarkdown) {
        files[`docs/specs/${feat.slug}/spec.md`] = feat.specMarkdown;
      }
      if (feat.screensMarkdown) {
        files[`docs/specs/${feat.slug}/telas.md`] = feat.screensMarkdown;
      }
    });

    // Tasks
    project.tasks.forEach((task) => {
      if (task.markdown) {
        files[`docs/tasks/${task.featureSlug}/${task.code}.md`] = task.markdown;
      }
    });

    return files;
  }, [project, skills]);

  const fileList = useMemo(() => {
    const list = Object.keys(filesMap).sort();
    if (!searchTerm.trim()) return list;
    const term = searchTerm.toLowerCase();
    return list.filter((f) => f.toLowerCase().includes(term));
  }, [filesMap, searchTerm]);

  const selectedContent = filesMap[selectedFilePath] || '';

  const handleCopy = () => {
    if (!selectedContent) return;
    navigator.clipboard.writeText(selectedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 1. Generate AGENTS.md with AI
  const handleGenerateAgentsMdWithAI = async () => {
    try {
      setIsGeneratingAgentsMd(true);
      const contextDocs = getApprovedDocsContext();
      const res = await fetch('/api/generate-agents-md', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: project.name,
          summary: project.summary,
          brainstormDoc: project.stages.brainstorm.documentContent || contextDocs['docs/00-brainstorm.md'],
          prdDoc: project.stages.prd.documentContent || contextDocs['docs/01-prd.md'],
          architectureDoc: project.stages.architecture.documentContent || contextDocs['docs/02-arquitetura.md'],
          adrs: project.adrs,
          features: project.features,
        }),
      });

      if (!res.ok) {
        throw new Error('Falha ao gerar AGENTS.md com IA.');
      }

      const data = await res.json();
      if (data.agentsMd) {
        updateAgentsMd(data.agentsMd);
        setSelectedFilePath('AGENTS.md');
        setMainView('files');
      }
    } catch (err: any) {
      console.error(err);
      alert('Erro ao gerar AGENTS.md com IA. Tente novamente.');
    } finally {
      setIsGeneratingAgentsMd(false);
    }
  };

  // 2. Generate Skills with AI
  const handleGenerateSkillsWithAI = async () => {
    try {
      setIsGeneratingSkills(true);
      const contextDocs = getApprovedDocsContext();
      const res = await fetch('/api/generate-skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: project.name,
          architectureDoc: project.stages.architecture.documentContent || contextDocs['docs/02-arquitetura.md'],
          adrs: project.adrs,
        }),
      });

      if (!res.ok) {
        throw new Error('Falha ao gerar skills com IA.');
      }

      const data = await res.json();
      if (data.skills && Array.isArray(data.skills) && data.skills.length > 0) {
        setSkillsList(data.skills);
        setSelectedSkillSlug(data.skills[0].slug);
        setSelectedFilePath(`docs/skills/${data.skills[0].slug}.md`);
      }
    } catch (err: any) {
      console.error(err);
      alert('Erro ao gerar skills com IA. Tente novamente.');
    } finally {
      setIsGeneratingSkills(false);
    }
  };

  // 3. Download ZIP
  const handleDownloadZip = async () => {
    try {
      setIsZipping(true);
      const zip = new JSZip();

      // Add each file to ZIP
      Object.entries(filesMap).forEach(([filePath, content]) => {
        zip.file(filePath, content);
      });

      const blob = await zip.generateAsync({ type: 'blob' });
      const sanitizedName = (project.name || 'spec-studio')
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '-');
      const filename = `${sanitizedName}-sdd-package.zip`;

      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (err) {
      console.error('Erro ao gerar zip:', err);
      alert('Erro ao empacotar arquivos .zip. Tente novamente.');
    } finally {
      setIsZipping(false);
    }
  };

  // Add new skill
  const handleAddSkill = () => {
    const newSlug = `custom-skill-${Date.now().toString().slice(-4)}`;
    const newSkill: SkillItem = {
      slug: newSlug,
      name: 'Nova Skill Técnica',
      description: 'Descrição das regras e boas práticas para esta camada',
      globs: 'src/**/*.ts',
      content: `## Boas Práticas\n- Escreva código modular e testável.\n- Siga os padrões do projeto.\n\n## Exemplo\n\`\`\`ts\n// Exemplo aqui\n\`\`\`\n\n## Erros a Evitar\n- Não quebre invariantes.`,
    };
    const updated = [...skills, newSkill];
    setSkillsList(updated);
    setSelectedSkillSlug(newSlug);
  };

  // Remove skill
  const handleRemoveSkill = (slug: string) => {
    if (skills.length <= 1) {
      alert('O projeto deve ter ao menos 1 skill.');
      return;
    }
    const updated = skills.filter((s) => s.slug !== slug);
    setSkillsList(updated);
    if (selectedSkillSlug === slug) {
      setSelectedSkillSlug(updated[0]?.slug || '');
    }
  };

  if (!isOpen) return null;

  const isAgentsMdSelected = selectedFilePath === 'AGENTS.md';

  // Helper badge for file paths
  const getFileBadge = (filePath: string) => {
    if (filePath === 'AGENTS.md') {
      return { label: 'AGENTS', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' };
    }
    if (filePath.startsWith('.claude/commands/') || filePath.startsWith('docs/workflow/')) {
      return { label: 'Comando', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
    }
    if (filePath.startsWith('.claude/skills/') || filePath.startsWith('.cursor/rules/') || filePath.startsWith('docs/skills/')) {
      return { label: 'Skill', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' };
    }
    if (filePath.startsWith('docs/tasks/')) {
      return { label: 'Tarefa', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
    }
    if (filePath.startsWith('docs/specs/')) {
      return { label: 'Spec', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' };
    }
    if (filePath.startsWith('docs/adr/')) {
      return { label: 'ADR', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' };
    }
    return null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 md:p-6 backdrop-blur-sm">
      <div className="flex h-[92vh] w-full max-w-6xl flex-col rounded-xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-950 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400">
              <FolderTree className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-white">Exportação Spec-Driven Development</h2>
                <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400 border border-emerald-500/20">
                  {Object.keys(filesMap).length} arquivos
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Pacote completo para Claude Code, Cursor, Codex e Antigravity
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Generate AGENTS.md button */}
            <button
              onClick={handleGenerateAgentsMdWithAI}
              disabled={isGeneratingAgentsMd}
              className="flex items-center gap-1.5 rounded-lg border border-purple-500/40 bg-purple-950/40 px-3 py-1.5 text-xs font-semibold text-purple-300 shadow hover:bg-purple-900/60 disabled:opacity-50 transition"
              title="Gera o AGENTS.md com IA a partir dos documentos aprovados"
            >
              {isGeneratingAgentsMd ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-400" />
                  <span>Gerando AGENTS...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                  <span>Gerar AGENTS.md com IA</span>
                </>
              )}
            </button>

            {/* Generate Skills button */}
            <button
              onClick={handleGenerateSkillsWithAI}
              disabled={isGeneratingSkills}
              className="flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-950/40 px-3 py-1.5 text-xs font-semibold text-cyan-300 shadow hover:bg-cyan-900/60 disabled:opacity-50 transition"
              title="Gera de 4 a 7 skills por camada da stack a partir da arquitetura e ADRs"
            >
              {isGeneratingSkills ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />
                  <span>Gerando Skills...</span>
                </>
              ) : (
                <>
                  <Wrench className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Gerar skills com IA</span>
                </>
              )}
            </button>

            {/* Download ZIP */}
            <button
              onClick={handleDownloadZip}
              disabled={isZipping || fileList.length === 0}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow hover:bg-emerald-500 disabled:opacity-50 transition"
            >
              <Download className={`h-4 w-4 ${isZipping ? 'animate-bounce' : ''}`} />
              {isZipping ? 'Compactando...' : 'Baixar Pacote (.zip)'}
            </button>

            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition ml-1"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* View Switcher Bar */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/80 px-5 py-2">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setMainView('files')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition ${
                mainView === 'files'
                  ? 'bg-slate-800 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FolderTree className="h-3.5 w-3.5 text-emerald-400" />
              <span>Árvore de Arquivos ({fileList.length})</span>
            </button>
            <button
              onClick={() => {
                setMainView('skills');
                if (!selectedSkillSlug && skills[0]) {
                  setSelectedSkillSlug(skills[0].slug);
                }
              }}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition ${
                mainView === 'skills'
                  ? 'bg-slate-800 text-cyan-300 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Wrench className="h-3.5 w-3.5 text-cyan-400" />
              <span>Gerenciar Skills ({skills.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            {mainView === 'files' && (
              <input
                type="text"
                placeholder="Filtrar arquivos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-48 rounded-md border border-slate-800 bg-slate-900 px-2.5 py-0.5 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-slate-700"
              />
            )}
          </div>
        </div>

        {/* Modal Body */}
        {mainView === 'files' ? (
          <div className="flex flex-1 overflow-hidden">
            {/* Left: File Tree */}
            <div className="w-80 border-r border-slate-800 bg-slate-950/60 p-3 overflow-y-auto">
              <div className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Arquivos do Repositório</span>
                <span className="font-mono text-[10px] text-slate-500">{fileList.length} itens</span>
              </div>
              <div className="space-y-0.5">
                {fileList.map((filePath) => {
                  const isSelected = selectedFilePath === filePath;
                  const badge = getFileBadge(filePath);

                  return (
                    <button
                      key={filePath}
                      onClick={() => {
                        setSelectedFilePath(filePath);
                        if (filePath !== 'AGENTS.md') {
                          setIsEditingAgentsMd(false);
                        }
                      }}
                      className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs transition font-mono ${
                        isSelected
                          ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                          : 'text-slate-300 hover:bg-slate-850 hover:text-white'
                      }`}
                    >
                      <FileText
                        className={`h-3.5 w-3.5 shrink-0 ${
                          filePath === 'AGENTS.md'
                            ? 'text-purple-400'
                            : filePath.includes('commands') || filePath.includes('workflow')
                            ? 'text-amber-400'
                            : filePath.includes('skills') || filePath.includes('.mdc')
                            ? 'text-cyan-400'
                            : 'text-slate-400'
                        }`}
                      />
                      <span className="truncate flex-1">{filePath}</span>
                      {badge && (
                        <span
                          className={`rounded px-1.5 py-0.2 text-[9px] font-sans border ${badge.color}`}
                        >
                          {badge.label}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right: File Viewer */}
            <div className="flex flex-1 flex-col overflow-hidden bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/40 px-4 py-2.5">
                <div className="flex items-center gap-2 font-mono text-xs text-slate-200">
                  <FileText className="h-4 w-4 text-emerald-400" />
                  <span className="font-semibold">{selectedFilePath}</span>
                  {isAgentsMdSelected && project.agentsMd && (
                    <span className="rounded bg-purple-500/20 px-1.5 py-0.5 font-sans text-[10px] text-purple-300 border border-purple-500/30">
                      Personalizado / IA
                    </span>
                  )}
                  {getFileBadge(selectedFilePath) && (
                    <span className="text-slate-500 text-[11px] font-sans">
                      ({getFileBadge(selectedFilePath)?.label})
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {isAgentsMdSelected && (
                    <button
                      onClick={() => setIsEditingAgentsMd(!isEditingAgentsMd)}
                      className="flex items-center gap-1.5 rounded bg-slate-800 px-3 py-1 text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition"
                    >
                      {isEditingAgentsMd ? (
                        <>
                          <Eye className="h-3.5 w-3.5 text-emerald-400" />
                          <span>Ver Pré-visualização</span>
                        </>
                      ) : (
                        <>
                          <Edit3 className="h-3.5 w-3.5" />
                          <span>Editar AGENTS.md</span>
                        </>
                      )}
                    </button>
                  )}
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 rounded bg-slate-800 px-3 py-1 text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-medium">Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copiar arquivo</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-auto p-4">
                {isAgentsMdSelected && isEditingAgentsMd ? (
                  <div className="flex h-full flex-col">
                    <textarea
                      value={project.agentsMd || selectedContent}
                      onChange={(e) => updateAgentsMd(e.target.value)}
                      placeholder="Edite o AGENTS.md aqui..."
                      className="flex-1 w-full resize-none rounded-lg border border-slate-800 bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-200 placeholder-slate-600 outline-none focus:border-purple-500"
                    />
                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Alterações no AGENTS.md são salvas diretamente no projeto.</span>
                      <span className="font-mono text-emerald-400">✓ Sincronizado</span>
                    </div>
                  </div>
                ) : (
                  <pre className="font-mono text-xs leading-relaxed text-slate-200 whitespace-pre-wrap select-text">
                    {selectedContent}
                  </pre>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Skills Management View */
          <div className="flex flex-1 overflow-hidden">
            {/* Left: Skills List */}
            <div className="w-80 border-r border-slate-800 bg-slate-950/60 p-3 overflow-y-auto flex flex-col justify-between">
              <div>
                <div className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>Skills da Stack ({skills.length})</span>
                  <button
                    onClick={handleAddSkill}
                    className="flex items-center gap-1 rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-200 hover:bg-slate-700 transition"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Nova</span>
                  </button>
                </div>

                <div className="space-y-1">
                  {skills.map((skill) => {
                    const isSelected = activeSkill?.slug === skill.slug;
                    return (
                      <div
                        key={skill.slug}
                        onClick={() => setSelectedSkillSlug(skill.slug)}
                        className={`group flex items-start justify-between rounded-lg p-2.5 cursor-pointer border transition ${
                          isSelected
                            ? 'bg-cyan-950/40 border-cyan-500/40 text-cyan-200'
                            : 'border-slate-800/80 bg-slate-900/60 text-slate-300 hover:border-slate-700 hover:bg-slate-850'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 font-medium text-xs">
                            <Wrench className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                            <span className="truncate">{skill.name}</span>
                          </div>
                          <div className="mt-1 font-mono text-[10px] text-slate-400 truncate">
                            {skill.globs}
                          </div>
                          <p className="mt-1 text-[11px] text-slate-400 line-clamp-1">
                            {skill.description}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveSkill(skill.slug);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 transition"
                          title="Remover skill"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-slate-800 bg-slate-900/50 p-3 text-[11px] text-slate-400">
                <p className="font-semibold text-slate-300 mb-1">Destinos da exportação:</p>
                <ul className="space-y-1 font-mono text-[10px] text-slate-400">
                  <li>• .claude/skills/&lt;slug&gt;/SKILL.md</li>
                  <li>• .cursor/rules/&lt;slug&gt;.mdc</li>
                  <li>• docs/skills/&lt;slug&gt;.md</li>
                </ul>
              </div>
            </div>

            {/* Right: Active Skill Editor */}
            <div className="flex flex-1 flex-col overflow-hidden bg-slate-900">
              {activeSkill ? (
                <div className="flex flex-1 flex-col overflow-hidden p-5">
                  <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        Nome da Skill
                      </label>
                      <input
                        type="text"
                        value={activeSkill.name}
                        onChange={(e) =>
                          updateSkill(activeSkill.slug, { name: e.target.value })
                        }
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-white outline-none focus:border-cyan-500 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        Padrão de Arquivos (Globs)
                      </label>
                      <input
                        type="text"
                        value={activeSkill.globs}
                        onChange={(e) =>
                          updateSkill(activeSkill.slug, { globs: e.target.value })
                        }
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-white outline-none focus:border-cyan-500 font-mono"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        Descrição / Propósito
                      </label>
                      <input
                        type="text"
                        value={activeSkill.description}
                        onChange={(e) =>
                          updateSkill(activeSkill.slug, { description: e.target.value })
                        }
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-white outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col min-h-0">
                    <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                      <span>Conteúdo da Skill (Boas Práticas, Exemplos, Erros a Evitar)</span>
                      <span className="text-[10px] text-cyan-400 font-mono">
                        Slug: {activeSkill.slug}
                      </span>
                    </label>
                    <textarea
                      value={activeSkill.content}
                      onChange={(e) =>
                        updateSkill(activeSkill.slug, { content: e.target.value })
                      }
                      placeholder="Escreva as boas práticas, convenções, exemplos e erros a evitar..."
                      className="flex-1 w-full resize-none rounded-lg border border-slate-700 bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-200 placeholder-slate-600 outline-none focus:border-cyan-500"
                    />
                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                      <span>
                        Sincroniza automaticamente com as 3 versões (.claude, .cursor e docs).
                      </span>
                      <span className="font-mono text-emerald-400">✓ Salvo em memória</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-1 items-center justify-center p-8 text-center text-slate-500 text-xs">
                  Nenhuma skill selecionada. Clique em "Nova" ou "Gerar skills com IA".
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950 px-6 py-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>
              Inclui AGENTS.md, comandos /plan e /execute em .claude e docs/workflow, e skills por camada da stack.
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded bg-slate-800 px-3.5 py-1.5 text-slate-200 hover:bg-slate-700 transition font-medium"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
