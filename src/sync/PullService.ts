/**
 * Pulls task completion status from Todoist.
 * Marks local tasks as done when completed in Todoist.
 */

import { TodoistClient } from "../todoist/TodoistClient";
import { TaskParser } from "../parser/TaskParser";
import { TaskFormatter } from "../parser/TaskFormatter";

interface PullResult {
  content: string;
  completedCount: number;
  errors: Array<{ taskTitle: string; error: string; lineNumber: number }>;
}

/**
 * Syncs completion status from Todoist back to Obsidian.
 * Only checks tasks that have a Todoist ID and aren't already completed.
 */
export class PullService {
  constructor(
    private client: TodoistClient,
    private parser: TaskParser,
    private formatter: TaskFormatter
  ) {}

  /**
   * Checks each synced task's completion status in Todoist.
   * Marks tasks as done locally if completed in Todoist.
   * @param content - Markdown file content
   * @returns Updated content and sync statistics
   */
  async pullCompletions(content: string): Promise<PullResult> {
    const lines = content.split("\n");
    const tasks = this.parser.parseContent(content);
    // Only check incomplete tasks that have been synced (have Todoist ID)
    const tasksWithId = tasks.filter((t) => t.todoistId && !t.isCompleted);

    let completedCount = 0;
    const errors: PullResult["errors"] = [];

    const today = new Date().toISOString().split("T")[0];

    for (const task of tasksWithId) {
      try {
        const todoistTask = await this.client.getTask(task.todoistId!);

        if (todoistTask?.is_completed) {
          lines[task.lineNumber] = this.formatter.markCompleted(
            lines[task.lineNumber],
            today
          );
          completedCount++;
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
      completedCount,
      errors,
    };
  }
}
