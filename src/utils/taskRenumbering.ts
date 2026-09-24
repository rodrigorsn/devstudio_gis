import { FeatureItem, TaskItem, TaskKind } from '../types/spec';

/**
 * Re-orders and renumbers project tasks:
 * 1. Resolves `dependsOn` (which initially uses temporary codes like "T001" per feature)
 *    to unique task IDs by looking first in the SAME feature, then in other features.
 * 2. Groups by kind: all 'prototype' first, then all 'functional'.
 * 3. Within each group: by the order of features in the project.
 * 4. Within the same feature: preserves the original relative order.
 * 5. Renumbers sequentially (T001, T002...), mapping dependency IDs to the new codes.
 * 6. Updates task.code, task.dependsOn, and markdown (header # T00X — and **Depende de:** line)
 *    without chained string replacements that corrupt markdown.
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
    tasks = projectOrTasks?.tasks || [];
    features = projectOrTasks?.features || [];
  }

  if (!tasks || tasks.length === 0) return [];

  // Ensure every task has a defined id, normalized kind, and copy of dependsOn
  const tasksWithId = tasks.map((task, idx) => ({
    ...task,
    id: task.id || `task_${idx}_${task.code || 'code'}`,
    kind: (task.kind === 'prototype' ? 'prototype' : 'functional') as TaskKind,
    dependsOn: Array.isArray(task.dependsOn) ? [...task.dependsOn] : [],
  }));

  // Step 1: Map each task's dependsOn references to task IDs before sorting.
  // Search first in the SAME feature; only if not found, in other features.
  const tasksWithDepIds = tasksWithId.map((t) => {
    const dependencyIds: string[] = (t.dependsOn || []).map((dep) => {
      if (!dep) return dep;

      // If dep already matches an existing task id directly
      const byId = tasksWithId.find((other) => other.id === dep);
      if (byId) return byId.id;

      const depClean = dep.trim().toUpperCase();

      // 1. Search in the SAME feature
      const sameFeature = tasksWithId.find(
        (other) =>
          other.featureSlug === t.featureSlug &&
          other.id !== t.id &&
          other.code.trim().toUpperCase() === depClean
      );
      if (sameFeature) return sameFeature.id;

      // 2. Search in other features
      const otherFeature = tasksWithId.find(
        (other) =>
          other.id !== t.id &&
          other.code.trim().toUpperCase() === depClean
      );
      if (otherFeature) return otherFeature.id;

      return dep;
    });

    return {
      task: t,
      dependencyIds,
    };
  });

  // Create map of featureSlug -> feature order index
  const featureOrderMap = new Map<string, number>();
  features.forEach((feat, index) => {
    featureOrderMap.set(feat.slug, index);
  });

  // Step 2: Prepare indexed tasks for sorting
  const indexedTasks = tasksWithDepIds.map((item, originalIndex) => {
    const kindPriority = item.task.kind === 'prototype' ? 0 : 1;
    const featureOrder = featureOrderMap.has(item.task.featureSlug)
      ? featureOrderMap.get(item.task.featureSlug)!
      : 9999;

    return {
      ...item,
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

  // Step 3: Create mapping of task.id -> newCode (T001, T002...)
  const idToNewCodeMap = new Map<string, string>();
  indexedTasks.forEach((item, idx) => {
    const newCode = `T${String(idx + 1).padStart(3, '0')}`;
    idToNewCodeMap.set(item.task.id, newCode);
  });

  // Step 4: Build final tasks with updated codes, dependsOn, and markdown
  return indexedTasks.map((item, idx) => {
    const task = item.task;
    const newCode = `T${String(idx + 1).padStart(3, '0')}`;

    // Convert dependency IDs to new sequential codes
    const finalDependsOn = item.dependencyIds.map((depId) => {
      return idToNewCodeMap.get(depId) || depId;
    });

    let newMarkdown = task.markdown || '';
    const tipoLabel = task.kind === 'prototype' ? 'Protótipo visual' : 'Funcional';
    const dependsText =
      finalDependsOn.length > 0 ? finalDependsOn.join(', ') : 'Nenhuma (tarefa inicial)';

    // Rewrite header "# T00X —" with the new code
    if (/^#\s*T\d{3,4}\s*—/m.test(newMarkdown)) {
      newMarkdown = newMarkdown.replace(/^#\s*T\d{3,4}\s*—/m, `# ${newCode} —`);
    } else if (/^#\s*T\d{3,4}\b/m.test(newMarkdown)) {
      newMarkdown = newMarkdown.replace(/^#\s*T\d{3,4}\b/m, `# ${newCode}`);
    } else if (!/^#\s+/m.test(newMarkdown)) {
      newMarkdown = `# ${newCode} — ${task.title}\n\n` + newMarkdown;
    }

    // Strip out previous Tipo and Depende de lines to avoid duplication
    newMarkdown = newMarkdown.replace(/^\*\*Tipo:\*\*[^\n]*\n?/gm, '');
    newMarkdown = newMarkdown.replace(/^\*\*Depende de:\*\*[^\n]*\n?/gm, '');

    // Insert Tipo and Depende de right below **Feature:** if present, or below header
    if (/\*\*Feature:\*\*([^\n]*)/i.test(newMarkdown)) {
      newMarkdown = newMarkdown.replace(
        /(\*\*Feature:\*\*[^\n]*)/i,
        `$1\n**Tipo:** ${tipoLabel}\n**Depende de:** ${dependsText}`
      );
    } else if (/^(#\s*[^\n]+\n)/m.test(newMarkdown)) {
      newMarkdown = newMarkdown.replace(
        /^(#\s*[^\n]+\n)/m,
        `$1**Tipo:** ${tipoLabel}\n**Depende de:** ${dependsText}\n`
      );
    } else {
      newMarkdown = `**Tipo:** ${tipoLabel}\n**Depende de:** ${dependsText}\n\n` + newMarkdown;
    }

    // Rename section: "Arquivos que pode criar/alterar" -> "Arquivos prováveis (confirmar no /plan)"
    newMarkdown = newMarkdown.replace(
      /##\s*Arquivos que pode criar\/alterar/gi,
      '## Arquivos prováveis (confirmar no /plan)'
    );

    // Ensure "## Plano de implementação" at the end
    if (!/##\s*Plano de implementação/i.test(newMarkdown)) {
      newMarkdown =
        newMarkdown.trim() +
        '\n\n## Plano de implementação\n_A ser preenchido pelo comando /plan dentro da IDE._\n';
    }

    return {
      ...task,
      code: newCode,
      dependsOn: finalDependsOn,
      markdown: newMarkdown,
    };
  });
}

/**
 * Backward compatibility alias
 */
export const reorderAndRenumberTasks = renumberTasks;
