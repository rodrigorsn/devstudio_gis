import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const MODEL_NAME = 'gemini-3.8-flash';

// Helper to format approved docs context
function formatApprovedDocs(contextDocs: Record<string, string> = {}): string {
  const entries = Object.entries(contextDocs).filter(([_, content]) => Boolean(content?.trim()));
  if (entries.length === 0) return 'Nenhum documento anterior aprovado ainda.';
  return entries
    .map(([docName, content]) => `=== DOCUMENTO APROVADO: ${docName} ===\n${content}\n===========================`)
    .join('\n\n');
}

// 1. Chat endpoint (Interview & Discussion)
app.post('/api/chat', async (req, res) => {
  try {
    const { stageId, stageTitle, messages, contextDocs, currentDocContent } = req.body;

    const approvedContext = formatApprovedDocs(contextDocs);

    const systemInstruction = `Você é um arquiteto de software sênior ajudando um desenvolvedor solo a planejar um app de forma pragmática, moderna e de alta qualidade (Spec-Driven Development).
Você está na etapa: "${stageTitle}" (id: ${stageId}).

CONTEXTO DE DOCUMENTOS ANTERIORES APROVADOS:
${approvedContext}

${currentDocContent ? `CONTEÚDO ATUAL DO DOCUMENTO DESTA ETAPA:\n${currentDocContent}\n` : ''}

DIRETRIZES FUNDAMENTAIS:
1. Primeiro modo: ENTREVISTA. Faça UMA pergunta por vez, extremamente objetiva, relevante para o sucesso do projeto e para preencher o documento da etapa "${stageTitle}".
2. Sempre sugira uma resposta padrão sólida e prática que o desenvolvedor solo possa aceitar diretamente (ex: "💡 Sugestão recomendada: ...").
3. Mantenha um tom profissional, encorajador, técnico e conciso. Fale em português do Brasil.
4. Quando tiver informação suficiente reunida durante o diálogo para gerar um documento robusto e completo, encerre sua fala com a frase exata: "Pronto para gerar o documento." seguida de um resumo em 2-3 tópicos do que será gerado.
5. Se o usuário pedir para gerar ou se já houver informações suficientes, incentive-o a clicar no botão "Gerar documento" ou confirme o pronto.
6. A ferramenta NÃO gera código-fonte do app; ela gera apenas documentação arquitetural, specs, wireframes e tarefas para agentes de código (Claude Code, Cursor, Codex).`;

    const contents = (messages || []).map((m: any) => ({
      role: m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.text }],
    }));

    // If contents is empty, provide initial greeting
    if (contents.length === 0) {
      contents.push({
        role: 'user',
        parts: [{ text: `Olá! Estou iniciando a etapa "${stageTitle}". Como podemos começar a definir esta etapa?` }],
      });
    }

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    const reply = response.text || '';
    const isReady = reply.toLowerCase().includes('pronto para gerar o documento') ||
                    reply.toLowerCase().includes('pronto para gerar') ||
                    reply.toLowerCase().includes('já temos tudo para gerar');

    // Extract suggested answer if pattern found
    let suggestedAnswer: string | undefined;
    const matchSuggestion = reply.match(/(?:💡|Sugestão(?: recomendada)?|Opção recomendada):\s*["']?([^"\n\r]+)["']?/i);
    if (matchSuggestion && matchSuggestion[1]) {
      suggestedAnswer = matchSuggestion[1].trim();
    }

    res.json({ reply, isReadyToGenerate: isReady, suggestedAnswer });
  } catch (error: any) {
    console.error('Error in /api/chat:', error);
    res.status(500).json({ error: error.message || 'Erro ao processar chat com Gemini.' });
  }
});

// 2. Generate Document endpoint
app.post('/api/generate-doc', async (req, res) => {
  try {
    const { stageId, messages, contextDocs, itemContext } = req.body;
    const approvedContext = formatApprovedDocs(contextDocs);

    const chatSummary = (messages || [])
      .map((m: any) => `${m.role === 'user' ? 'Usuário' : 'Arquiteto'}: ${m.text}`)
      .join('\n');

    let prompt = '';
    let systemInstruction = `Você é um arquiteto de software sênior gerando documentação técnica de alta fidelidade para Spec-Driven Development. Responda em Português do Brasil com Markdown estruturado, profissional e completo. Não gere tags de código externas além dos blocos normais de markdown.`;

    if (stageId === 'brainstorm') {
      prompt = `Gere o documento oficial "docs/00-brainstorm.md" com base nas discussões.
ESTRUTURA OBRIGATÓRIA:
# Brainstorm — [Nome do Projeto]

## 1. Visão Geral e Problema
- O que é o projeto
- Problema real que resolve
- Por que as soluções atuais falham

## 2. Público-Alvo e Usuários
- Perfil principal
- Dores mais agudas
- Cenário de uso típico

## 3. Proposta de Valor e Diferenciais
- Principais diferenciais competitivos
- O que torna a abordagem única

## 4. Escopo do MVP
- Funcionalidades essenciais do MVP
- O que está EXPLICITAMENTE FORA DO ESCOPO do MVP

Histórico da discussão:
${chatSummary}`;
    } else if (stageId === 'prd') {
      prompt = `Gere o documento oficial "docs/01-prd.md" com base no Brainstorm e discussões.
ESTRUTURA OBRIGATÓRIA:
# Product Requirements Document (PRD) — [Nome do Projeto]

## 1. Objetivos do Produto
- Metas de negócio e produto

## 2. Personas
- Persona 1: ...
- Persona 2: ...

## 3. Requisitos Funcionais (RF)
Numere rigorosamente (RF-01, RF-02, etc.). Seja explícito nos critérios:
- **RF-01**: [Título] — [Descrição detalhada]
- **RF-02**: [Título] — [Descrição detalhada]
... (liste entre 5 a 10 RFs fundamentais)

## 4. Requisitos Não Funcionais (RNF)
Numere rigorosamente (RNF-01, RNF-02, etc.):
- **RNF-01**: [Desempenho / Segurança / Usabilidade] — [Critério mensurável]
- **RNF-02**: ...

## 5. Métricas de Sucesso
- KPIs específicos e mensuráveis

## 6. Fora de Escopo
- Lista clara do que NÃO será feito no MVP

Contexto dos docs aprovados:
${approvedContext}

Histórico da discussão:
${chatSummary}`;
    } else if (stageId === 'architecture') {
      prompt = `Gere o documento oficial "docs/02-arquitetura.md" E forneça também 2 ou 3 ADRs fundamentais.
O documento deve conter:
# Arquitetura de Software — [Nome do Projeto]

## 1. Stack Tecnológica
- Frontend, Backend, Banco de Dados, Bibliotecas-chave, Justificativas

## 2. Estrutura de Pastas do Projeto
- Árvore recomendada explicada

## 3. Modelo de Dados
- Entidades e relacionamentos
- Inclua OBRIGATORIAMENTE um diagrama mermaid erDiagram válido! Exemplo:
\`\`\`mermaid
erDiagram
  USER ||--o{ POST : creates
  USER {
    string id PK
    string email
  }
\`\`\`

## 4. Decisões Arquiteturais (ADRs Resumidas)
- Resumo dos ADRs tomados

Contexto dos docs aprovados:
${approvedContext}

Histórico da discussão:
${chatSummary}`;
    } else if (stageId === 'features' && itemContext) {
      prompt = `Gere a especificação técnica detalhada da feature "${itemContext.title}" (${itemContext.slug}) para o arquivo docs/specs/${itemContext.slug}/spec.md.
ESTRUTURA OBRIGATÓRIA:
# Spec: ${itemContext.title}
**Slug:** ${itemContext.slug} | **Refs PRD:** ${itemContext.prdRefs?.join(', ') || 'RF-01'}

## 1. Visão Geral e Regras de Negócio
- Regras de negócio estritas (RN-01, RN-02, etc.)

## 2. Fluxo Principal
Diagrama Mermaid flowchart TD válido ilustrando o fluxo:
\`\`\`mermaid
flowchart TD
  A[Início] --> B[Ação]
  B --> C{Validação}
  C -->|Sim| D[Sucesso]
  C -->|Não| E[Erro]
\`\`\`

## 3. Fluxos Alternativos e Exceções
- Passo a passo de exceções

## 4. Casos de Borda (Edge Cases)
- Lista de casos extremos e como tratar

## 5. Requisitos do PRD Atendidos
- Mapeamento direto aos RFs do PRD

Contexto do PRD e Arquitetura:
${approvedContext}`;
    } else if (stageId === 'screens' && itemContext) {
      prompt = `Gere a documentação de telas e wireframe para a feature "${itemContext.title}" (${itemContext.slug}).
Arquivo: docs/specs/${itemContext.slug}/telas.md
Estrutura do documento:
# Telas: ${itemContext.title}
**Feature:** ${itemContext.slug}

## 1. Telas e Componentes
- Elementos visuais, campos de formulário, botões, estados vazios.

## 2. Tabela de Interações
| Elemento / Ação do Usuário | Resultado Esperado | Validação / Feedback |
| --- | --- | --- |
| ... | ... | ... |

## 3. Estados de Interface
- Carregando (Loading)
- Vazio (Empty state)
- Erro (Error feedback)
- Sucesso

Contexto do projeto:
${approvedContext}`;
    } else if (stageId === 'tasks' && itemContext) {
      // Single task generation
      prompt = `Gere a especificação da tarefa ${itemContext.code} — ${itemContext.title} seguindo RIGOROSAMENTE o template obrigatório:
# ${itemContext.code} — ${itemContext.title}
**Feature:** ${itemContext.featureSlug} | **Refs:** ${itemContext.refs?.join(', ') || 'RF-01'}

## Objetivo
Uma frase clara e concisa.

## Arquivos que pode criar/alterar
- caminho/arquivo

## Ação → Resultado esperado
| Ação | Resultado esperado |
| --- | --- |
| Executar / Implementar X | Comportamento Y esperado |

## Critérios de aceite
- [ ] Critério 1
- [ ] Critério 2

## Como verificar
Comando ou passo manual exato que prova que a tarefa funciona.

## Fora de escopo
O que NÃO fazer nesta tarefa.

Contexto da feature e projeto:
${approvedContext}`;
    } else {
      prompt = `Gere o documento completo para a etapa "${stageId}" com base no contexto do projeto e histórico da conversa:
${chatSummary}
Docs aprovados:
${approvedContext}`;
    }

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.4,
      },
    });

    const markdown = response.text || '';
    res.json({ markdown });
  } catch (error: any) {
    console.error('Error in /api/generate-doc:', error);
    res.status(500).json({ error: error.message || 'Erro ao gerar documento.' });
  }
});

// 3. Propose Features list (Structured JSON)
app.post('/api/propose-features', async (req, res) => {
  try {
    const { contextDocs } = req.body;
    const prdDoc = contextDocs['docs/01-prd.md'] || contextDocs['PRD'] || '';

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Com base no PRD do projeto abaixo, proponha uma lista coesa e completa de 4 a 8 features essenciais para o MVP.
Para cada feature, atribua:
- id: identificador único incremental (ex: "feat-1")
- slug: formato padronizado "001-nome-curto", "002-nome-curto"
- title: nome claro e objetivo da feature
- description: descrição resumida em 1-2 frases
- prdRefs: lista de requisitos funcionais atendidos (ex: ["RF-01", "RF-02"])

PRD:
${prdDoc || 'App de produtividade e desenvolvimento de software.'}`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          description: 'Lista de features do MVP',
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              slug: { type: Type.STRING },
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              prdRefs: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ['id', 'slug', 'title', 'description', 'prdRefs'],
          },
        },
      },
    });

    const features = JSON.parse(response.text || '[]');
    res.json({ features });
  } catch (error: any) {
    console.error('Error in /api/propose-features:', error);
    res.status(500).json({ error: error.message || 'Erro ao propor features.' });
  }
});

// 3.5. Generate Pages hierarchy (Page -> Components -> Behaviors)
app.post('/api/generate-pages', async (req, res) => {
  try {
    const {
      featureSlug,
      featureTitle,
      featureSpec,
      architectureDoc,
      adrsDocs,
      contextDocs = {},
    } = req.body;

    const prdText = contextDocs['docs/01-prd.md'] || contextDocs['prd'] || '';
    const archText = architectureDoc || contextDocs['docs/02-arquitetura.md'] || '';

    let adrsText = '';
    if (adrsDocs && Array.isArray(adrsDocs)) {
      adrsText = adrsDocs.map((a: any) => `### ${a.title || a.filename}\n${a.content || ''}`).join('\n\n');
    } else {
      adrsText = Object.entries(contextDocs)
        .filter(([key]) => key.startsWith('docs/adr/'))
        .map(([key, val]) => `### ${key}\n${val}`)
        .join('\n\n');
    }

    const prompt = `Defina as páginas e telas da feature "${featureTitle}" (${featureSlug}) estruturadas rigorosamente no modelo Página → Componentes → Comportamentos.

DIRETRIZ CRÍTICA DE REUTILIZAÇÃO:
Reutilize componentes com o mesmo nome entre páginas em vez de inventar variações (por exemplo: Header, Sidebar, TaskList, TaskItem, FilterBar, NotificationBadge, ButtonBar, etc.). Se um componente já puder ser compartilhado ou for análogo a outras telas, use o mesmo nome padronizado.

CONTEXTO DA SPEC DA FEATURE:
${featureSpec || 'Feature principal com listagem, criação e interação do usuário.'}

CONTEXTO DO PRD:
${prdText || 'Requisitos da aplicação.'}

CONTEXTO DA ARQUITETURA:
${archText || 'Estrutura padrão de componentes e páginas.'}

DECISÕES ARQUITETURAIS:
${adrsText || 'Nenhum ADR específico.'}

Para cada página da feature:
- id: identificador único amigável (ex: "page-1", "page-2")
- name: nome conciso da página (ex: "Lista de Tarefas", "Timer de Foco")
- route: rota URL da página (ex: "/tasks", "/focus")
- purpose: objetivo direto da página para o usuário
- components: lista de componentes presentes na página:
  - id: identificador único do componente (ex: "comp-1", "comp-2")
  - name: nome padronizado do componente (ex: "QuickAddInput", "TaskList", "PomodoroDisplay")
  - description: descrição do papel visual e de interação do componente
  - behaviors: lista de comportamentos do componente:
    - trigger: ação que o usuário realiza (o que o usuário faz, ex: "Digita o título e pressiona Enter", "Clica no checkbox", "Clica no botão Iniciar")
    - expectedResult: resultado esperado da ação (ex: "Adiciona a tarefa no topo da lista", "Marca a tarefa como concluída", "Inicia o cronômetro regressivo")
    - errorCase: o caso de erro ou validação (ex: "Se o título for vazio, destaca a borda em vermelho", "Se o timer já estiver rodando, exibe aviso", "Exibe toast em caso de falha de gravação")`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          description: 'Lista de páginas da feature com componentes e comportamentos estruturados',
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              name: { type: Type.STRING },
              route: { type: Type.STRING },
              purpose: { type: Type.STRING },
              components: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    name: { type: Type.STRING },
                    description: { type: Type.STRING },
                    behaviors: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          trigger: { type: Type.STRING },
                          expectedResult: { type: Type.STRING },
                          errorCase: { type: Type.STRING },
                        },
                        required: ['trigger', 'expectedResult', 'errorCase'],
                      },
                    },
                  },
                  required: ['id', 'name', 'description', 'behaviors'],
                },
              },
            },
            required: ['id', 'name', 'route', 'purpose', 'components'],
          },
        },
      },
    });

    const pages = JSON.parse(response.text || '[]');
    res.json({ pages });
  } catch (error: any) {
    console.error('Error in /api/generate-pages:', error);
    res.status(500).json({ error: error.message || 'Erro ao gerar páginas.' });
  }
});

// 4. Generate Wireframe HTML (Clean grayscale mockup) - supports page-level wireframe
app.post('/api/generate-wireframe', async (req, res) => {
  try {
    const {
      featureTitle,
      featureSlug,
      pageId,
      pageName,
      pageRoute,
      pagePurpose,
      pageComponents,
      screensMarkdown,
      contextDocs,
    } = req.body;

    let componentsSummary = '';
    if (pageComponents && Array.isArray(pageComponents)) {
      componentsSummary = pageComponents
        .map((c: any) => `Componente: ${c.name} - ${c.description || ''}`)
        .join('\n');
    }

    const title = pageName ? `${pageName} (${pageRoute || '/'})` : featureTitle || featureSlug;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Crie um protótipo wireframe simples em HTML + CSS inline (sem imagens externas, estilo cinza/lo-fi/wireframe de alta qualidade com fontes limpas, bordas pontilhadas ou sólidas cinzas, inputs simulados, botões com hover, tabs e listas de dados).
Página: "${title}"
Objetivo: "${pagePurpose || 'Visualização da interface e componentes da página.'}"

Componentes e seções a representar:
${componentsSummary || screensMarkdown || 'Layout com componentes e elementos visuais da página.'}

REQUISITOS DO HTML:
- Retorne APENAS o código HTML completo <!DOCTYPE html><html>...</html> pronto para ser renderizado em um iframe sandbox com srcdoc.
- Cores: tons de cinza (#f8fafc, #f1f5f9, #e2e8f0, #94a3b8, #64748b, #334155, #0f172a). Sem cores chamativas, padrão visual de wireframe clássico.
- Interatividade simples com JavaScript inline (ex: alternar tabs, abrir modal, simular envio de form) se aplicável.
- Totalmente responsivo e bem diagramado com CSS flexbox/grid.`,
      config: {
        temperature: 0.3,
      },
    });

    let rawHtml = response.text || '';
    // Strip markdown code block if present
    rawHtml = rawHtml.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();

    res.json({ wireframeHtml: rawHtml, pageId });
  } catch (error: any) {
    console.error('Error in /api/generate-wireframe:', error);
    res.status(500).json({ error: error.message || 'Erro ao gerar wireframe.' });
  }
});

// 5. Break down Tasks for feature (Structured JSON into Prototype & Functional batches)
app.post('/api/breakdown-tasks', async (req, res) => {
  try {
    const {
      featureSlug,
      featureTitle,
      featureSpec,
      pages = [],
      architectureDoc,
      adrsDocs,
      screensDoc,
      contextDocs = {},
    } = req.body;

    const archText =
      architectureDoc ||
      contextDocs['docs/02-arquitetura.md'] ||
      contextDocs['architecture'] ||
      '';

    let adrsText = '';
    if (adrsDocs && Array.isArray(adrsDocs)) {
      adrsText = adrsDocs.map((a: any) => `### ${a.title || a.filename}\n${a.content || ''}`).join('\n\n');
    } else {
      adrsText = Object.entries(contextDocs)
        .filter(([key]) => key.startsWith('docs/adr/'))
        .map(([key, val]) => `### ${key}\n${val}`)
        .join('\n\n');
    }

    const pagesText = Array.isArray(pages) && pages.length > 0
      ? pages
          .map((p: any) => {
            const comps = (p.components || [])
              .map((c: any) => {
                const behs = (c.behaviors || [])
                  .map((b: any) => `    - [Ação: ${b.trigger}] -> [Resultado: ${b.expectedResult}] (Erro: ${b.errorCase || '-'})`)
                  .join('\n');
                return `  * Componente: ${c.name} (${c.description || ''})\n${behs || '    (Sem comportamentos mapeados)'}`;
              })
              .join('\n');
            return `Página: "${p.name}" | Rota: ${p.route} | Objetivo: ${p.purpose}\n${comps}`;
          })
          .join('\n\n')
      : (screensDoc || contextDocs[`docs/specs/${featureSlug}/telas.md`] || '');

    const prompt = `Quebre a feature "${featureTitle}" (${featureSlug}) em tarefas atômicas distribuídas estritamente em DUAS LEVAS:

LEVA 1 — PROTÓTIPO VISUAL (kind: "prototype"):
- Gere EXATAMENTE UMA tarefa de protótipo por página definida na feature.
- Cada tarefa cobre apenas a parte visual: layout da página, componentes estruturados, estados vazio (empty), carregando (loading) e erro com dados fictícios.
- NENHUMA conexão a banco de dados, APIs ou regras de negócio.
- O campo "dependsOn" dessas tarefas deve ser [] (tarefa inicial de interface).

LEVA 2 — FUNCIONAL (kind: "functional"):
- Gere tarefas que tornam os comportamentos da página reais (persistência, validações, chamadas de serviço, regras de negócio).
- Agrupe comportamentos relacionados, com no máximo 3 a 5 comportamentos por tarefa.
- Cada tarefa funcional DEVE OBRIGATORIAMENTE depender (dependsOn) da tarefa de protótipo da sua página correspondente (use o código do protótipo, ex: ["T001"]).
- Na seção "actions", use os comportamentos mapeados (action = trigger / ação do usuário, expectedResult = resultado esperado).

DIRETRIZ CRÍTICA DE ARQUIVOS:
Os caminhos em files DEVEM seguir exatamente a estrutura de pastas definida na arquitetura.

PÁGINAS E COMPORTAMENTOS DA FEATURE:
${pagesText || 'Páginas da feature.'}

CONTEXTO DA ARQUITETURA DO PROJETO (docs/02-arquitetura.md):
${archText || 'Estrutura padrão src/ com componentes, hooks, tipos e serviços.'}

DECISÕES ARQUITETURAIS (ADRs):
${adrsText || 'Nenhum ADR adicional.'}

SPEC DA FEATURE (spec.md):
${featureSpec || 'Implementar a lógica e UI da feature.'}

Para cada tarefa, forneça:
- code: identificador temporário (ex: "T001", "T002", "T003")
- kind: "prototype" para protótipo de página ou "functional" para implementação funcional
- title: título curto imperativo da tarefa (ex: "Protótipo da página Gerenciamento de Tarefas", "Persistência e regras de criação de tarefas")
- objective: uma única frase explicando o objetivo
- files: lista de caminhos de arquivos prováveis (SEGUINDO ESTRITAMENTE A ESTRUTURA DE PASTAS DA ARQUITETURA)
- refs: referências como RF-01, ADR-0001
- dependsOn: array de códigos de tarefa de que esta tarefa depende (ex: ["T001"], ou [] se for protótipo inicial)
- actions: array de objetos { action: string, expectedResult: string } derivados dos comportamentos mapeados
- acceptanceCriteria: array de strings com critérios mensuráveis
- howToVerify: comando ou passo de verificação manual no navegador/terminal
- outOfScope: o que NÃO fazer nesta tarefa específica`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          description: 'Lista de tarefas em duas levas (prototype e functional) com dependências',
          items: {
            type: Type.OBJECT,
            properties: {
              code: { type: Type.STRING },
              kind: {
                type: Type.STRING,
                enum: ['prototype', 'functional'],
                description: 'Classificação da tarefa: "prototype" para protótipo visual, "functional" para lógica e comportamentos',
              },
              title: { type: Type.STRING },
              objective: { type: Type.STRING },
              files: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              refs: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              dependsOn: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Códigos de tarefas que devem ser executadas antes desta (ex: protótipo da página)',
              },
              actions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    action: { type: Type.STRING },
                    expectedResult: { type: Type.STRING },
                  },
                  required: ['action', 'expectedResult'],
                },
              },
              acceptanceCriteria: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              howToVerify: { type: Type.STRING },
              outOfScope: { type: Type.STRING },
            },
            required: ['code', 'kind', 'title', 'objective', 'files', 'refs', 'actions', 'acceptanceCriteria', 'howToVerify', 'outOfScope'],
          },
        },
      },
    });

    const parsedTasks = JSON.parse(response.text || '[]');

    // Convert each structured task into the exact mandatory Markdown template
    const formattedTasks = parsedTasks.map((t: any) => {
      const actionsTable = (t.actions || [])
        .map((a: any) => `| ${a.action} | ${a.expectedResult} |`)
        .join('\n');

      const acceptanceChecklist = (t.acceptanceCriteria || [])
        .map((c: string) => `- [ ] ${c}`)
        .join('\n');

      const filesList = (t.files || [])
        .map((f: string) => `- ${f}`)
        .join('\n');

      const dependsOnList = Array.isArray(t.dependsOn) ? t.dependsOn : [];
      const dependsOnStr = dependsOnList.length > 0 ? dependsOnList.join(', ') : 'Nenhuma (tarefa inicial)';
      const kind = t.kind === 'prototype' ? 'prototype' : 'functional';
      const tipoLabel = kind === 'prototype' ? 'Protótipo visual' : 'Funcional';

      const markdown = `# ${t.code} — ${t.title}
**Feature:** ${featureSlug} | **Refs:** ${(t.refs || []).join(', ')}
**Tipo:** ${tipoLabel}
**Depende de:** ${dependsOnStr}

## Objetivo
${t.objective}

## Arquivos prováveis (confirmar no /plan)
${filesList}

## Ação → Resultado esperado
| Ação | Resultado esperado |
| --- | --- |
${actionsTable}

## Critérios de aceite
${acceptanceChecklist}

## Como verificar
${t.howToVerify}

## Fora de escopo
${t.outOfScope}

## Plano de implementação
_A ser preenchido pelo comando /plan dentro da IDE._
`;

      return {
        ...t,
        kind,
        dependsOn: dependsOnList,
        featureSlug,
        markdown,
      };
    });

    res.json({ tasks: formattedTasks });
  } catch (error: any) {
    console.error('Error in /api/breakdown-tasks:', error);
    res.status(500).json({ error: error.message || 'Erro ao detalhar tarefas.' });
  }
});

// 6. Adjust Document based on user instructions
app.post('/api/adjust-doc', async (req, res) => {
  try {
    const { stageId, currentContent, instruction, contextDocs } = req.body;
    const approvedContext = formatApprovedDocs(contextDocs);

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Você é um arquiteto de software refinando um documento técnico da etapa "${stageId}".
O usuário solicitou o seguinte ajuste:
"${instruction}"

DOCUMENTO ATUAL:
${currentContent}

CONTEXTO DE DOCS ANTERIORES:
${approvedContext}

INSTRUÇÃO:
Devolva o documento markdown INTEIRO atualizado, incorporando precisamente o ajuste solicitado e mantendo as seções originais e integridade do documento. Não adicione comentários conversacionais ao redor do markdown; devolva apenas o markdown pronto.`,
      config: {
        temperature: 0.3,
      },
    });

    let updatedMarkdown = response.text || '';
    // Strip external markdown fences if whole response is wrapped in ```markdown ... ```
    if (updatedMarkdown.startsWith('```markdown') && updatedMarkdown.endsWith('```')) {
      updatedMarkdown = updatedMarkdown.replace(/^```markdown\s*/, '').replace(/\s*```$/, '');
    } else if (updatedMarkdown.startsWith('```') && updatedMarkdown.endsWith('```')) {
      updatedMarkdown = updatedMarkdown.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    res.json({ markdown: updatedMarkdown.trim() });
  } catch (error: any) {
    console.error('Error in /api/adjust-doc:', error);
    res.status(500).json({ error: error.message || 'Erro ao ajustar documento.' });
  }
});

// 7. Generate Architecture ADRs
app.post('/api/generate-adrs', async (req, res) => {
  try {
    const { contextDocs } = req.body;
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Com base na arquitetura e PRD do projeto, gere 2 ou 3 Decisões Arquiteturais (ADRs) fundamentais no formato:
- id: "0001", "0002"
- number: "0001"
- title: título curto (ex: "Uso de SQLite Local com Drizzle")
- filename: "0001-nome-curto.md"
- content: markdown do ADR com:
# ADR 0001: [Título]
## Status
Aceito
## Contexto
Qual o problema e as opções consideradas.
## Decisão
A escolha técnica feita e por que.
## Consequências
Vantagens e desvantagens assumidas.

Contexto dos docs aprovados:
${formatApprovedDocs(contextDocs)}`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              number: { type: Type.STRING },
              title: { type: Type.STRING },
              filename: { type: Type.STRING },
              content: { type: Type.STRING },
            },
            required: ['id', 'number', 'title', 'filename', 'content'],
          },
        },
      },
    });

    const adrs = JSON.parse(response.text || '[]');
    res.json({ adrs });
  } catch (error: any) {
    console.error('Error in /api/generate-adrs:', error);
    res.status(500).json({ error: error.message || 'Erro ao gerar ADRs.' });
  }
});

// 8. Generate AGENTS.md with AI
app.post('/api/generate-agents-md', async (req, res) => {
  try {
    const { projectName, summary, brainstormDoc, prdDoc, architectureDoc, adrs, features } = req.body;

    const adrsFormatted = Array.isArray(adrs)
      ? adrs.map((a: any) => `### ${a.title || a.filename}\n${a.content || ''}`).join('\n\n')
      : 'Nenhum ADR registrado.';

    const featuresFormatted = Array.isArray(features)
      ? features.map((f: any) => `- **${f.title}** (${f.slug}): ${f.description || ''}`).join('\n')
      : 'Nenhuma feature cadastrada.';

    const prompt = `Você é um arquiteto de software sênior encarregado de gerar a constituição oficial do projeto para agentes autônomos de código (Claude Code, Codex, Cursor, Antigravity) no arquivo AGENTS.md.

DOCUMENTOS APROVADOS DO PROJETO:

=== 1. BRAINSTORM ===
${brainstormDoc || 'Resumo do brainstorm não fornecido.'}

=== 2. PRD (Requisitos Funcionais e Não Funcionais) ===
${prdDoc || 'PRD não fornecido.'}

=== 3. ARQUITETURA DE SOFTWARE (docs/02-arquitetura.md) ===
${architectureDoc || 'Arquitetura não fornecida.'}

=== 4. DECISÕES ARQUITETURAIS (ADRs) ===
${adrsFormatted}

=== 5. FEATURES DO MVP ===
${featuresFormatted}

ESTRUTURA OBRIGATÓRIA DO DOCUMENTO:
Gere o conteúdo em Markdown no formato exato com estas 6 seções rigorosas:

# AGENTS.md — Constituição do Projeto: ${projectName || 'Projeto'}

> Este documento é a fonte única da verdade para todos os agentes autônomos de código (Claude Code, Cursor, Codex, Antigravity) que trabalham neste repositório. Siga rigorosamente as instruções abaixo.

## 1. Resumo do Produto
[Descreva um resumo pragmático e direto do produto baseado no Brainstorm e PRD: proposta de valor, público-alvo e problema que resolve.]

## 2. Stack Tecnológica
[Copie e adapte EXATAMENTE a stack definida em docs/02-arquitetura.md (frontend, backend, banco de dados, bibliotecas, linguagem, estilização, etc.).]

## 3. Estrutura de Pastas e Invariantes
[Copie a estrutura de pastas definida na arquitetura e liste as invariantes estruturais do projeto:
- As especificações oficiais de cada feature residem em docs/specs/NNN-nome/spec.md.
- As especificações atômicas de tarefas residem em docs/tasks/NNN-nome/T00X.md.
- Cada tarefa deve ser executada de forma atômica e independente.]

## 4. Regras de Código e Invariantes
[Derivadas rigorosamente dos ADRs e dos Requisitos Não Funcionais (RNFs) do PRD, incluindo:
- Regras estritas de tipagem e padrões
- Não adicione dependências não solicitadas
- Não altere arquivos fora da lista permitida na seção "Arquivos que pode criar/alterar" de cada tarefa
- Não quebre testes existentes e preserve a arquitetura Local-First/banco conforme decidido nos ADRs
- Outras restrições extraídas dos ADRs e RNFs]

## 5. Comandos do Projeto
[Comandos reais do projeto para instalar, rodar em desenvolvimento, migrations (se aplicável), testes, lint e build, CONFORME A STACK EXATA do projeto (ex: se for npm, yarn, pnpm, cargo, python, etc., use os comandos reais).]

## 6. Fluxo de Trabalho
1. Leia STATUS.md e pegue a próxima tarefa pendente cujas dependências estejam concluídas.
2. Rode o planejamento da tarefa (/plan T00X no Claude Code, ou siga docs/workflow/plan.md em outras ferramentas).
3. Aguarde revisão humana do plano.
4. Rode a execução (/execute T00X, ou siga docs/workflow/execute.md).
5. Nunca execute mais de uma tarefa sem autorização.
`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        temperature: 0.3,
      },
    });

    let markdown = response.text || '';
    if (markdown.startsWith('```markdown') && markdown.endsWith('```')) {
      markdown = markdown.replace(/^```markdown\s*/, '').replace(/\s*```$/, '');
    } else if (markdown.startsWith('```') && markdown.endsWith('```')) {
      markdown = markdown.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    res.json({ agentsMd: markdown.trim() });
  } catch (error: any) {
    console.error('Error in /api/generate-agents-md:', error);
    res.status(500).json({ error: error.message || 'Erro ao gerar AGENTS.md com IA.' });
  }
});

// 9. Generate Stack-Layer Skills with AI
app.post('/api/generate-skills', async (req, res) => {
  try {
    const { architectureDoc, adrs, projectName } = req.body;

    const adrsFormatted = Array.isArray(adrs)
      ? adrs.map((a: any) => `### ${a.title || a.filename}\n${a.content || ''}`).join('\n\n')
      : 'Nenhum ADR registrado.';

    const systemInstruction = `Você é um arquiteto de software sênior encarregado de criar skills de código e regras de projeto (.claude/skills, .cursor/rules e docs/skills) para agentes de IA autônomos.
A partir da arquitetura do projeto e dos ADRs decididos, gere de 4 a 7 skills altamente especializadas, exatamente uma por camada ou tipo de arquivo relevante da stack escolhida (por exemplo: componentes de UI, server actions / rotas de API, hooks / gerenciamento de estado, modelos de dados e migrations, políticas de segurança / autorização, integrações externas, testes automatizados e verificação).

Cada skill deve conter:
- slug: identificador kebab-case (ex: "ui-components", "api-routes", "data-models", "state-hooks", "test-standards")
- name: nome claro e objetivo da skill (ex: "Componentes de UI", "Rotas de API e Server Actions", etc.)
- description: descrição concisa do propósito e escopo da skill
- globs: padrão de caminho onde a skill se aplica (ex: "src/components/**/*.{tsx,jsx}", "src/routes/**/*.ts", etc.)
- content: instruções técnicas aprofundadas em Markdown estruturado, cobrindo:
  - Boas Práticas e Convenções do Projeto
  - Exemplo curto de código correto e idiomático
  - Erros comuns a evitar`;

    const prompt = `DOCUMENTOS DE ARQUITETURA DO PROJETO "${projectName || 'Projeto'}":

=== ARQUITETURA (docs/02-arquitetura.md) ===
${architectureDoc || 'Arquitetura não fornecida.'}

=== DECISÕES ARQUITETURAIS (ADRs) ===
${adrsFormatted}

Gere entre 4 e 7 skills adequadas a esta stack. Retorne estritamente o JSON com o schema solicitado.`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.3,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            skills: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  slug: { type: Type.STRING },
                  name: { type: Type.STRING },
                  description: { type: Type.STRING },
                  globs: { type: Type.STRING },
                  content: { type: Type.STRING },
                },
                required: ['slug', 'name', 'description', 'globs', 'content'],
              },
            },
          },
          required: ['skills'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{"skills":[]}');
    res.json({ skills: parsed.skills || [] });
  } catch (error: any) {
    console.error('Error in /api/generate-skills:', error);
    res.status(500).json({ error: error.message || 'Erro ao gerar skills com IA.' });
  }
});

// Vite middleware in dev or static files in prod
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Spec Studio server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
