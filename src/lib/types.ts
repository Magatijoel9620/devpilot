export type TaskStatus = 'inbox' | 'todo' | 'in_progress' | 'blocked' | 'done' | 'cancelled';
export type Priority = 'low' | 'normal' | 'high' | 'urgent';
export type Stage = 'planning' | 'development' | 'testing' | 'release' | 'maintenance';
export type ProjectStatus = 'active' | 'paused' | 'completed' | 'archived';
export interface Project { id: string; name: string; color: string; status: ProjectStatus; description: string; lastAction: string; nextAction: string; createdAt: string; }
export interface Task { id: string; title: string; description: string; projectId: string | null; parentId: string | null; status: TaskStatus; priority: Priority; stage: Stage; dueDate: string; estimate: number; impact: number; nextAction: string; checklist: { id: string; title: string; done: boolean }[]; dependsOn: string[]; createdAt: string; completedAt?: string; }
export interface WorkSession { id: string; taskId: string; startedAt: string; endedAt?: string; notes: string; }
export interface Note { id: string; projectId: string; title: string; content: string; createdAt: string; }
export interface Release { id: string; projectId: string; version: string; status: 'planning' | 'testing' | 'ready' | 'deployed'; targetDate: string; notes: string; checklist: { id: string; title: string; done: boolean }[]; }
export interface DailyPlan { date: string; availableMinutes: number; bufferMinutes: number; taskIds: string[]; estimates: Record<string, number>; }
export interface WorkspacePreferences { availableHours: number; bufferMinutes: number; }
export interface AppData { projects: Project[]; tasks: Task[]; sessions: WorkSession[]; notes: Note[]; releases: Release[]; plans: Record<string, DailyPlan>; preferences?: WorkspacePreferences; }
