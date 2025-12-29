/**
 * Type definitions for the Obsidian-Todoist sync plugin.
 * Defines the data structures used throughout the sync process.
 */

/**
 * Represents a task parsed from Obsidian markdown.
 * Contains both the original text and extracted metadata for syncing.
 */
export interface ParsedTask {
  lineNumber: number;
  rawText: string;
  title: string;
  tags: string[];
  dueDate: string | null;
  scheduledDate: string | null;
  // Todoist uses 1-4 where 1 is highest priority (opposite of typical intuition)
  priority: TodoistPriority;
  // Present if task was previously synced to Todoist
  todoistId: string | null;
  // 0 = top-level, 1+ = nested under parent task
  indentLevel: number;
  isCompleted: boolean;
}

// Todoist priority: 1 = urgent (p1), 4 = no priority (p4)
export type TodoistPriority = 1 | 2 | 3 | 4;

/**
 * Todoist task as returned by the REST API.
 * Only includes fields we actually use.
 */
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

/**
 * Maps an Obsidian tag to a Todoist project.
 * First matching tag determines which project receives the task.
 */
export interface TagMapping {
  tag: string;
  projectId: string;
  // Stored for display in settings UI without re-fetching
  projectName: string;
}

/**
 * Plugin settings persisted to disk.
 */
export interface Settings {
  apiToken: string;
  tagMappings: TagMapping[];
}

export const DEFAULT_SETTINGS: Settings = {
  apiToken: "",
  tagMappings: [],
};

/**
 * Summary of a sync operation for user feedback.
 */
export interface SyncResult {
  created: number;
  updated: number;
  completed: number;
  failed: number;
  errors: SyncFailure[];
}

/**
 * Details about a failed task sync for debugging.
 */
export interface SyncFailure {
  taskTitle: string;
  error: string;
  lineNumber: number;
}

/**
 * Todoist project from the REST API.
 * Used to populate the project dropdown in settings.
 */
export interface TodoistProject {
  id: string;
  name: string;
}
