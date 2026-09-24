import { SkillItem } from '../types/spec';

export const WORKFLOW_COMMANDS = {
  // .claude/commands/plan.md (with frontmatter)
  claudePlan: `---
description: Pesquisa o código e enriquece uma tarefa antes de executá-la
argument-hint: [código da tarefa, ex: T003]
---
Tarefa: $ARGUMENTS
1. Leia AGENTS.md, o arquivo da tarefa em docs/tasks/ e a spec e o telas.md da feature referenciada.
2. Pesquise no código existente: implementações parecidas, componentes, hooks e utilitários que podem ser reutilizados, e os padrões já usados. Não recrie o que já existe.
3. Se a tarefa usar biblioteca ou API externa, consulte a documentação oficial atual antes de planejar.
4. NÃO escreva código. Preencha a seção "## Plano de implementação" do arquivo da tarefa com: arquivos a criar (caminho + conteúdo), arquivos a modificar (caminho + o que muda), o que reutilizar, cenários (caminho feliz, borda, erro), mudanças no banco, dependências novas (com justificativa) e testes a escrever.
5. Mostre o plano e pare para revisão.`,

  // .claude/commands/execute.md (with frontmatter)
  claudeExecute: `---
description: Executa uma tarefa já planejada
argument-hint: [código da tarefa, ex: T003]
---
Tarefa: $ARGUMENTS
1. Leia AGENTS.md e o arquivo da tarefa. Se a seção "Plano de implementação" estiver vazia, pare e peça para rodar /plan primeiro.
2. Crie a branch task/$ARGUMENTS.
3. Implemente seguindo estritamente o plano, tocando apenas nos arquivos listados. Antes de escrever cada tipo de arquivo, leia a skill correspondente em docs/skills/.
4. Escreva e rode os testes do plano e a verificação da seção "Como verificar".
5. Marque a tarefa como concluída em STATUS.md, faça o commit, resuma o que foi feito e pare.`,

  // docs/workflow/plan.md (without frontmatter, replacing $ARGUMENTS with "a tarefa indicada")
  docsPlan: `Tarefa: a tarefa indicada
1. Leia AGENTS.md, o arquivo da tarefa em docs/tasks/ e a spec e o telas.md da feature referenciada.
2. Pesquise no código existente: implementações parecidas, componentes, hooks e utilitários que podem ser reutilizados, e os padrões já usados. Não recrie o que já existe.
3. Se a tarefa usar biblioteca ou API externa, consulte a documentação oficial atual antes de planejar.
4. NÃO escreva código. Preencha a seção "## Plano de implementação" do arquivo da tarefa com: arquivos a criar (caminho + conteúdo), arquivos a modificar (caminho + o que muda), o que reutilizar, cenários (caminho feliz, borda, erro), mudanças no banco, dependências novas (com justificativa) e testes a escrever.
5. Mostre o plano e pare para revisão.`,

  // docs/workflow/execute.md (without frontmatter, replacing $ARGUMENTS with "a tarefa indicada")
  docsExecute: `Tarefa: a tarefa indicada
1. Leia AGENTS.md e o arquivo da tarefa. Se a seção "Plano de implementação" estiver vazia, pare e peça para rodar /plan primeiro.
2. Crie a branch task/a tarefa indicada.
3. Implemente seguindo estritamente o plano, tocando apenas nos arquivos listados. Antes de escrever cada tipo de arquivo, leia a skill correspondente em docs/skills/.
4. Escreva e rode os testes do plano e a verificação da seção "Como verificar".
5. Marque a tarefa como concluída em STATUS.md, faça o commit, resuma o que foi feito e pare.`,
};

export function formatClaudeSkill(skill: SkillItem): string {
  return `---
name: ${skill.name}
description: ${skill.description}
---

${skill.content.trim()}
`;
}

export function formatCursorRule(skill: SkillItem): string {
  return `---
description: ${skill.description}
globs: ${skill.globs}
alwaysApply: false
---

${skill.content.trim()}
`;
}

export function formatDocsSkill(skill: SkillItem): string {
  return `# ${skill.name}

> ${skill.description}
> **Escopo de aplicação:** \`${skill.globs}\`

${skill.content.trim()}
`;
}

export const DEFAULT_DEMO_SKILLS: SkillItem[] = [
  {
    slug: 'ui-components',
    name: 'Componentes de UI',
    description: 'Padrões de componentes visuais, acessibilidade e estilização Tailwind',
    globs: 'src/components/**/*.{tsx,jsx}',
    content: `## Boas Práticas
- Escreva componentes puramente funcionais com tipagem estrita de props via TypeScript interface.
- Use exclusivamente Tailwind CSS; evite CSS customizado ou tags \`<style>\`.
- Todo componente interativo deve ter estados visuais claros: default, hover, active, focus-visible e disabled.
- Extraia subcomponentes caso a complexidade do arquivo ultrapasse 150 linhas.

## Exemplo
\`\`\`tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
}

export const Button: React.FC<ButtonProps> = ({ variant = 'primary', children, ...props }) => (
  <button
    {...props}
    className={\`px-4 py-2 rounded-lg font-medium transition \${
      variant === 'primary' ? 'bg-emerald-600 text-white hover:bg-emerald-500' : 'bg-slate-800 text-slate-200'
    }\`}
  >
    {children}
  </button>
);
\`\`\`

## Erros a Evitar
- Não use inline styles (\`style={{ ... }}\`).
- Não modifique estado global diretamente sem passar por hooks ou context dedicado.`,
  },
  {
    slug: 'state-and-hooks',
    name: 'Estado Global e Custom Hooks',
    description: 'Convenções para hooks reutilizáveis e sincronização com LocalStorage/IndexedDB',
    globs: 'src/hooks/**/*.{ts,tsx},src/context/**/*.{ts,tsx}',
    content: `## Boas Práticas
- Centralize a lógica de persistência e efeitos colaterais dentro de custom hooks dedicados.
- Trate sempre erros de \`JSON.parse\` e chamadas assíncronas com blocos \`try/catch\`.
- Mantenha funções de atualização imutáveis (use pattern funcional \`setX(prev => ...)\`).

## Exemplo
\`\`\`ts
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });
  return [value, setValue] as const;
}
\`\`\`

## Erros a Evitar
- Não leia \`localStorage\` repetidamente durante re-renderizações sem memorização.`,
  },
  {
    slug: 'data-storage',
    name: 'Modelos de Dados e Persistência',
    description: 'Estruturação de tipos de dados, schemas e integridade relacional',
    globs: 'src/storage/**/*.{ts,js},src/types/**/*.{ts,d.ts}',
    content: `## Boas Práticas
- Defina tipos TypeScript estritos para cada entidade do domínio (Task, Tag, FocusSession).
- Nunca use o tipo \`any\`; use unions e discriminators quando houver variações.
- Mantenha funções de migração e versionamento de schema para armazenamento local.

## Exemplo
\`\`\`ts
export interface FocusSession {
  id: string;
  taskId: string;
  durationMinutes: number;
  startedAt: number;
  completed: boolean;
}
\`\`\`

## Erros a Evitar
- Não mute arrays ou objetos do banco de dados em memória; sempre retorne novas instâncias.`,
  },
  {
    slug: 'testing-verification',
    name: 'Testes e Verificação de Qualidade',
    description: 'Padrões de testes unitários e verificação dos critérios de aceite',
    globs: 'src/**/*.{test,spec}.{ts,tsx}',
    content: `## Boas Práticas
- Escreva testes unitários cobrindo o caminho feliz, casos de borda e cenários de erro para cada tarefa funcional.
- Verifique os critérios de aceite documentados no arquivo da tarefa (\`docs/tasks/...\`).
- Assegure que as suítes rodem de forma determinística e rápida.

## Erros a Evitar
- Não faça mock excessivo de implementações que impeçam detectar quebras reais de contrato.`,
  },
];
