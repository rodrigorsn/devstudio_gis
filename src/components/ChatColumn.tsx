import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  Bot,
  User,
  Upload,
  CheckCircle,
  FileCheck,
  Download,
  Check,
  AlertCircle,
  Trash2,
  HelpCircle,
  Zap,
} from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { STAGES_LIST, StageId } from '../types/spec';
import { generateStatusMd } from '../utils/demoData';

interface ChatColumnProps {
  onTriggerGenerateDoc: () => void;
  isGeneratingDoc?: boolean;
}

export const ChatColumn: React.FC<ChatColumnProps> = ({
  onTriggerGenerateDoc,
  isGeneratingDoc = false,
}) => {
  const {
    project,
    activeStageId,
    addChatMessage,
    clearStageChat,
    getApprovedDocsContext,
    toggleTaskCompleted,
    toggleVerificationCheck,
    importStatusMarkdown,
    updateStageDocument,
  } = useProject();

  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [adjustPending, setAdjustPending] = useState<{ original: string; adjusted: string } | null>(
    null
  );

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stageState = project.stages[activeStageId];
  const stageInfo = STAGES_LIST.find((s) => s.id === activeStageId)!;
  const chatHistory = stageState?.chatHistory || [];

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isSending]);

  // Handle send message
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isSending) return;

    setInputText('');
    setIsSending(true);

    // 1. Add user message
    addChatMessage(activeStageId, {
      role: 'user',
      text,
    });

    try {
      const contextDocs = getApprovedDocsContext();
      const currentDocContent = stageState?.documentContent || '';

      // Check if user is requesting document adjustment
      const isAdjustmentRequest =
        text.toLowerCase().includes('ajuste') ||
        text.toLowerCase().includes('adicione') ||
        text.toLowerCase().includes('remova') ||
        text.toLowerCase().includes('substitua') ||
        text.toLowerCase().includes('mude no documento') ||
        text.toLowerCase().includes('altere');

      if (isAdjustmentRequest && currentDocContent) {
        // Try adjustment via /api/adjust-doc
        const adjustRes = await fetch('/api/adjust-doc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stageId: activeStageId,
            currentContent: currentDocContent,
            instruction: text,
            contextDocs,
          }),
        });

        if (adjustRes.ok) {
          const { markdown } = await adjustRes.json();
          // Store pending adjustment so user can confirm
          setAdjustPending({
            original: currentDocContent,
            adjusted: markdown,
          });

          addChatMessage(activeStageId, {
            role: 'model',
            text: `Preparei a versão ajustada do documento incorporando sua solicitação: "${text}".\n\nVocê pode revisar e aplicar a alteração diretamente no documento usando o botão abaixo.`,
          });
          setIsSending(false);
          return;
        }
      }

      // Standard chat interview call
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stageId: activeStageId,
          stageTitle: stageInfo.title,
          messages: [...chatHistory, { role: 'user', text }],
          contextDocs,
          currentDocContent,
        }),
      });

      if (!res.ok) {
        throw new Error('Falha na resposta do servidor Gemini');
      }

      const data = await res.json();
      addChatMessage(activeStageId, {
        role: 'model',
        text: data.reply || 'Entendido!',
        suggestedAnswer: data.suggestedAnswer,
        isReadyToGenerate: data.isReadyToGenerate,
      });
    } catch (err: any) {
      console.error('Error sending chat message:', err);
      addChatMessage(activeStageId, {
        role: 'model',
        text: `Ocorreu um erro ao consultar o Gemini: ${err.message}. Verifique a conexão e tente novamente.`,
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleApplyAdjustment = () => {
    if (adjustPending) {
      updateStageDocument(activeStageId, adjustPending.adjusted);
      addChatMessage(activeStageId, {
        role: 'model',
        text: '✅ Documento atualizado com sucesso!',
      });
      setAdjustPending(null);
    }
  };

  // Stage 7: Handle STATUS.md upload
  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        const result = importStatusMarkdown(content);
        setImportNotice(
          `STATUS.md importado: ${result.completedCount} tarefas marcadas como concluídas!`
        );
        setTimeout(() => setImportNotice(null), 5000);
      }
    };
    reader.readAsText(file);
  };

  // RENDER: Stage 7 (Implementação)
  if (activeStageId === 'implementation') {
    const totalTasks = project.tasks.length;
    const completedTasks = project.tasks.filter((t) => t.completed).length;
    const percent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return (
      <div className="flex h-full flex-col bg-slate-900 overflow-y-auto p-6">
        <div className="mb-6 flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded bg-emerald-500/20 text-emerald-400 text-xs">
                7
              </span>
              Implementação & Execução de Tarefas
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Acompanhe a execução das tarefas pelos agentes de código ou importe seu STATUS.md atualizado.
            </p>
          </div>
          <button
            onClick={() => {
              const statusContent = generateStatusMd(project);
              const blob = new Blob([statusContent], { type: 'text/markdown' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'STATUS.md';
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700 transition"
          >
            <Download className="h-3.5 w-3.5" />
            Baixar STATUS.md
          </button>
        </div>

        {importNotice && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-950/40 p-3 text-xs text-emerald-300">
            <Check className="h-4 w-4 text-emerald-400" />
            <span>{importNotice}</span>
          </div>
        )}

        {/* Progress summary banner */}
        <div className="mb-6 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-semibold text-slate-300">Progresso Geral das Tarefas</span>
            <span className="font-mono text-emerald-400 font-bold">
              {completedTasks} / {totalTasks} concluídas ({percent}%)
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        {/* Upload dropzone for STATUS.md */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            if (e.dataTransfer.files?.[0]) {
              handleFileUpload(e.dataTransfer.files[0]);
            }
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`mb-6 flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition ${
            dragActive
              ? 'border-emerald-500 bg-emerald-950/20'
              : 'border-slate-800 bg-slate-950/30 hover:border-slate-700 hover:bg-slate-950/60'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".md"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                handleFileUpload(e.target.files[0]);
              }
            }}
          />
          <Upload className="mb-2 h-8 w-8 text-slate-500" />
          <p className="text-xs font-semibold text-slate-300">
            Clique ou arraste um arquivo <span className="font-mono text-emerald-400">STATUS.md</span> aqui
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Marca automaticamente as tarefas que contêm <code className="text-slate-400">- [x] T00X</code>
          </p>
        </div>

        {/* Tasks List */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Todas as Tarefas do Projeto ({totalTasks})
          </h3>
          {project.tasks.length === 0 ? (
            <div className="rounded-lg border border-slate-800 bg-slate-950 p-6 text-center text-xs text-slate-500">
              Nenhuma tarefa criada ainda. Conclua as etapas anteriores até a Etapa 6 (Tarefas).
            </div>
          ) : (
            project.tasks.map((task) => (
              <div
                key={task.id}
                onClick={() => toggleTaskCompleted(task.id)}
                className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition ${
                  task.completed
                    ? 'border-slate-800 bg-slate-950/40 opacity-75'
                    : 'border-slate-800 bg-slate-950/80 hover:border-slate-700'
                }`}
              >
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={() => toggleTaskCompleted(task.id)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0 cursor-pointer"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-emerald-400">{task.code}</span>
                    <span
                      className={`text-xs font-medium ${
                        task.completed ? 'line-through text-slate-500' : 'text-slate-200'
                      }`}
                    >
                      {task.title}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-500">
                    <span>Feature: {task.featureSlug}</span>
                    {task.refs && <span>| Refs: {task.refs.join(', ')}</span>}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // RENDER: Stage 8 (Verificação)
  if (activeStageId === 'verification') {
    const allCriteria: { key: string; taskCode: string; featureSlug: string; criteria: string }[] = [];
    project.tasks.forEach((task) => {
      task.acceptanceCriteria.forEach((crit, idx) => {
        allCriteria.push({
          key: `${task.code}-${idx}`,
          taskCode: task.code,
          featureSlug: task.featureSlug,
          criteria: crit,
        });
      });
    });

    const totalCriteria = allCriteria.length;
    const checkedCriteria = allCriteria.filter((c) => project.verificationChecks[c.key]).length;
    const percent = totalCriteria > 0 ? Math.round((checkedCriteria / totalCriteria) * 100) : 0;

    return (
      <div className="flex h-full flex-col bg-slate-900 overflow-y-auto p-6">
        <div className="mb-6 flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded bg-emerald-500/20 text-emerald-400 text-xs">
                8
              </span>
              Verificação Consolidada
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Checklist consolidado a partir de todos os critérios de aceite de todas as tarefas.
            </p>
          </div>
        </div>

        {/* Progress summary banner */}
        <div className="mb-6 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-semibold text-slate-300">Critérios de Aceite Verificados</span>
            <span className="font-mono text-emerald-400 font-bold">
              {checkedCriteria} / {totalCriteria} ({percent}%)
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        {/* Criteria checklist */}
        <div className="space-y-2">
          {allCriteria.length === 0 ? (
            <div className="rounded-lg border border-slate-800 bg-slate-950 p-6 text-center text-xs text-slate-500">
              Nenhum critério de aceite encontrado. Gere as tarefas na Etapa 6 para popular este checklist.
            </div>
          ) : (
            allCriteria.map((item) => {
              const isChecked = Boolean(project.verificationChecks[item.key]);
              return (
                <div
                  key={item.key}
                  onClick={() => toggleVerificationCheck(item.key)}
                  className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition ${
                    isChecked
                      ? 'border-slate-800 bg-slate-950/40 opacity-75'
                      : 'border-slate-800 bg-slate-950/80 hover:border-slate-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleVerificationCheck(item.key)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0 cursor-pointer"
                  />
                  <div className="flex-1">
                    <p
                      className={`text-xs ${
                        isChecked ? 'line-through text-slate-500' : 'text-slate-200'
                      }`}
                    >
                      {item.criteria}
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-500">
                      <span className="font-mono font-semibold text-emerald-400/80">{item.taskCode}</span>
                      <span>• {item.featureSlug}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // RENDER: Stages 1 to 6 (Chat / Interview Mode)
  return (
    <div className="flex h-full flex-col bg-slate-900">
      {/* Chat Header */}
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/60 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>Arquiteto Gemini</span>
              <span className="font-normal text-slate-400">({stageInfo.title})</span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Modo Entrevista: uma pergunta por vez com sugestão padrão
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {chatHistory.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm('Limpar o histórico de chat desta etapa?')) {
                  clearStageChat(activeStageId);
                }
              }}
              title="Limpar conversa desta etapa"
              className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-rose-400 transition"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {chatHistory.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-slate-500 p-6">
            <Sparkles className="mb-2 h-8 w-8 text-indigo-400/70" />
            <p className="text-sm font-semibold text-slate-300">
              Inicie o planejamento da etapa {stageInfo.title}
            </p>
            <p className="mt-1 max-w-sm text-xs text-slate-500">
              Envie uma mensagem ou use um dos atalhos rápidos abaixo para que o Arquiteto IA comece a entrevista.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <button
                onClick={() => handleSendMessage(`Olá! Vamos planejar a etapa de ${stageInfo.title}. Como você sugere começar?`)}
                className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-600 hover:text-white transition"
              >
                🚀 Iniciar entrevista da etapa
              </button>
            </div>
          </div>
        ) : (
          chatHistory.map((msg) => {
            const isModel = msg.role === 'model';
            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isModel ? 'items-start' : 'items-start flex-row-reverse'}`}
              >
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${
                    isModel ? 'bg-indigo-600 text-white' : 'bg-emerald-600 text-white'
                  }`}
                >
                  {isModel ? <Bot className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                </div>

                <div className={`max-w-[85%] space-y-2`}>
                  <div
                    className={`rounded-xl p-3 text-xs leading-relaxed ${
                      isModel
                        ? 'border border-slate-800 bg-slate-950 text-slate-200'
                        : 'bg-emerald-600 text-white'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.text}</div>
                  </div>

                  {/* Suggested Answer Chip */}
                  {isModel && msg.suggestedAnswer && (
                    <button
                      onClick={() => handleSendMessage(msg.suggestedAnswer!)}
                      className="group flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-950/20 px-2.5 py-1.5 text-[11px] text-amber-300 hover:bg-amber-950/40 hover:border-amber-500/60 transition text-left"
                    >
                      <Sparkles className="h-3 w-3 text-amber-400 shrink-0" />
                      <span>
                        <strong className="font-semibold text-amber-200">Aceitar sugestão:</strong>{' '}
                        {msg.suggestedAnswer}
                      </span>
                    </button>
                  )}

                  {/* Ready to generate prompt banner */}
                  {isModel && msg.isReadyToGenerate && (
                    <div className="flex items-center justify-between rounded-lg border border-emerald-500/40 bg-emerald-950/30 p-2.5 text-xs text-emerald-300">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle className="h-4 w-4 text-emerald-400" />
                        <span>Pronto para compilar o documento desta etapa!</span>
                      </div>
                      <button
                        onClick={onTriggerGenerateDoc}
                        disabled={isGeneratingDoc}
                        className="rounded bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-500 transition disabled:opacity-50"
                      >
                        {isGeneratingDoc ? 'Gerando...' : '⚡ Gerar Agora'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {isSending && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white animate-pulse">
              <Bot className="h-3 w-3" />
            </div>
            <span>Arquiteto pensando e analisando requisitos...</span>
          </div>
        )}

        {adjustPending && (
          <div className="rounded-xl border border-indigo-500/40 bg-indigo-950/30 p-3 text-xs text-indigo-200">
            <div className="font-semibold mb-1 flex items-center gap-1.5 text-white">
              <Zap className="h-3.5 w-3.5 text-amber-400" />
              Ajuste pronto para ser aplicado ao documento
            </div>
            <p className="text-[11px] text-indigo-300/80 mb-2">
              O Gemini processou seu pedido de ajuste no documento atual. Deseja substituí-lo agora?
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={handleApplyAdjustment}
                className="rounded bg-indigo-600 px-3 py-1 font-semibold text-white hover:bg-indigo-500"
              >
                Aplicar Ajuste no Documento
              </button>
              <button
                onClick={() => setAdjustPending(null)}
                className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-slate-300 hover:bg-slate-700"
              >
                Descartar
              </button>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-slate-800 bg-slate-950 p-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex flex-col gap-2"
        >
          <div className="relative flex items-end rounded-lg border border-slate-700 bg-slate-900 focus-within:border-emerald-500">
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              rows={2}
              placeholder={`Converse com o Gemini sobre ${stageInfo.title}... (Enter para enviar)`}
              className="w-full resize-none bg-transparent p-2.5 text-xs text-white placeholder-slate-500 outline-none"
            />
            <button
              type="submit"
              disabled={isSending || !inputText.trim()}
              className="m-1.5 flex h-7 w-7 items-center justify-center rounded-md bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-30 disabled:hover:bg-emerald-600 transition"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>Shift + Enter para quebra de linha</span>
            <span className="font-mono text-[10px]">Gemini 3.8 Flash</span>
          </div>
        </form>
      </div>
    </div>
  );
};
