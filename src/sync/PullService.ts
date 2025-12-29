import { TodoistClient } from "../todoist/TodoistClient";
import { TaskParser } from "../parser/TaskParser";
import { TaskFormatter } from "../parser/TaskFormatter";

interface PullResult {
  content: string;
  completedCount: number;
  errors: Array<{ taskTitle: string; error: string; lineNumber: number }>;
}

export class PullService {
  constructor(
    private client: TodoistClient,
    private parser: TaskParser,
    private formatter: TaskFormatter
  ) {}

  async pullCompletions(content: string): Promise<PullResult> {
    const lines = content.split("\n");
    const tasks = this.parser.parseContent(content);
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
