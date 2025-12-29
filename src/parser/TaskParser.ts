/**
 * Parses Obsidian markdown tasks into structured data.
 * Extracts metadata using Obsidian Tasks plugin emoji conventions.
 */

import { ParsedTask, TodoistPriority } from "../models/types";

/**
 * Parses markdown checkbox tasks and extracts Obsidian Tasks metadata.
 * Supports due dates, priorities, tags, and Todoist sync IDs.
 */
export class TaskParser {
  // Matches: "  - [ ] Task content" or "- [x] Done task"
  private readonly TASK_REGEX = /^(\s*)- \[([ xX])\] (.+)$/;
  private readonly INDENT_SIZE = 4;

  // Obsidian Tasks plugin emoji patterns
  private readonly DUE_DATE_REGEX = /📅\s*(\d{4}-\d{2}-\d{2})/;
  private readonly SCHEDULED_DATE_REGEX = /⏳\s*(\d{4}-\d{2}-\d{2})/;
  private readonly TODOIST_ID_REGEX = /🆔\s*(\S+)/;
  private readonly TAG_REGEX = /#[\w-]+/g;
  private readonly WIKI_LINK_REGEX = /\[\[([^\]]+)\]\]/g;
  // Stripped from title since Todoist has its own recurrence system
  private readonly RECURRENCE_REGEX = /🔁\s*\S+/g;

  // Maps Obsidian Tasks priority emojis to Todoist priorities
  // Note: Todoist has no "medium" (3) marker - tasks default to 4 (none)
  private readonly PRIORITY_MAP: Record<string, TodoistPriority> = {
    "⏫": 1, // Highest → Todoist P1
    "🔼": 2, // High → Todoist P2
    "🔽": 4, // Low → Todoist P4
    "⏬": 4, // Lowest → Todoist P4
  };

  /**
   * Parses all tasks from markdown content.
   * @param content - Full markdown file content
   * @returns Array of parsed tasks with line numbers
   */
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

  /**
   * Parses a single line as a task.
   * @param line - Single markdown line
   * @param lineNumber - Zero-based line index
   * @returns Parsed task or null if not a task
   */
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

  // Converts leading whitespace to indent level (tabs = 4 spaces)
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

  // Returns first matching priority, defaults to 4 (none)
  private extractPriority(content: string): TodoistPriority {
    for (const [marker, priority] of Object.entries(this.PRIORITY_MAP)) {
      if (content.includes(marker)) {
        return priority;
      }
    }
    return 4;
  }

  /**
   * Strips metadata from task content to get clean title for Todoist.
   * Removes dates, tags, priorities, IDs, and converts wiki links to plain text.
   */
  private cleanTitle(content: string): string {
    let title = content
      .replace(this.DUE_DATE_REGEX, "")
      .replace(this.SCHEDULED_DATE_REGEX, "")
      .replace(this.TODOIST_ID_REGEX, "")
      .replace(this.TAG_REGEX, "")
      .replace(this.RECURRENCE_REGEX, "")
      // Convert [[wiki links]] to plain text
      .replace(this.WIKI_LINK_REGEX, "$1");

    for (const marker of Object.keys(this.PRIORITY_MAP)) {
      title = title.replace(marker, "");
    }

    // Collapse multiple spaces and trim
    return title.replace(/\s+/g, " ").trim();
  }
}
