export interface ParsedTask {
  lineNumber: number;
  rawText: string;
  title: string;
  tags: string[];
  dueDate: string | null;
  scheduledDate: string | null;
  priority: TodoistPriority;
  todoistId: string | null;
  indentLevel: number;
  isCompleted: boolean;
}

export type TodoistPriority = 1 | 2 | 3 | 4;

export interface TodoistTask {
  id: string;
  content: string;
  description: string;
  project_id: string;
  priority: TodoistPriority;
  due: { date: string } | null;
  parent_id: string | null;
  is_completed: boolean;
}

export interface TagMapping {
  tag: string;
  projectId: string;
  projectName: string;
}

export interface Settings {
  apiToken: string;
  tagMappings: TagMapping[];
}

export const DEFAULT_SETTINGS: Settings = {
  apiToken: "",
  tagMappings: [],
};

export interface SyncResult {
  created: number;
  updated: number;
  completed: number;
  failed: number;
  errors: SyncFailure[];
}

export interface SyncFailure {
  taskTitle: string;
  error: string;
  lineNumber: number;
}

export interface TodoistProject {
  id: string;
  name: string;
}
