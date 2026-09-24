import { PageItem } from '../types/spec';

/**
 * Generates the telas.md markdown from the Page → Components → Behaviors hierarchy.
 * Format:
 * # Telas — <Feature Title>
 *
 * ## Página: <Nome>
 * **Rota:** `<route>`
 * **Objetivo:** <purpose>
 *
 * ### Componente: <Nome do Componente>
 * <description>
 * | Ação do usuário | Resultado esperado | Caso de erro |
 * | --- | --- | --- |
 * | trigger | expectedResult | errorCase |
 */
export function generateTelasMarkdown(pages: PageItem[] = [], featureTitle?: string): string {
  if (!pages || pages.length === 0) {
    return `# Telas e Comportamentos${featureTitle ? ` — ${featureTitle}` : ''}

_Nenhuma página cadastrada ainda. Gere as páginas com IA ou crie manualmente._
`;
  }

  const sections = pages.map((page) => {
    const componentSections = (page.components || []).map((comp) => {
      const behaviors = comp.behaviors || [];
      const behaviorRows = behaviors.map((b) => {
        const trigger = (b.trigger || '').replace(/\|/g, '\\|').trim();
        const expectedResult = (b.expectedResult || '').replace(/\|/g, '\\|').trim();
        const errorCase = (b.errorCase || '-').replace(/\|/g, '\\|').trim();
        return `| ${trigger} | ${expectedResult} | ${errorCase} |`;
      }).join('\n');

      const table = behaviors.length > 0
        ? `| Ação do usuário | Resultado esperado | Caso de erro |\n| --- | --- | --- |\n${behaviorRows}`
        : '_Nenhum comportamento mapeado ainda._';

      const desc = comp.description ? `${comp.description.trim()}\n\n` : '';

      return `### Componente: ${comp.name}\n${desc}${table}`;
    }).join('\n\n');

    return `## Página: ${page.name}
**Rota:** \`${page.route || '/'}\`
**Objetivo:** ${page.purpose}

${componentSections || '_Nenhum componente cadastrado nesta página._'}`;
  });

  return `# Telas e Comportamentos${featureTitle ? ` — ${featureTitle}` : ''}

${sections.join('\n\n---\n\n')}
`;
}
