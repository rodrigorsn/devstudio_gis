import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  ProjectData,
  StageId,
  StageStatus,
  ChatMessage,
  FeatureItem,
  TaskItem,
  ADRItem,
  STAGES_LIST,
  SkillItem,
} from '../types/spec';
import { createDemoProject, createEmptyProject, parseStatusMd } from '../utils/demoData';
import { renumberTasks, reorderAndRenumberTasks } from '../utils/taskRenumbering';
import { generateTelasMarkdown } from '../utils/telasGenerator';
import { DEFAULT_DEMO_SKILLS } from '../utils/exportTemplates';

const LOCAL_STORAGE_KEY = 'spec_studio_project_v2';

interface ProjectContextValue {
  project: ProjectData;
  activeStageId: StageId;
  setActiveStageId: (id: StageId) => void;
  // Stage Workflow
  approveStage: (stageId: StageId) => void;
  reopenStage: (stageId: StageId) => void;
  // Chat
  addChatMessage: (stageId: StageId, message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  clearStageChat: (stageId: StageId) => void;
  // Document
  updateStageDocument: (stageId: StageId, content: string) => void;
  updateAgentsMd: (content: string) => void;
  // Skills
  setSkillsList: (skills: SkillItem[]) => void;
  updateSkill: (slug: string, data: Partial<SkillItem>) => void;
  // Features (Stage 4)
  setFeaturesList: (features: FeatureItem[]) => void;
  updateFeature: (featureId: string, data: Partial<FeatureItem>) => void;
  updateFeaturePages: (featureId: string, pages: any[]) => void;
  addFeature: (feature: FeatureItem) => void;
  removeFeature: (featureId: string) => void;
  reorderFeatures: (startIndex: number, endIndex: number) => void;
  selectedFeatureId: string | undefined;
  setSelectedFeatureId: (id: string | undefined) => void;
  // Tasks (Stage 6)
  setTasksList: (tasks: TaskItem[]) => void;
  updateTask: (taskId: string, data: Partial<TaskItem>) => void;
  addTask: (task: TaskItem) => void;
  removeTask: (taskId: string) => void;
  toggleTaskCompleted: (taskId: string) => void;
  selectedTaskId: string | undefined;
  setSelectedTaskId: (id: string | undefined) => void;
  // Architecture ADRs (Stage 3)
  setAdrsList: (adrs: ADRItem[]) => void;
  // Verification Checklist (Stage 8)
  toggleVerificationCheck: (checkKey: string) => void;
  // Import/Export & Reset
  importStatusMarkdown: (markdown: string) => { completedCount: number; pendingCount: number };
  resetToNewProject: (name?: string) => void;
  loadDemo: () => void;
  updateProjectName: (name: string) => void;
  // Helpers
  getApprovedDocsContext: () => Record<string, string>;
  isStageAccessible: (stageId: StageId) => boolean;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [project, setProject] = useState<ProjectData>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.features)) {
          parsed.features = parsed.features.map((f: any) => ({
            ...f,
            pages: Array.isArray(f.pages) ? f.pages : [],
          }));
        }
        if (parsed && Array.isArray(parsed.tasks)) {
          parsed.tasks = parsed.tasks.map((task: any) => ({
            ...task,
            kind: task.kind === 'prototype' ? 'prototype' : 'functional',
            dependsOn: Array.isArray(task.dependsOn) ? task.dependsOn : [],
          }));
          parsed.tasks = renumberTasks(parsed);
        }
        if (parsed && (!Array.isArray(parsed.skills) || parsed.skills.length === 0)) {
          parsed.skills = DEFAULT_DEMO_SKILLS;
        }
        return parsed;
      }
    } catch (e) {
      console.error('Failed to load project from localStorage:', e);
    }
    // Start with demo project so user sees a rich working project immediately, or can reset
    const demo = createDemoProject();
    demo.tasks = renumberTasks(demo);
    return demo;
  });

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(project));
    } catch (e) {
      console.error('Failed to persist project:', e);
    }
  }, [project]);

  const activeStageId = project.activeStageId;

  const setActiveStageId = (id: StageId) => {
    setProject((prev) => ({
      ...prev,
      activeStageId: id,
      updatedAt: Date.now(),
    }));
  };

  const isStageAccessible = (stageId: StageId): boolean => {
    const stage = project.stages[stageId];
    return stage?.status !== 'locked';
  };

  // Helper to gather all approved documents as a context map
  const getApprovedDocsContext = (): Record<string, string> => {
    const context: Record<string, string> = {};

    if (project.stages.brainstorm.status === 'completed' && project.stages.brainstorm.documentContent) {
      context['docs/00-brainstorm.md'] = project.stages.brainstorm.documentContent;
    }
    if (project.stages.prd.status === 'completed' && project.stages.prd.documentContent) {
      context['docs/01-prd.md'] = project.stages.prd.documentContent;
    }
    if (project.stages.architecture.status === 'completed' && project.stages.architecture.documentContent) {
      context['docs/02-arquitetura.md'] = project.stages.architecture.documentContent;
      project.adrs.forEach((adr) => {
        context[`docs/adr/${adr.filename}`] = adr.content;
      });
    }
    if (project.stages.features.status === 'completed') {
      project.features.forEach((feat) => {
        if (feat.specMarkdown) {
          context[`docs/specs/${feat.slug}/spec.md`] = feat.specMarkdown;
        }
      });
    }
    if (project.stages.screens.status === 'completed') {
      project.features.forEach((feat) => {
        if (feat.screensMarkdown) {
          context[`docs/specs/${feat.slug}/telas.md`] = feat.screensMarkdown;
        }
      });
    }
    if (project.stages.tasks.status === 'completed') {
      project.tasks.forEach((task) => {
        if (task.markdown) {
          context[`docs/tasks/${task.featureSlug}/${task.code}.md`] = task.markdown;
        }
      });
    }

    return context;
  };

  // Approve a stage and unlock next stage
  const approveStage = (stageId: StageId) => {
    setProject((prev) => {
      const stageIndex = STAGES_LIST.findIndex((s) => s.id === stageId);
      const nextStage = STAGES_LIST[stageIndex + 1];

      const newStages = { ...prev.stages };

      // Mark current stage as completed
      newStages[stageId] = {
        ...newStages[stageId],
        status: 'completed',
        approvedAt: Date.now(),
        outdatedWarning: false,
      };

      // If next stage exists and was locked or pending, make it in_progress
      if (nextStage) {
        newStages[nextStage.id] = {
          ...newStages[nextStage.id],
          status: newStages[nextStage.id].status === 'completed' ? 'completed' : 'in_progress',
        };
      }

      return {
        ...prev,
        stages: newStages,
        activeStageId: nextStage ? nextStage.id : stageId,
        updatedAt: Date.now(),
      };
    });
  };

  // Reopen stage: marks subsequent stages with outdatedWarning
  const reopenStage = (stageId: StageId) => {
    setProject((prev) => {
      const stageIndex = STAGES_LIST.findIndex((s) => s.id === stageId);
      const newStages = { ...prev.stages };

      // Mark current as in_progress
      newStages[stageId] = {
        ...newStages[stageId],
        status: 'in_progress',
      };

      // Mark all subsequent completed stages with outdatedWarning
      for (let i = stageIndex + 1; i < STAGES_LIST.length; i++) {
        const nextId = STAGES_LIST[i].id;
        if (newStages[nextId]) {
          newStages[nextId] = {
            ...newStages[nextId],
            outdatedWarning: true,
          };
        }
      }

      return {
        ...prev,
        stages: newStages,
        activeStageId: stageId,
        updatedAt: Date.now(),
      };
    });
  };

  // Add chat message
  const addChatMessage = (stageId: StageId, message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    setProject((prev) => {
      const stage = prev.stages[stageId];
      if (!stage) return prev;

      const newMsg: ChatMessage = {
        ...message,
        id: 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
        timestamp: Date.now(),
      };

      return {
        ...prev,
        stages: {
          ...prev.stages,
          [stageId]: {
            ...stage,
            chatHistory: [...stage.chatHistory, newMsg],
          },
        },
        updatedAt: Date.now(),
      };
    });
  };

  const clearStageChat = (stageId: StageId) => {
    setProject((prev) => {
      const stage = prev.stages[stageId];
      if (!stage) return prev;
      return {
        ...prev,
        stages: {
          ...prev.stages,
          [stageId]: {
            ...stage,
            chatHistory: [],
          },
        },
      };
    });
  };

  // Update stage document content
  const updateStageDocument = (stageId: StageId, content: string) => {
    setProject((prev) => {
      const stage = prev.stages[stageId];
      if (!stage) return prev;
      return {
        ...prev,
        stages: {
          ...prev.stages,
          [stageId]: {
            ...stage,
            documentContent: content,
          },
        },
        updatedAt: Date.now(),
      };
    });
  };

  const updateAgentsMd = (content: string) => {
    setProject((prev) => ({
      ...prev,
      agentsMd: content,
      updatedAt: Date.now(),
    }));
  };

  const setSkillsList = (skills: SkillItem[]) => {
    setProject((prev) => ({
      ...prev,
      skills,
      updatedAt: Date.now(),
    }));
  };

  const updateSkill = (slug: string, data: Partial<SkillItem>) => {
    setProject((prev) => {
      const skills = [...(prev.skills || [])];
      const index = skills.findIndex((s) => s.slug === slug);
      if (index >= 0) {
        skills[index] = { ...skills[index], ...data };
      }
      return {
        ...prev,
        skills,
        updatedAt: Date.now(),
      };
    });
  };

  // Features
  const setFeaturesList = (features: FeatureItem[]) => {
    setProject((prev) => {
      const renumberedTasks = reorderAndRenumberTasks(prev.tasks, features);
      return {
        ...prev,
        features,
        tasks: renumberedTasks,
        selectedFeatureId: features[0]?.id || prev.selectedFeatureId,
        updatedAt: Date.now(),
      };
    });
  };

  const updateFeature = (featureId: string, data: Partial<FeatureItem>) => {
    setProject((prev) => ({
      ...prev,
      features: prev.features.map((f) => {
        if (f.id !== featureId) return f;
        const updated = { ...f, ...data };
        if (data.pages && !data.screensMarkdown) {
          updated.screensMarkdown = generateTelasMarkdown(data.pages, updated.title);
        }
        return updated;
      }),
      updatedAt: Date.now(),
    }));
  };

  const updateFeaturePages = (featureId: string, pages: any[]) => {
    setProject((prev) => ({
      ...prev,
      features: prev.features.map((f) => {
        if (f.id !== featureId) return f;
        return {
          ...f,
          pages,
          screensMarkdown: generateTelasMarkdown(pages, f.title),
        };
      }),
      updatedAt: Date.now(),
    }));
  };

  const addFeature = (feature: FeatureItem) => {
    setProject((prev) => {
      const newFeatures = [...prev.features, feature];
      const renumberedTasks = reorderAndRenumberTasks(prev.tasks, newFeatures);
      return {
        ...prev,
        features: newFeatures,
        tasks: renumberedTasks,
        selectedFeatureId: feature.id,
        updatedAt: Date.now(),
      };
    });
  };

  const removeFeature = (featureId: string) => {
    setProject((prev) => {
      const updated = prev.features.filter((f) => f.id !== featureId);
      const remainingTasks = prev.tasks.filter((t) => t.featureSlug !== prev.features.find((f) => f.id === featureId)?.slug);
      const renumberedTasks = reorderAndRenumberTasks(remainingTasks, updated);
      return {
        ...prev,
        features: updated,
        tasks: renumberedTasks,
        selectedFeatureId: updated[0]?.id,
        updatedAt: Date.now(),
      };
    });
  };

  const reorderFeatures = (startIndex: number, endIndex: number) => {
    setProject((prev) => {
      const list = [...prev.features];
      const [removed] = list.splice(startIndex, 1);
      list.splice(endIndex, 0, removed);
      const renumberedTasks = reorderAndRenumberTasks(prev.tasks, list);
      return {
        ...prev,
        features: list,
        tasks: renumberedTasks,
        updatedAt: Date.now(),
      };
    });
  };

  // Tasks
  const setTasksList = (tasks: TaskItem[]) => {
    setProject((prev) => {
      const renumberedTasks = reorderAndRenumberTasks(tasks, prev.features);
      return {
        ...prev,
        tasks: renumberedTasks,
        selectedTaskId: renumberedTasks[0]?.id || prev.selectedTaskId,
        updatedAt: Date.now(),
      };
    });
  };

  const updateTask = (taskId: string, data: Partial<TaskItem>) => {
    setProject((prev) => {
      const updatedList = prev.tasks.map((t) => (t.id === taskId ? { ...t, ...data } : t));
      return {
        ...prev,
        tasks: updatedList,
        updatedAt: Date.now(),
      };
    });
  };

  const addTask = (task: TaskItem) => {
    setProject((prev) => {
      const combined = [...prev.tasks, task];
      const renumberedTasks = reorderAndRenumberTasks(combined, prev.features);
      return {
        ...prev,
        tasks: renumberedTasks,
        selectedTaskId: task.id,
        updatedAt: Date.now(),
      };
    });
  };

  const removeTask = (taskId: string) => {
    setProject((prev) => {
      const updated = prev.tasks.filter((t) => t.id !== taskId);
      const renumberedTasks = reorderAndRenumberTasks(updated, prev.features);
      return {
        ...prev,
        tasks: renumberedTasks,
        selectedTaskId: renumberedTasks[0]?.id,
        updatedAt: Date.now(),
      };
    });
  };

  const toggleTaskCompleted = (taskId: string) => {
    setProject((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t)),
      updatedAt: Date.now(),
    }));
  };

  // ADRs
  const setAdrsList = (adrs: ADRItem[]) => {
    setProject((prev) => ({
      ...prev,
      adrs,
      updatedAt: Date.now(),
    }));
  };

  // Verification
  const toggleVerificationCheck = (checkKey: string) => {
    setProject((prev) => ({
      ...prev,
      verificationChecks: {
        ...prev.verificationChecks,
        [checkKey]: !prev.verificationChecks[checkKey],
      },
      updatedAt: Date.now(),
    }));
  };

  // Import STATUS.md
  const importStatusMarkdown = (markdown: string) => {
    const { completedCodes, pendingCodes } = parseStatusMd(markdown);

    let completedCount = 0;
    let pendingCount = 0;

    project.tasks.forEach((task) => {
      const codeUpper = task.code.toUpperCase();
      if (completedCodes.has(codeUpper)) {
        completedCount++;
      } else if (pendingCodes.has(codeUpper)) {
        pendingCount++;
      }
    });

    setProject((prev) => {
      const updatedTasks = prev.tasks.map((task) => {
        const codeUpper = task.code.toUpperCase();
        if (completedCodes.has(codeUpper)) {
          return { ...task, completed: true };
        } else if (pendingCodes.has(codeUpper)) {
          return { ...task, completed: false };
        }
        return task;
      });

      return {
        ...prev,
        tasks: updatedTasks,
        updatedAt: Date.now(),
      };
    });

    return { completedCount, pendingCount };
  };

  // Reset
  const resetToNewProject = (name = 'Novo Projeto SDD') => {
    const fresh = createEmptyProject(name);
    setProject(fresh);
  };

  const loadDemo = () => {
    const demo = createDemoProject();
    demo.tasks = renumberTasks(demo);
    setProject(demo);
  };

  const updateProjectName = (name: string) => {
    setProject((prev) => ({
      ...prev,
      name,
      updatedAt: Date.now(),
    }));
  };

  return (
    <ProjectContext.Provider
      value={{
        project,
        activeStageId,
        setActiveStageId,
        approveStage,
        reopenStage,
        addChatMessage,
        clearStageChat,
        updateStageDocument,
        updateAgentsMd,
        setSkillsList,
        updateSkill,
        setFeaturesList,
        updateFeature,
        updateFeaturePages,
        addFeature,
        removeFeature,
        reorderFeatures,
        selectedFeatureId: project.selectedFeatureId || project.features[0]?.id,
        setSelectedFeatureId: (id) =>
          setProject((prev) => ({ ...prev, selectedFeatureId: id })),
        setTasksList,
        updateTask,
        addTask,
        removeTask,
        toggleTaskCompleted,
        selectedTaskId: project.selectedTaskId || project.tasks[0]?.id,
        setSelectedTaskId: (id) =>
          setProject((prev) => ({ ...prev, selectedTaskId: id })),
        setAdrsList,
        toggleVerificationCheck,
        importStatusMarkdown,
        resetToNewProject,
        loadDemo,
        updateProjectName,
        getApprovedDocsContext,
        isStageAccessible,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};
