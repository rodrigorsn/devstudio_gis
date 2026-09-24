import { FeatureItem, TaskItem, TaskKind } from '../types/spec';

/**
 * Re-orders and renumbers project tasks:
 * 1. Groups by kind: all 'prototype' first, then all 'functional'.
 * 2. Within each group: by the order of features in the project.
 * 3. Within the same feature: preserves the original relative order.
 * 4. Renumbers sequentially (T001, T002...) updating task.code,
 *    task.markdown (header, dependsOn line, code references), and dependsOn array.
 */
export function renumberTasks(
  projectOrTasks: { tasks: TaskItem[]; features: FeatureItem[] } | TaskItem[],
  maybeFeatures?: FeatureItem[]
): TaskItem[] {
  let tasks: TaskItem[];
  let features: FeatureItem[];

  if (Array.isArray(projectOrTasks)) {
    tasks = projectOrTasks;
    features = maybeFeatures || [];
  } else {
    tasks = projectOrTasks.tasks || [];
    features = projectOrTasks.features || [];
  }

  if (!tasks || tasks.length === 0) return [];

  // Create map of featureSlug -> feature order index
  const featureOrderMap = new Map<string, number>();
  features.forEach((feat, index) => {
    featureOrderMap.set(feat.slug, index);
  });

  // Map each task with sorting weights
  const indexedTasks = tasks.map((task, originalIndex) => {
    const kind: TaskKind = task.kind === 'prototype' ? 'prototype' : 'functional';
    const kindPriority = kind === 'prototype' ? 0 : 1;
    const featureOrder = featureOrderMap.has(task.featureSlug)
      ? featureOrderMap.get(task.featureSlug)!
      : 9999;

    return {
      task: {
        ...task,
        kind,
        dependsOn: Array.isArray(task.dependsOn) ? [...task.dependsOn] : [],
      } as TaskItem,
      originalIndex,
      kindPriority,
      featureOrder,
    };
  });

  // Sort: 1) kind priority (prototype then functional), 2) feature order, 3) original order
  indexedTasks.sort((a, b) => {
    if (a.kindPriority !== b.kindPriority) {
      return a.kindPriority - b.kindPriority;
    }
    if (a.featureOrder !== b.featureOrder) {
      return a.featureOrder - b.featureOrder;
    }
    return a.originalIndex - b.originalIndex;
  });

  const sortedTasks = indexedTasks.map((item) => ({ ...item.task }));

  // Create code mapping from old codes to new codes (e.g. T004 -> T002)
  const codeMap = new Map<string, string>();
  sortedTasks.forEach((task, idx) => {
    const newCode = `T${String(idx + 1).padStart(3, '0')}`;
    codeMap.set(task.code.toUpperCase(), newCode);
  });

  // Update each task with new sequential code, updated dependsOn, and updated markdown
  return sortedTasks.map((task, idx) => {
    const oldCode = task.code;
    const newCode = `T${String(idx + 1).padStart(3, '0')}`;

    // Map old dependsOn references to new sequential codes
    const newDependsOn = (task.dependsOn || []).map((dep) => {
      const depUpper = dep.trim().toUpperCase();
      return codeMap.get(depUpper) || dep;
    });

    let newMarkdown = task.markdown || '';
    const tipoLabel = task.kind === 'prototype' ? 'Protótipo visual' : 'Funcional';

    // Replace header: # T00X — Title
    newMarkdown = newMarkdown.replace(
      /^#\s*T\d{3,4}\s*—/m,
      `# ${newCode} —`
    );

    // Replace/Ensure Tipo and Depende de lines right below Feature line
    const dependsText =
      newDependsOn.length > 0 ? newDependsOn.join(', ') : 'Nenhuma (tarefa inicial)';

    newMarkdown = newMarkdown.replace(/^\*\*Tipo:\*\*[^\n]*\n?/gm, '');
    newMarkdown = newMarkdown.replace(/^\*\*Depende de:\*\*[^\n]*\n?/gm, '');

    if (/\*\*Feature:\*\*([^\n]*)/i.test(newMarkdown)) {
      newMarkdown = newMarkdown.replace(
        /(\*\*Feature:\*\*[^\n]*)/i,
        `$1\n**Tipo:** ${tipoLabel}\n**Depende de:** ${dependsText}`
      );
    } else {
      newMarkdown = `**Tipo:** ${tipoLabel}\n**Depende de:** ${dependsText}\n\n` + newMarkdown;
    }

    // Rename section: "Arquivos que pode criar/alterar" -> "Arquivos prováveis (confirmar no /plan)"
    newMarkdown = newMarkdown.replace(
      /##\s*Arquivos que pode criar\/alterar/gi,
      '## Arquivos prováveis (confirmar no /plan)'
    );

    // Replace any references to other old task codes inside markdown
    codeMap.forEach((replacement, orig) => {
      if (orig !== oldCode.toUpperCase()) {
        const regex = new RegExp(`\\b${orig}\\b`, 'g');
        newMarkdown = newMarkdown.replace(regex, replacement);
      }
    });

    // Ensure "## Plano de implementação" at the end
    if (!/##\s*Plano de implementação/i.test(newMarkdown)) {
      newMarkdown = newMarkdown.trim() + '\n\n## Plano de implementação\n_A ser preenchido pelo comando /plan dentro da IDE._\n';
    }

    return {
      ...task,
      code: newCode,
      dependsOn: newDependsOn,
      markdown: newMarkdown,
    };
  });
}

/**
 * Backward compatibility alias
 */
export const reorderAndRenumberTasks = renumberTasks;
