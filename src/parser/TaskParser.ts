import { ParsedTask } from "../models/types";

export class TaskParser {
  private readonly TASK_REGEX = /^(\s*)- \[([ xX])\] (.+)$/;
  private readonly INDENT_SIZE = 4;

  parseLine(line: string, lineNumber: number): ParsedTask | null {
    const match = line.match(this.TASK_REGEX);
    if (!match) {
      return null;
    }

    const [, indent, checkbox, content] = match;
    const isCompleted = checkbox.toLowerCase() === "x";
    const indentLevel = this.calculateIndentLevel(indent);

    return {
      lineNumber,
      rawText: line,
      title: content.trim(),
      tags: [],
      dueDate: null,
      scheduledDate: null,
      priority: 4,
      todoistId: null,
      indentLevel,
      isCompleted,
    };
  }

  private calculateIndentLevel(indent: string): number {
    const spaces = indent.replace(/\t/g, "    ").length;
    return Math.floor(spaces / this.INDENT_SIZE);
  }
}
