export class TaskFormatter {
  private readonly TODOIST_ID_REGEX = /\s*🆔\s*\S+/g;

  appendTodoistId(line: string, todoistId: string): string {
    const cleanLine = this.removeTodoistId(line);
    return `${cleanLine} 🆔 ${todoistId}`;
  }

  markCompleted(line: string, completionDate: string): string {
    let result = line
      .replace("- [ ]", "- [x]")
      .replace(this.TODOIST_ID_REGEX, "");

    result = result.trimEnd() + ` ✅ ${completionDate}`;
    return result;
  }

  removeTodoistId(line: string): string {
    return line.replace(this.TODOIST_ID_REGEX, "").trimEnd();
  }
}
