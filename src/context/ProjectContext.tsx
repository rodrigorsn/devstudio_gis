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
} from '../types/spec';
import { createDemoProject, createEmptyProject, parseStatusMd } from '../utils/demoData';

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
  // Features (Stage 4)
  setFeaturesList: (features: FeatureItem[]) => void;
  updateFeature: (featureId: string, data: Partial<FeatureItem>) => void;
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
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load project from localStorage:', e);
    }
    // Start with demo project so user sees a rich working project immediately, or can reset
    return createDemoProject();
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

  // Features
  const setFeaturesList = (features: FeatureItem[]) => {
    setProject((prev) => ({
      ...prev,
      features,
      selectedFeatureId: features[0]?.id || prev.selectedFeatureId,
      updatedAt: Date.now(),
    }));
  };

  const updateFeature = (featureId: string, data: Partial<FeatureItem>) => {
    setProject((prev) => ({
      ...prev,
      features: prev.features.map((f) => (f.id === featureId ? { ...f, ...data } : f)),
      updatedAt: Date.now(),
    }));
  };

  const addFeature = (feature: FeatureItem) => {
    setProject((prev) => ({
      ...prev,
      features: [...prev.features, feature],
      selectedFeatureId: feature.id,
      updatedAt: Date.now(),
    }));
  };

  const removeFeature = (featureId: string) => {
    setProject((prev) => {
      const updated = prev.features.filter((f) => f.id !== featureId);
      return {
        ...prev,
        features: updated,
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
      return {
        ...prev,
        features: list,
        updatedAt: Date.now(),
      };
    });
  };

  // Tasks
  const setTasksList = (tasks: TaskItem[]) => {
    setProject((prev) => ({
      ...prev,
      tasks,
      selectedTaskId: tasks[0]?.id || prev.selectedTaskId,
      updatedAt: Date.now(),
    }));
  };

  const updateTask = (taskId: string, data: Partial<TaskItem>) => {
    setProject((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => (t.id === taskId ? { ...t, ...data } : t)),
      updatedAt: Date.now(),
    }));
  };

  const addTask = (task: TaskItem) => {
    setProject((prev) => ({
      ...prev,
      tasks: [...prev.tasks, task],
      selectedTaskId: task.id,
      updatedAt: Date.now(),
    }));
  };

  const removeTask = (taskId: string) => {
    setProject((prev) => {
      const updated = prev.tasks.filter((t) => t.id !== taskId);
      return {
        ...prev,
        tasks: updated,
        selectedTaskId: updated[0]?.id,
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

    setProject((prev) => {
      const updatedTasks = prev.tasks.map((task) => {
        const codeUpper = task.code.toUpperCase();
        if (completedCodes.has(codeUpper)) {
          completedCount++;
          return { ...task, completed: true };
        } else if (pendingCodes.has(codeUpper)) {
          pendingCount++;
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
        setFeaturesList,
        updateFeature,
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
