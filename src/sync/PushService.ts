/**
 * Pushes tasks from Obsidian to Todoist.
 * Creates new tasks and updates existing ones based on tag mappings.
 */

import { TodoistClient } from "../todoist/TodoistClient";
import { TaskParser } from "../parser/TaskParser";
import { TaskFormatter } from "../parser/TaskFormatter";
import { ParsedTask, Settings, TodoistPriority } from "../models/types";

interface PushResult {
  content: string;
  createdCount: number;
  updatedCount: number;
  errors: Array<{ taskTitle: string; error: string; lineNumber: number }>;
}

/**
 * Syncs tasks from Obsidian to Todoist.
 * Uses tag mappings to determine which project receives each task.
 * Preserves task hierarchy when creating sub-tasks.
 */
export class PushService {
  constructor(
    private client: TodoistClient,
    private parser: TaskParser,
    private formatter: TaskFormatter,
    private settings: Settings
  ) {}

  /**
   * Syncs incomplete tasks to Todoist.
   * Creates new tasks, updates existing ones, and handles deleted task recovery.
   * @param content - Markdown file content
   * @returns Updated content (with new IDs) and sync statistics
   */
  async pushTasks(content: string): Promise<PushResult> {
    const lines = content.split("\n");
    const tasks = this.parser.parseContent(content);
    const incompleteTasks = tasks.filter((t) => !t.isCompleted);

    let createdCount = 0;
    let updatedCount = 0;
    const errors: PushResult["errors"] = [];

    // Track Todoist IDs by line number for parent lookups
    const taskIdMap = new Map<number, string>();

    // Process parents before children so we have their IDs
    const sortedTasks = this.sortByHierarchy(incompleteTasks);

    for (const task of sortedTasks) {
      const projectId = this.getProjectId(task);
      // Skip tasks without a matching tag mapping
      if (!projectId) continue;

      try {
        const parentTodoistId = this.findParentTodoistId(
          task,
          incompleteTasks,
          taskIdMap
        );

        if (task.todoistId) {
          try {
            await this.client.updateTask(task.todoistId, {
              content: task.title,
              priority: task.priority,
              due_date: task.dueDate || task.scheduledDate || undefined,
            });
            taskIdMap.set(task.lineNumber, task.todoistId);
            updatedCount++;
          } catch (error) {
            // Task was deleted in Todoist - recreate it
            if (error instanceof Error && error.message.includes("404")) {
              const newTask = await this.createTask(task, projectId, parentTodoistId);
              lines[task.lineNumber] = this.formatter.appendTodoistId(
                lines[task.lineNumber],
                newTask.id
              );
              taskIdMap.set(task.lineNumber, newTask.id);
              createdCount++;
            } else {
              throw error;
            }
          }
        } else {
          const newTask = await this.createTask(task, projectId, parentTodoistId);
          lines[task.lineNumber] = this.formatter.appendTodoistId(
            lines[task.lineNumber],
            newTask.id
          );
          taskIdMap.set(task.lineNumber, newTask.id);
          createdCount++;
        }
      } catch (error) {
        // Continue with other tasks even if one fails
        errors.push({
          taskTitle: task.title,
          error: error instanceof Error ? error.message : "Unknown error",
          lineNumber: task.lineNumber,
        });
      }
    }

    return {
      content: lines.join("\n"),
      createdCount,
      updatedCount,
      errors,
    };
  }

  private async createTask(
    task: ParsedTask,
    projectId: string,
    parentId: string | null
  ) {
    return this.client.createTask({
      content: task.title,
      project_id: projectId,
      priority: task.priority,
      due_date: task.dueDate || task.scheduledDate || undefined,
      parent_id: parentId || undefined,
    });
  }

  // Returns project ID for first matching tag, or null if no mapping
  private getProjectId(task: ParsedTask): string | null {
    for (const mapping of this.settings.tagMappings) {
      if (task.tags.includes(mapping.tag)) {
        return mapping.projectId;
      }
    }
    return null;
  }

  // Sort by indent level so parents are processed before children
  private sortByHierarchy(tasks: ParsedTask[]): ParsedTask[] {
    return [...tasks].sort((a, b) => a.indentLevel - b.indentLevel);
  }

  /**
   * Finds the Todoist ID of the parent task for hierarchy preservation.
   * Walks backward through lines to find the nearest task with lower indent.
   */
  private findParentTodoistId(
    task: ParsedTask,
    allTasks: ParsedTask[],
    taskIdMap: Map<number, string>
  ): string | null {
    // Top-level tasks have no parent
    if (task.indentLevel === 0) return null;

    // Walk backward to find parent (first task with lower indent)
    for (let i = task.lineNumber - 1; i >= 0; i--) {
      const potentialParent = allTasks.find((t) => t.lineNumber === i);
      if (potentialParent && potentialParent.indentLevel < task.indentLevel) {
        // Use newly assigned ID if parent was just created, else existing ID
        return taskIdMap.get(potentialParent.lineNumber) || potentialParent.todoistId;
      }
    }

    return null;
  }
}
