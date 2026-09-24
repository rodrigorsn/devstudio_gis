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

// 4. Generate Wireframe HTML (Clean grayscale mockup)
app.post('/api/generate-wireframe', async (req, res) => {
  try {
    const { featureTitle, featureSlug, screensMarkdown, contextDocs } = req.body;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Crie um protótipo wireframe simples em HTML + CSS inline (sem imagens externas, estilo cinza/lo-fi/wireframe de alta qualidade com fontes limpas, bordas pontilhadas ou sólidas cinzas, inputs simulados, botões com hover, tabs e listas de dados).
Feature: "${featureTitle}" (${featureSlug})
Descrição das telas:
${screensMarkdown || 'Tela principal da feature com formulário e listagem.'}

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

    res.json({ wireframeHtml: rawHtml });
  } catch (error: any) {
    console.error('Error in /api/generate-wireframe:', error);
    res.status(500).json({ error: error.message || 'Erro ao gerar wireframe.' });
  }
});

// 5. Break down Tasks for feature (Structured JSON)
app.post('/api/breakdown-tasks', async (req, res) => {
  try {
    const { featureSlug, featureTitle, featureSpec, startIndex = 1 } = req.body;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Quebre a feature "${featureTitle}" (${featureSlug}) em 2 a 5 tarefas pequenas e atômicas (cada uma executável em uma única sessão de agente de código como Claude Code, Cursor, Codex).
Numere os códigos a partir de T${String(startIndex).padStart(3, '0')}.
Para cada tarefa, forneça:
- code: ex: "T001", "T002"
- title: título curto imperativo da tarefa
- objective: uma única frase explicando o objetivo
- files: lista de arquivos que pode criar ou alterar
- refs: referências como RF-01, ADR-0001
- actions: array de objetos { action: string, expectedResult: string }
- acceptanceCriteria: array de strings com critérios mensuráveis
- howToVerify: comando ou passo manual exato
- outOfScope: o que NÃO fazer nesta tarefa específica

Spec da feature:
${featureSpec || 'Implementar a lógica e UI da feature.'}`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          description: 'Lista de tarefas pequenas',
          items: {
            type: Type.OBJECT,
            properties: {
              code: { type: Type.STRING },
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
            required: ['code', 'title', 'objective', 'files', 'refs', 'actions', 'acceptanceCriteria', 'howToVerify', 'outOfScope'],
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

      const markdown = `# ${t.code} — ${t.title}
**Feature:** ${featureSlug} | **Refs:** ${(t.refs || []).join(', ')}

## Objetivo
${t.objective}

## Arquivos que pode criar/alterar
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
`;

      return {
        ...t,
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
