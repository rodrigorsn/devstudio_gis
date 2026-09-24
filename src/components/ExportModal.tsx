import React, { useState, useMemo } from 'react';
import JSZip from 'jszip';
import {
  X,
  Download,
  FolderTree,
  FileText,
  Folder,
  Copy,
  Check,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import {
  generateAgentsMd,
  generateClaudeMd,
  generateCursorMdc,
  generateStatusMd,
} from '../utils/demoData';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface VirtualFile {
  path: string;
  name: string;
  content: string;
  isFolder?: boolean;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose }) => {
  const { project } = useProject();
  const [selectedFilePath, setSelectedFilePath] = useState<string>('AGENTS.md');
  const [copied, setCopied] = useState(false);
  const [isZipping, setIsZipping] = useState(false);

  // Generate virtual file system
  const filesMap = useMemo(() => {
    const files: Record<string, string> = {};

    // 1. Root instruction files
    files['AGENTS.md'] = generateAgentsMd(project);
    files['CLAUDE.md'] = generateClaudeMd();
    files['.cursor/rules/core.mdc'] = generateCursorMdc();
    files['STATUS.md'] = generateStatusMd(project);

    // 2. docs/
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
  }, [project]);

  const fileList = useMemo(() => {
    return Object.keys(filesMap).sort();
  }, [filesMap]);

  const selectedContent = filesMap[selectedFilePath] || '';

  const handleCopy = () => {
    if (!selectedContent) return;
    navigator.clipboard.writeText(selectedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="flex h-[90vh] w-full max-w-5xl flex-col rounded-xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400">
              <FolderTree className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Exportar Pacote Spec-Driven Development</h2>
              <p className="text-xs text-slate-400">
                Arquivos markdown estruturados prontos para agentes de código (Claude Code, Cursor, Codex, Antigravity)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadZip}
              disabled={isZipping || fileList.length === 0}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-emerald-500 disabled:opacity-50 transition"
            >
              <Download className={`h-4 w-4 ${isZipping ? 'animate-bounce' : ''}`} />
              {isZipping ? 'Compactando...' : 'Baixar Pacote Completo (.zip)'}
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: 2 columns (Tree on left, File preview on right) */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: File Tree */}
          <div className="w-72 border-r border-slate-800 bg-slate-950/60 p-3 overflow-y-auto">
            <div className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Árvore de Arquivos ({fileList.length})
            </div>
            <div className="space-y-0.5">
              {fileList.map((filePath) => {
                const isSelected = selectedFilePath === filePath;
                const isRootInstruction =
                  filePath === 'AGENTS.md' ||
                  filePath === 'CLAUDE.md' ||
                  filePath.includes('core.mdc') ||
                  filePath === 'STATUS.md';

                return (
                  <button
                    key={filePath}
                    onClick={() => setSelectedFilePath(filePath)}
                    className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs transition font-mono ${
                      isSelected
                        ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                        : 'text-slate-300 hover:bg-slate-850 hover:text-white'
                    }`}
                  >
                    <FileText
                      className={`h-3.5 w-3.5 shrink-0 ${
                        isRootInstruction ? 'text-amber-400' : 'text-slate-400'
                      }`}
                    />
                    <span className="truncate">{filePath}</span>
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
                <span>{selectedFilePath}</span>
              </div>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 rounded bg-slate-800 px-3 py-1 text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copiar arquivo</span>
                  </>
                )}
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <pre className="font-mono text-xs leading-relaxed text-slate-200 whitespace-pre-wrap">
                {selectedContent}
              </pre>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950 px-6 py-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>Todos os arquivos obedecem à especificação estrita para agentes autônomos.</span>
          </div>
          <button
            onClick={onClose}
            className="rounded bg-slate-800 px-3 py-1.5 text-slate-200 hover:bg-slate-700 transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
