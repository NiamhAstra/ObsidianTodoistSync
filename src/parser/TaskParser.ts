import { ParsedTask, TodoistPriority } from "../models/types";

export class TaskParser {
  private readonly TASK_REGEX = /^(\s*)- \[([ xX])\] (.+)$/;
  private readonly INDENT_SIZE = 4;

  private readonly DUE_DATE_REGEX = /📅\s*(\d{4}-\d{2}-\d{2})/;
  private readonly SCHEDULED_DATE_REGEX = /⏳\s*(\d{4}-\d{2}-\d{2})/;
  private readonly TODOIST_ID_REGEX = /🆔\s*(\S+)/;
  private readonly TAG_REGEX = /#[\w-]+/g;
  private readonly WIKI_LINK_REGEX = /\[\[([^\]]+)\]\]/g;
  private readonly RECURRENCE_REGEX = /🔁\s*\S+/g;

  private readonly PRIORITY_MAP: Record<string, TodoistPriority> = {
    "⏫": 1,
    "🔼": 2,
    "🔽": 4,
    "⏬": 4,
  };

  parseContent(content: string): ParsedTask[] {
    const lines = content.split("\n");
    const tasks: ParsedTask[] = [];

    for (let i = 0; i < lines.length; i++) {
      const task = this.parseLine(lines[i], i);
      if (task) {
        tasks.push(task);
      }
    }

    return tasks;
  }

  parseLine(line: string, lineNumber: number): ParsedTask | null {
    const match = line.match(this.TASK_REGEX);
    if (!match) {
      return null;
    }

    const [, indent, checkbox, content] = match;
    const isCompleted = checkbox.toLowerCase() === "x";
    const indentLevel = this.calculateIndentLevel(indent);

    const dueDate = this.extractDueDate(content);
    const scheduledDate = this.extractScheduledDate(content);
    const todoistId = this.extractTodoistId(content);
    const tags = this.extractTags(content);
    const priority = this.extractPriority(content);
    const title = this.cleanTitle(content);

    return {
      lineNumber,
      rawText: line,
      title,
      tags,
      dueDate,
      scheduledDate,
      priority,
      todoistId,
      indentLevel,
      isCompleted,
    };
  }

  private calculateIndentLevel(indent: string): number {
    const spaces = indent.replace(/\t/g, "    ").length;
    return Math.floor(spaces / this.INDENT_SIZE);
  }

  private extractDueDate(content: string): string | null {
    const match = content.match(this.DUE_DATE_REGEX);
    return match ? match[1] : null;
  }

  private extractScheduledDate(content: string): string | null {
    const match = content.match(this.SCHEDULED_DATE_REGEX);
    return match ? match[1] : null;
  }

  private extractTodoistId(content: string): string | null {
    const match = content.match(this.TODOIST_ID_REGEX);
    return match ? match[1] : null;
  }

  private extractTags(content: string): string[] {
    const matches = content.match(this.TAG_REGEX);
    return matches || [];
  }

  private extractPriority(content: string): TodoistPriority {
    for (const [marker, priority] of Object.entries(this.PRIORITY_MAP)) {
      if (content.includes(marker)) {
        return priority;
      }
    }
    return 4;
  }

  private cleanTitle(content: string): string {
    let title = content
      .replace(this.DUE_DATE_REGEX, "")
      .replace(this.SCHEDULED_DATE_REGEX, "")
      .replace(this.TODOIST_ID_REGEX, "")
      .replace(this.TAG_REGEX, "")
      .replace(this.RECURRENCE_REGEX, "")
      .replace(this.WIKI_LINK_REGEX, "$1");

    for (const marker of Object.keys(this.PRIORITY_MAP)) {
      title = title.replace(marker, "");
    }

    return title.replace(/\s+/g, " ").trim();
  }
}
