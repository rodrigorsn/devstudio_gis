import { ProjectData, StageId, STAGES_LIST } from '../types/spec';

export function createEmptyProject(projectName = 'Meu Novo App'): ProjectData {
  const stages: ProjectData['stages'] = {
    brainstorm: {
      id: 'brainstorm',
      status: 'in_progress', // first stage starts in progress
      chatHistory: [
        {
          id: 'msg-init',
          role: 'model',
          text: `Olá! Sou seu arquiteto de software para planejar o **${projectName}** usando Spec-Driven Development.\n\nPara começar o **Brainstorm**, me conte: **Qual é a ideia central do aplicativo, qual problema ele resolve e para quem ele é feito?**\n\n💡 *Sugestão recomendada: Um aplicativo desktop/web focado em produtividade para desenvolvedores solo gerenciarem tarefas e tempo.*`,
          timestamp: Date.now(),
          suggestedAnswer: 'Um aplicativo web focado em produtividade para desenvolvedores solo gerenciarem tarefas e tempo.',
        },
      ],
      documentContent: '',
    },
    prd: { id: 'prd', status: 'locked', chatHistory: [], documentContent: '' },
    architecture: { id: 'architecture', status: 'locked', chatHistory: [], documentContent: '' },
    features: { id: 'features', status: 'locked', chatHistory: [], documentContent: '' },
    screens: { id: 'screens', status: 'locked', chatHistory: [], documentContent: '' },
    tasks: { id: 'tasks', status: 'locked', chatHistory: [], documentContent: '' },
    implementation: { id: 'implementation', status: 'locked', chatHistory: [], documentContent: '' },
    verification: { id: 'verification', status: 'locked', chatHistory: [], documentContent: '' },
  };

  return {
    id: 'proj-' + Date.now(),
    name: projectName,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    stages,
    features: [],
    tasks: [],
    adrs: [],
    activeStageId: 'brainstorm',
    verificationChecks: {},
  };
}

export function createDemoProject(): ProjectData {
  const now = Date.now();

  const brainstormContent = `# Brainstorm — DevPulse

## 1. Visão Geral e Problema
- **O que é:** DevPulse é um cockpit local e minimalista para desenvolvedores solo monitorarem métricas de foco, tarefas em andamento e saúde de deploys.
- **Problema real:** Desenvolvedores independentes perdem horas alternando entre Jira, Trello, terminais e dashboards complexos de métricas, sofrendo com sobrecarga cognitiva.
- **Por que as soluções atuais falham:** Ferramentas corporativas são pesadas, cheias de burocracia para times grandes e exigem conexões constantes e logins corporativos.

## 2. Público-Alvo e Usuários
- **Perfil principal:** Desenvolvedores solo, indie hackers e freelancers de software.
- **Dores agudas:** Perda de clareza nas metas diárias, falta de visibilidade do progresso de tarefas atômicas e tempo gasto configurando dashboards.
- **Cenário de uso:** O dev abre o DevPulse no início do dia de trabalho, confere suas 3 prioridades e deixa o cronômetro de foco rodando em segundo plano.

## 3. Proposta de Valor e Diferenciais
- **100% Offline-First:** Dados salvos localmente sem necessidade de nuvem obrigatória.
- **Foco em Atomic Tasks:** Suporte nativo ao método Spec-Driven Development com tarefas de 30-90 minutos.
- **Interface Ultra Rápida:** Sem spinners de carregamento, consumo de memória ínfimo.

## 4. Escopo do MVP
- **Essencial (Dentro do Escopo):**
  - Cadastro rápido de tarefas e metas diárias
  - Cronômetro Pomodoro integrado vinculado à tarefa ativa
  - Visualização de progresso e estatísticas semanais
- **Fora do Escopo do MVP:**
  - Multi-usuário e colaboração em equipe
  - Integrações pagas com Jira ou Slack
  - Autenticação OAuth externa
`;

  const prdContent = `# Product Requirements Document (PRD) — DevPulse

## 1. Objetivos do Produto
- Prover um cockpit de planejamento diário e foco para desenvolvedores solo.
- Atingir 100% de operação offline com persistência confiável.
- Reduzir o tempo gasto em planejamento para menos de 5 minutos diários.

## 2. Personas
- **Lucas, Indie Hacker:** Constrói micro-SaaS sozinho. Precisa saber exatamente qual a próxima tarefa sem se perder em requisitos abstratos.
- **Camila, Engenheira Freelancer:** Trabalha em múltiplos contratos e precisa registrar blocos de foco dedicados a cada entrega.

## 3. Requisitos Funcionais (RF)
- **RF-01: Gestão de Tarefas Atômicas** — O sistema deve permitir criar, editar, reordenar e marcar tarefas com título, estimativa em minutos e tags.
- **RF-02: Timer de Foco Integrado** — O usuário deve poder iniciar um timer Pomodoro (25min/50min) diretamente atrelado a uma tarefa selecionada.
- **RF-03: Dashboard de Métricas Semanais** — O sistema deve exibir total de horas focadas, taxa de conclusão de tarefas e distribuição por tags.
- **RF-04: Exportação e Backup JSON** — O sistema deve permitir exportar e importar todos os dados do usuário em arquivo JSON local.
- **RF-05: Atalhos de Teclado Globais** — Permitir navegar e criar tarefas rapidamente usando atalhos (ex: '/' para buscar, 'n' para nova tarefa).

## 4. Requisitos Não Funcionais (RNF)
- **RNF-01: Desempenho** — Tempo de inicialização e resposta de ações abaixo de 100ms.
- **RNF-02: Privacidade** — Nenhum dado pessoal ou de tarefas é enviado para servidores externos.
- **RNF-03: Usabilidade** — Design limpo em tema escuro e claro, acessível via teclado.

## 5. Métricas de Sucesso
- 90% dos usuários ativos concluindo pelo menos 3 tarefas por dia útil.
- Zero perda de dados relatada em sessões locais.

## 6. Fora de Escopo
- Sincronização em nuvem multi-dispositivo no MVP.
- Login social ou cobrança de assinaturas.
`;

  const architectureContent = `# Arquitetura de Software — DevPulse

## 1. Stack Tecnológica
- **Frontend:** React 19 + TypeScript + Vite para compilação instantânea.
- **Estilização:** Tailwind CSS v4 com paleta escura de alto contraste.
- **Persistência:** IndexedDB / LocalStorage com fallback de exportação JSON.
- **Visualização de Dados:** SVG leve e nativo para gráficos de progresso.

## 2. Estrutura de Pastas do Projeto
\`\`\`
src/
├── components/      # Componentes UI reutilizáveis (Timer, TaskList, StatsCard)
├── context/         # Estado global (TaskContext, FocusContext)
├── hooks/           # Custom hooks (useTimer, useKeyboardShortcuts)
├── storage/         # Camada de persistência local desacoplada
├── types/           # Interfaces TypeScript estritas
└── utils/           # Formatadores de tempo e cálculos de métricas
\`\`\`

## 3. Modelo de Dados
\`\`\`mermaid
erDiagram
  TASK ||--o{ FOCUS_SESSION : tracks
  TAG ||--o{ TASK_TAG : labels
  TASK ||--o{ TASK_TAG : categorized_by

  TASK {
    string id PK
    string title
    string status
    int estimatedMinutes
    datetime createdAt
  }

  FOCUS_SESSION {
    string id PK
    string taskId FK
    int durationMinutes
    datetime startedAt
    boolean completed
  }

  TAG {
    string id PK
    string name
    string color
  }
\`\`\`

## 4. Decisões Arquiteturais (ADRs Resumidas)
- **ADR-0001:** Arquitetura Local-First sem servidor remoto para privacidade e velocidade máxima.
- **ADR-0002:** Zustand ou React Context nativo para gerenciamento de estado previsível.
`;

  const adrs = [
    {
      id: '0001',
      number: '0001',
      title: 'Arquitetura Local-First com Armazenamento no Navegador',
      filename: '0001-local-first.md',
      content: `# ADR 0001: Arquitetura Local-First com Armazenamento no Navegador
## Status
Aceito
## Contexto
O público-alvo são desenvolvedores solo que valorizam velocidade, privacidade e a possibilidade de trabalhar em locais com conexão instável ou offline. Soluções com backend remoto aumentam os custos de infraestrutura e adicionam latência de rede desnecessária para o MVP.
## Decisão
Adotamos uma abordagem 100% Local-First. Todos os dados residem localmente na máquina do usuário via IndexedDB e LocalStorage, com suporte a importação e exportação de backups JSON manuais.
## Consequências
- **Vantagens:** Latência zero, custo zero de servidores para o usuário, privacidade garantida, funciona sem internet.
- **Desvantagens:** O usuário deve fazer backup manual se desejar transferir seus dados para outro dispositivo.`,
    },
    {
      id: '0002',
      number: '0002',
      title: 'Uso de Tailwind CSS para Produtividade e Consistência',
      filename: '0002-tailwind-css.md',
      content: `# ADR 0002: Uso de Tailwind CSS para Produtividade e Consistência
## Status
Aceito
## Contexto
Necessidade de construir uma interface elegante, com tema escuro imersivo, acessível e sem overhead de manutenção de arquivos CSS separados.
## Decisão
Utilizar Tailwind CSS v4 para estilização declarativa e design tokens padronizados.
## Consequências
- **Vantagens:** Agilidade no desenvolvimento de componentes, design responsivo nativo, tipografia e espaçamentos coesos.
- **Desvantagens:** Classes longas no JSX, mitigadas por componentes reutilizáveis.`,
    },
  ];

  const features = [
    {
      id: 'feat-1',
      slug: '001-gestao-tarefas',
      title: 'Gestão de Tarefas Atômicas',
      description: 'Criação, listagem e conclusão de tarefas com estimativa de tempo e prioridade.',
      prdRefs: ['RF-01', 'RNF-01'],
      specMarkdown: `# Spec: Gestão de Tarefas Atômicas
**Slug:** 001-gestao-tarefas | **Refs PRD:** RF-01, RNF-01

## 1. Visão Geral e Regras de Negócio
- **RN-01:** Cada tarefa deve ter título obrigatório (mínimo 3 caracteres), status ('pendente', 'em_foco', 'concluida') e estimativa em minutos.
- **RN-02:** Tarefas concluídas descem automaticamente para o final da lista, mantendo ordenação temporal.
- **RN-03:** É possível filtrar tarefas por status e pesquisar por texto em tempo real.

## 2. Fluxo Principal
\`\`\`mermaid
flowchart TD
  A[Usuário abre a lista] --> B[Digita título no input rápido]
  B --> C{Pressiona Enter?}
  C -->|Sim| D[Valida se tem mais de 3 chars]
  D -->|Válido| E[Cria tarefa com status Pendente]
  E --> F[Atualiza lista e foca input]
  D -->|Inválido| G[Exibe mensagem de aviso sutil]
\`\`\`

## 3. Fluxos Alternativos e Exceções
- **Edição em linha:** Clicar duas vezes no título da tarefa transforma o texto em campo editável; Esc cancela e Enter salva.
- **Exclusão:** Pressionar botão de lixeira remove a tarefa com opção de "Desfazer" nos próximos 5 segundos.

## 4. Casos de Borda (Edge Cases)
- Títulos muito longos devem truncar com reticências no card e exibir tooltip completo ao passar o mouse.
- Caracteres especiais e emojis são aceitos e sanitizados.

## 5. Requisitos do PRD Atendidos
- Atende plenamente o RF-01 e RNF-01.
`,
      screensMarkdown: `# Telas: Gestão de Tarefas Atômicas
**Feature:** 001-gestao-tarefas

## 1. Telas e Componentes
- **Barra Superior de Ação:** Campo de criação rápida com placeholder "Nova tarefa rápida... (pressione Enter)".
- **Card de Tarefa:** Checkbox circular, título em negrito, badge de tempo estimado (ex: "25 min"), botão de ação rápida "Focar".
- **Filtros Rápidos:** Botões estilo tab: Todas, Pendentes, Concluídas.

## 2. Tabela de Interações
| Elemento / Ação do Usuário | Resultado Esperado | Validação / Feedback |
| --- | --- | --- |
| Clicar no checkbox da tarefa | Alterna estado entre concluída e pendente | Efeito visual de riscado e som sutil opcional |
| Clicar no botão "Focar" | Seleciona a tarefa como ativa e abre o Pomodoro | Destaca borda do card em âmbar |
| Pressionar tecla 'N' | Coloca foco imediato no input de nova tarefa | Cursor pronto para digitação |

## 3. Estados de Interface
- **Vazio:** Ilustração de prancheta com texto "Nenhuma tarefa cadastrada. Adicione sua primeira meta de hoje!".
- **Carregando:** Skeleton shimmer sutil de 3 cards.
`,
      wireframeHtml: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: ui-sans-serif, system-ui, sans-serif; }
  body { background: #f8fafc; color: #1e293b; padding: 24px; }
  .container { max-width: 640px; margin: 0 auto; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
  .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 16px; }
  .title { font-size: 18px; font-weight: 700; color: #334155; }
  .tabs { display: flex; gap: 8px; margin-bottom: 16px; }
  .tab-btn { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 6px 12px; border-radius: 4px; font-size: 13px; font-weight: 500; cursor: pointer; }
  .tab-btn.active { background: #334155; color: #ffffff; border-color: #334155; }
  .input-group { display: flex; gap: 8px; margin-bottom: 16px; }
  .input-text { flex: 1; border: 1px solid #94a3b8; padding: 8px 12px; border-radius: 4px; font-size: 14px; outline: none; }
  .btn-add { background: #475569; color: white; border: none; padding: 8px 16px; border-radius: 4px; font-size: 14px; cursor: pointer; }
  .task-list { display: flex; flex-direction: column; gap: 8px; }
  .task-item { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 6px; background: #ffffff; }
  .task-left { display: flex; align-items: center; gap: 10px; }
  .checkbox { width: 18px; height: 18px; border: 2px solid #94a3b8; border-radius: 4px; cursor: pointer; }
  .task-title { font-size: 14px; font-weight: 500; }
  .badge { background: #e2e8f0; color: #475569; padding: 2px 8px; border-radius: 4px; font-size: 11px; }
  .btn-focus { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 4px 8px; border-radius: 4px; font-size: 12px; cursor: pointer; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <div class="title">Tarefas Atômicas</div>
    <div style="font-size: 12px; color: #64748b;">3 pendentes / 1 concluída</div>
  </div>
  <div class="tabs">
    <button class="tab-btn active">Todas (4)</button>
    <button class="tab-btn">Pendentes (3)</button>
    <button class="tab-btn">Concluídas (1)</button>
  </div>
  <div class="input-group">
    <input class="input-text" placeholder="Adicionar nova tarefa atômica... [Enter]" />
    <button class="btn-add">+ Adicionar</button>
  </div>
  <div class="task-list">
    <div class="task-item">
      <div class="task-left">
        <input type="checkbox" class="checkbox">
        <span class="task-title">Estruturar schema de dados com Drizzle</span>
      </div>
      <div style="display:flex; gap:8px; align-items:center;">
        <span class="badge">45 min</span>
        <button class="btn-focus">⚡ Focar</button>
      </div>
    </div>
    <div class="task-item">
      <div class="task-left">
        <input type="checkbox" class="checkbox">
        <span class="task-title">Criar hook personalizado usePomodoro</span>
      </div>
      <div style="display:flex; gap:8px; align-items:center;">
        <span class="badge">30 min</span>
        <button class="btn-focus">⚡ Focar</button>
      </div>
    </div>
    <div class="task-item">
      <div class="task-left">
        <input type="checkbox" class="checkbox" checked>
        <span class="task-title" style="text-decoration: line-through; color: #94a3b8;">Configurar Vite e Tailwind v4</span>
      </div>
      <div style="display:flex; gap:8px; align-items:center;">
        <span class="badge">Feito</span>
      </div>
    </div>
  </div>
</div>
</body>
</html>`,
    },
    {
      id: 'feat-2',
      slug: '002-timer-foco',
      title: 'Timer de Foco Pomodoro',
      description: 'Cronômetro com ciclos de foco e pausa atrelados à tarefa em andamento.',
      prdRefs: ['RF-02', 'RNF-01'],
      specMarkdown: `# Spec: Timer de Foco Pomodoro
**Slug:** 002-timer-foco | **Refs PRD:** RF-02, RNF-01

## 1. Visão Geral e Regras de Negócio
- **RN-01:** O timer opera em ciclos: Foco (25 min ou 50 min), Pausa Curta (5 min) e Pausa Longa (15 min).
- **RN-02:** Ao concluir um ciclo de foco com sucesso, os minutos são contabilizados na tarefa selecionada.
- **RN-03:** Se o timer for pausado por mais de 10 minutos, o sistema pergunta se a sessão foi interrompida.

## 2. Fluxo Principal
\`\`\`mermaid
flowchart TD
  A[Usuário clica em Iniciar Foco] --> B[Timer começa contagem regressiva]
  B --> C{Tempo chegou a zero?}
  C -->|Não| D[Atualiza display e título da aba]
  C -->|Sim| E[Dispara aviso sonoro discreto]
  E --> F[Registra FocusSession concluída]
  F --> G[Oferece iniciar Pausa Curta]
\`\`\`

## 3. Fluxos Alternativos e Exceções
- O usuário pode reiniciar ou adiantar o ciclo a qualquer momento.

## 4. Casos de Borda (Edge Cases)
- Aba em segundo plano: o timer utiliza Web Worker ou cálculo baseado em \`performance.now()\` para evitar congelamento por throttling do navegador.

## 5. Requisitos do PRD Atendidos
- Atende ao RF-02.
`,
      screensMarkdown: `# Telas: Timer de Foco Pomodoro
**Feature:** 002-timer-foco

## 1. Telas e Componentes
- **Display Circular:** Mostrador de tempo grande (ex: "24:58") com barra de progresso circular SVG.
- **Controles de Reprodução:** Botões Iniciar, Pausar e Resetar.
- **Indicador de Tarefa Ativa:** Mostra qual tarefa está acumulando os minutos de foco.

## 2. Tabela de Interações
| Ação | Resultado Esperado | Validação |
| --- | --- | --- |
| Clicar em "Iniciar" | Inicia decremento a cada 1 segundo | Ícone muda para Pause |
| Clicar em "Pausar" | Congela o cronômetro | Estado salvo |

## 3. Estados de Interface
- **Parado:** Mostra tempo padrão 25:00.
- **Em Execução:** Animação de pulso suave.
`,
      wireframeHtml: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: ui-sans-serif, system-ui, sans-serif; }
  body { background: #f8fafc; color: #1e293b; padding: 24px; text-align: center; }
  .timer-card { max-width: 480px; margin: 0 auto; background: white; border: 1px solid #cbd5e1; border-radius: 12px; padding: 32px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
  .badge-tag { display: inline-block; background: #e2e8f0; color: #475569; padding: 4px 12px; border-radius: 16px; font-size: 12px; font-weight: 600; margin-bottom: 16px; }
  .task-active { font-size: 15px; color: #64748b; margin-bottom: 24px; }
  .clock-display { font-size: 64px; font-weight: 800; font-variant-numeric: tabular-nums; color: #0f172a; margin-bottom: 24px; letter-spacing: -1px; }
  .controls { display: flex; justify-content: center; gap: 12px; }
  .btn-primary { background: #0f172a; color: white; border: none; padding: 12px 28px; border-radius: 6px; font-size: 15px; font-weight: 600; cursor: pointer; }
  .btn-secondary { background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; padding: 12px 20px; border-radius: 6px; font-size: 15px; cursor: pointer; }
</style>
</head>
<body>
<div class="timer-card">
  <div class="badge-tag">CICLO DE FOCO #1</div>
  <div class="task-active">Tarefa ativa: <strong>Estruturar schema de dados com Drizzle</strong></div>
  <div class="clock-display">24:59</div>
  <div class="controls">
    <button class="btn-primary">▶ Iniciar Foco</button>
    <button class="btn-secondary">↺ Resetar</button>
  </div>
</div>
</body>
</html>`,
    },
  ];

  const tasks = [
    {
      id: 'task-1',
      code: 'T001',
      featureSlug: '001-gestao-tarefas',
      title: 'Criar tipos e camada de armazenamento de tarefas',
      objective: 'Definir interfaces TypeScript e funções de leitura/escrita no localStorage com validação de esquema.',
      files: ['src/types/task.ts', 'src/storage/taskStorage.ts'],
      refs: ['RF-01', 'ADR-0001'],
      actions: [
        { action: 'Criar interface Task', expectedResult: 'Exportar tipos estritos com id, title, status, estimatedMinutes' },
        { action: 'Implementar saveTasks e loadTasks', expectedResult: 'Serializar e desserializar com fallback em array vazio' },
      ],
      acceptanceCriteria: [
        'Tipos TypeScript sem uso de any',
        'loadTasks retorna array consistente mesmo se localStorage estiver corrompido',
        'saveTasks persiste alterações com timestamp atualizado',
      ],
      howToVerify: 'Executar npm test ou rodar teste unitário que grava 2 tarefas e recupera o array íntegro.',
      outOfScope: 'Não criar componentes visuais ou UI nesta tarefa.',
      markdown: `# T001 — Criar tipos e camada de armazenamento de tarefas
**Feature:** 001-gestao-tarefas | **Refs:** RF-01, ADR-0001

## Objetivo
Definir interfaces TypeScript e funções de leitura/escrita no localStorage com validação de esquema.

## Arquivos que pode criar/alterar
- src/types/task.ts
- src/storage/taskStorage.ts

## Ação → Resultado esperado
| Ação | Resultado esperado |
| --- | --- |
| Criar interface Task | Exportar tipos estritos com id, title, status, estimatedMinutes |
| Implementar saveTasks e loadTasks | Serializar e desserializar com fallback em array vazio |

## Critérios de aceite
- [ ] Tipos TypeScript sem uso de any
- [ ] loadTasks retorna array consistente mesmo se localStorage estiver corrompido
- [ ] saveTasks persiste alterações com timestamp atualizado

## Como verificar
Executar npm test ou rodar teste unitário que grava 2 tarefas e recupera o array íntegro.

## Fora de escopo
Não criar componentes visuais ou UI nesta tarefa.
`,
      completed: true,
    },
    {
      id: 'task-2',
      code: 'T002',
      featureSlug: '001-gestao-tarefas',
      title: 'Construir componente TaskList e formulário de adição rápida',
      objective: 'Implementar a interface visual da lista de tarefas com atalho Enter para criação rápida.',
      files: ['src/components/TaskList.tsx', 'src/components/TaskItem.tsx'],
      refs: ['RF-01', 'RF-05'],
      actions: [
        { action: 'Criar input com onKeyDown', expectedResult: 'Ao teclar Enter com texto válido, adiciona tarefa na lista' },
        { action: 'Renderizar lista com checkboxes', expectedResult: 'Clicar no checkbox alterna entre pendente e concluído' },
      ],
      acceptanceCriteria: [
        'Input limpa automaticamente após submissão bem-sucedida',
        'Tarefas concluídas mostram estilo tachado sutil',
        'Contador de tarefas pendentes atualiza em tempo real',
      ],
      howToVerify: 'Abrir a tela no navegador, digitar uma tarefa, dar Enter e marcar o checkbox para conferir o estado.',
      outOfScope: 'Não integrar timer Pomodoro nesta etapa.',
      markdown: `# T002 — Construir componente TaskList e formulário de adição rápida
**Feature:** 001-gestao-tarefas | **Refs:** RF-01, RF-05

## Objetivo
Implementar a interface visual da lista de tarefas com atalho Enter para criação rápida.

## Arquivos que pode criar/alterar
- src/components/TaskList.tsx
- src/components/TaskItem.tsx

## Ação → Resultado esperado
| Ação | Resultado esperado |
| --- | --- |
| Criar input com onKeyDown | Ao teclar Enter com texto válido, adiciona tarefa na lista |
| Renderizar lista com checkboxes | Clicar no checkbox alterna entre pendente e concluído |

## Critérios de aceite
- [ ] Input limpa automaticamente após submissão bem-sucedida
- [ ] Tarefas concluídas mostram estilo tachado sutil
- [ ] Contador de tarefas pendentes atualiza em tempo real

## Como verificar
Abrir a tela no navegador, digitar uma tarefa, dar Enter e marcar o checkbox para conferir o estado.

## Fora de escopo
Não integrar timer Pomodoro nesta etapa.
`,
      completed: true,
    },
    {
      id: 'task-3',
      code: 'T003',
      featureSlug: '002-timer-foco',
      title: 'Desenvolver hook usePomodoro e display do cronômetro',
      objective: 'Criar a lógica de contagem regressiva de foco com cálculo de performance.now() e controles de play/pause.',
      files: ['src/hooks/usePomodoro.ts', 'src/components/PomodoroTimer.tsx'],
      refs: ['RF-02'],
      actions: [
        { action: 'Implementar usePomodoro', expectedResult: 'Retorna timeLeft, isRunning, start, pause, reset' },
        { action: 'Montar display SVG circular', expectedResult: 'Progresso gráfico acompanha os minutos restantes' },
      ],
      acceptanceCriteria: [
        'O timer não perde precisão quando a aba fica inativa',
        'Transição automática para intervalo de descanso ao zerar',
        'Tempo formatado como MM:SS com zeros à esquerda',
      ],
      howToVerify: 'Configurar tempo de teste para 5 segundos, iniciar o cronômetro e verificar se aciona o término corretamente.',
      outOfScope: 'Não gravar no banco nesta tarefa.',
      markdown: `# T003 — Desenvolver hook usePomodoro e display do cronômetro
**Feature:** 002-timer-foco | **Refs:** RF-02

## Objetivo
Criar a lógica de contagem regressiva de foco com cálculo de performance.now() e controles de play/pause.

## Arquivos que pode criar/alterar
- src/hooks/usePomodoro.ts
- src/components/PomodoroTimer.tsx

## Ação → Resultado esperado
| Ação | Resultado esperado |
| --- | --- |
| Implementar usePomodoro | Retorna timeLeft, isRunning, start, pause, reset |
| Montar display SVG circular | Progresso gráfico acompanha os minutos restantes |

## Critérios de aceite
- [ ] O timer não perde precisão quando a aba fica inativa
- [ ] Transição automática para intervalo de descanso ao zerar
- [ ] Tempo formatado como MM:SS com zeros à esquerda

## Como verificar
Configurar tempo de teste para 5 segundos, iniciar o cronômetro e verificar se aciona o término corretamente.

## Fora de escopo
Não gravar no banco nesta tarefa.
`,
      completed: false,
    },
    {
      id: 'task-4',
      code: 'T004',
      featureSlug: '002-timer-foco',
      title: 'Vincular timer de foco com a tarefa selecionada',
      objective: 'Registrar histórico de tempo dedicado a cada tarefa individual ao finalizar uma sessão de foco.',
      files: ['src/context/FocusContext.tsx', 'src/components/TaskFocusBadge.tsx'],
      refs: ['RF-02', 'RF-03'],
      actions: [
        { action: 'Ao concluir ciclo de foco', expectedResult: 'Acrescentar 25 minutos ao tempo total da tarefa selecionada' },
      ],
      acceptanceCriteria: [
        'Card de tarefa exibe badge com minutos totais focados acumulados',
        'Se nenhuma tarefa estiver selecionada, timer permite foco livre',
      ],
      howToVerify: 'Concluir um ciclo simulado de foco e verificar se o card da tarefa exibiu o novo tempo acumulado.',
      outOfScope: 'Gráficos analíticos semanais.',
      markdown: `# T004 — Vincular timer de foco com a tarefa selecionada
**Feature:** 002-timer-foco | **Refs:** RF-02, RF-03

## Objetivo
Registrar histórico de tempo dedicado a cada tarefa individual ao finalizar uma sessão de foco.

## Arquivos que pode criar/alterar
- src/context/FocusContext.tsx
- src/components/TaskFocusBadge.tsx

## Ação → Resultado esperado
| Ação | Resultado esperado |
| --- | --- |
| Ao concluir ciclo de foco | Acrescentar 25 minutos ao tempo total da tarefa selecionada |

## Critérios de aceite
- [ ] Card de tarefa exibe badge com minutos totais focados acumulados
- [ ] Se nenhuma tarefa estiver selecionada, timer permite foco livre

## Como verificar
Concluir um ciclo simulado de foco e verificar se o card da tarefa exibiu o novo tempo acumulado.

## Fora de escopo
Gráficos analíticos semanais.
`,
      completed: false,
    },
  ];

  const stages: ProjectData['stages'] = {
    brainstorm: {
      id: 'brainstorm',
      status: 'completed',
      chatHistory: [
        {
          id: 'b-1',
          role: 'user',
          text: 'Quero criar o DevPulse: um cockpit minimalista para desenvolvedores solo gerenciarem foco e tarefas atômicas sem distrações.',
          timestamp: now - 3600000,
        },
        {
          id: 'b-2',
          role: 'model',
          text: 'Excelente ideia! Uma ferramenta focada em devs solo é muito bem-vinda no ecossistema atual.\n\nQual é o principal problema que o DevPulse resolve e o que ficará de fora do MVP?\n\n💡 Sugestão recomendada: Resolve a dispersão diária e sobrecarga de apps corporativos pesados; fora do escopo ficam integrações com Jira e login na nuvem.',
          timestamp: now - 3500000,
          suggestedAnswer: 'Resolve a dispersão diária e sobrecarga de apps corporativos pesados; fora do escopo ficam integrações com Jira e login na nuvem.',
        },
        {
          id: 'b-3',
          role: 'user',
          text: 'Concordo plenamente com a sugestão recomendada.',
          timestamp: now - 3400000,
        },
        {
          id: 'b-4',
          role: 'model',
          text: 'Perfeito. Temos o posicionamento, público e escopo claros. Pronto para gerar o documento.',
          timestamp: now - 3300000,
          isReadyToGenerate: true,
        },
      ],
      documentContent: brainstormContent,
      approvedAt: now - 3200000,
    },
    prd: {
      id: 'prd',
      status: 'completed',
      chatHistory: [
        {
          id: 'p-1',
          role: 'model',
          text: 'Iniciando o PRD com base no Brainstorm. Vamos definir os Requisitos Funcionais essenciais (RFs). Deseja incluir gestão de tarefas, Pomodoro integrado e dashboard semanal?\n\n💡 Sugestão recomendada: Sim, adicionar RF-01 (Tarefas), RF-02 (Pomodoro) e RF-03 (Métricas).',
          timestamp: now - 3100000,
          suggestedAnswer: 'Sim, adicionar RF-01 (Tarefas), RF-02 (Pomodoro) e RF-03 (Métricas).',
        },
        {
          id: 'p-2',
          role: 'user',
          text: 'Sim, e adicione também exportação de backup em JSON como RF-04.',
          timestamp: now - 3000000,
        },
        {
          id: 'p-3',
          role: 'model',
          text: 'Incluído! Já temos objetivos, personas, 5 RFs numerados e 3 RNFs. Pronto para gerar o documento.',
          timestamp: now - 2900000,
          isReadyToGenerate: true,
        },
      ],
      documentContent: prdContent,
      approvedAt: now - 2800000,
    },
    architecture: {
      id: 'architecture',
      status: 'completed',
      chatHistory: [
        {
          id: 'a-1',
          role: 'model',
          text: 'Para a arquitetura do DevPulse, qual stack você prefere para garantir velocidade e zero configuração de backend?\n\n💡 Sugestão recomendada: React 19 + TypeScript + Vite com persistência Local-First e ADRs documentadas.',
          timestamp: now - 2700000,
          suggestedAnswer: 'React 19 + TypeScript + Vite com persistência Local-First e ADRs documentadas.',
        },
        {
          id: 'a-2',
          role: 'user',
          text: 'Perfeito, vamos usar essa stack e modelar as entidades Task e FocusSession com Mermaid.',
          timestamp: now - 2600000,
        },
        {
          id: 'a-3',
          role: 'model',
          text: 'Estrutura definida e diagrama ERD preparado. Pronto para gerar o documento.',
          timestamp: now - 2500000,
          isReadyToGenerate: true,
        },
      ],
      documentContent: architectureContent,
      approvedAt: now - 2400000,
    },
    features: {
      id: 'features',
      status: 'completed',
      chatHistory: [
        {
          id: 'f-1',
          role: 'model',
          text: 'Com base no PRD aprovado, propus as features principais: 001-gestao-tarefas e 002-timer-foco com regras de negócio e fluxogramas Mermaid. Pronto para gerar o documento.',
          timestamp: now - 2300000,
          isReadyToGenerate: true,
        },
      ],
      documentContent: features[0].specMarkdown,
      approvedAt: now - 2200000,
    },
    screens: {
      id: 'screens',
      status: 'completed',
      chatHistory: [
        {
          id: 's-1',
          role: 'model',
          text: 'As telas e tabelas de interação de cada feature foram geradas, incluindo wireframes em HTML/CSS cinza sandbox. Pronto para gerar o documento.',
          timestamp: now - 2100000,
          isReadyToGenerate: true,
        },
      ],
      documentContent: features[0].screensMarkdown,
      approvedAt: now - 2000000,
    },
    tasks: {
      id: 'tasks',
      status: 'completed',
      chatHistory: [
        {
          id: 't-1',
          role: 'model',
          text: 'Todas as features foram decompostas em tarefas atômicas T001 a T004 seguindo estritamente o template de SDD. Pronto para gerar o documento.',
          timestamp: now - 1900000,
          isReadyToGenerate: true,
        },
      ],
      documentContent: tasks[0].markdown,
      approvedAt: now - 1800000,
    },
    implementation: {
      id: 'implementation',
      status: 'in_progress',
      chatHistory: [],
      documentContent: '',
    },
    verification: {
      id: 'verification',
      status: 'pending',
      chatHistory: [],
      documentContent: '',
    },
  };

  const verificationChecks: Record<string, boolean> = {
    'T001-0': true,
    'T001-1': true,
    'T001-2': true,
    'T002-0': true,
    'T002-1': true,
    'T002-2': false,
  };

  return {
    id: 'proj-demo-devpulse',
    name: 'DevPulse (Demo)',
    summary: 'Cockpit minimalista e offline-first para desenvolvedores solo.',
    createdAt: now - 3600000,
    updatedAt: now,
    stages,
    features,
    tasks,
    adrs,
    activeStageId: 'implementation',
    selectedFeatureId: 'feat-1',
    selectedTaskId: 'task-1',
    verificationChecks,
  };
}

export function generateStatusMd(project: ProjectData): string {
  const currentStage = STAGES_LIST.find((s) => s.id === project.activeStageId)?.title || '6. Tarefas';
  const completedCount = project.tasks.filter((t) => t.completed).length;
  const totalCount = project.tasks.length;

  const taskLines = project.tasks
    .map((t) => `- [${t.completed ? 'x' : ' '}] ${t.code} — ${t.title} (${t.featureSlug})`)
    .join('\n');

  return `# STATUS DO PROJETO: ${project.name}
**Última atualização:** ${new Date().toISOString()}
**Etapa atual do fluxo:** ${currentStage}
**Progresso das Tarefas:** ${completedCount}/${totalCount} concluídas (${totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%)

## Lista de Tarefas
${taskLines || 'Nenhuma tarefa cadastrada ainda.'}
`;
}

export function parseStatusMd(content: string): { completedCodes: Set<string>; pendingCodes: Set<string> } {
  const completedCodes = new Set<string>();
  const pendingCodes = new Set<string>();

  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    // Format: - [x] T001 ... or - [ ] T001 ...
    const matchCompleted = trimmed.match(/^-\s*\[([xX])\]\s*(T\d{3})/i);
    const matchPending = trimmed.match(/^-\s*\[\s*\]\s*(T\d{3})/i);

    if (matchCompleted && matchCompleted[2]) {
      completedCodes.add(matchCompleted[2].toUpperCase());
    } else if (matchPending && matchPending[2]) {
      pendingCodes.add(matchPending[2].toUpperCase());
    }
  }

  return { completedCodes, pendingCodes };
}

export function generateAgentsMd(project: ProjectData): string {
  return `# AGENTS.md — Constituição do Projeto: ${project.name}

> Este documento é a fonte única da verdade para todos os agentes autônomos de código (Claude Code, Cursor, Codex, Antigravity) que trabalham neste repositório. Siga rigorosamente as instruções abaixo.

## 1. Resumo do Produto
${project.summary || 'Aplicação desenvolvida seguindo o método Spec-Driven Development (SDD).'}
Documentos detalhados disponíveis na pasta \`docs/\`.

## 2. Stack Tecnológica
- **Linguagem:** TypeScript (estrito, sem \`any\`)
- **Frameworks:** Conforme definido em \`docs/02-arquitetura.md\`
- **Design & UI:** Tailwind CSS, sem CSS avulso

## 3. Estrutura de Pastas e Invariantes
- As especificações oficiais de cada feature residem em \`docs/specs/NNN-nome/spec.md\`.
- As especificações atômicas de tarefas residem em \`docs/tasks/NNN-nome/T00X.md\`.
- Cada tarefa deve ser executada de forma atômica e independente.

## 4. Regras de Código e Invariantes
- **Não adicione dependências não solicitadas.**
- **Não altere arquivos fora da lista permitida** na seção "Arquivos que pode criar/alterar" de cada tarefa.
- **Não quebre testes existentes.**
- Todos os componentes devem respeitar o design do sistema.

## 5. Comandos do Projeto
\`\`\`bash
# Instalar dependências
npm install

# Rodar em modo de desenvolvimento
npm run dev

# Executar verificações e testes
npm run lint
npm run build
\`\`\`

## 6. Fluxo de Trabalho Obrigatório do Agente
1. **Leia \`STATUS.md\`** para identificar a próxima tarefa com checkbox pendente \`- [ ]\`.
2. **Abra o arquivo da tarefa** em \`docs/tasks/.../T00X.md\` e leia todas as restrições e critérios de aceite.
3. **Execute a tarefa** alterando estritamente os arquivos autorizados.
4. **Rode a verificação** indicada na seção "Como verificar" do documento da tarefa.
5. **Marque a tarefa em \`STATUS.md\`** alterando a linha para \`- [x] T00X\`.
6. **PARE e aguarde a revisão humana** antes de iniciar a próxima tarefa. Nunca execute múltiplas tarefas em lote sem autorização explícita.
`;
}

export function generateClaudeMd(): string {
  return `@AGENTS.md
Você deve seguir rigorosamente as regras, invariantes e o fluxo de trabalho descritos no arquivo AGENTS.md.
Nunca execute tarefas fora de ordem e sempre respeite a lista de arquivos autorizados da tarefa em STATUS.md.
`;
}

export function generateCursorMdc(): string {
  return `---
description: Constituição e regras de desenvolvimento do projeto
globs: *
alwaysApply: true
---

Siga estritamente todas as diretrizes, restrições e o fluxo de trabalho atômico definidos em AGENTS.md.
Antes de fazer qualquer alteração, consulte STATUS.md e o arquivo correspondente em docs/tasks/ para a tarefa em andamento.
`;
}
