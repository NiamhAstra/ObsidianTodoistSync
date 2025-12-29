/**
 * Modifies task lines to reflect sync state.
 * Handles adding/removing Todoist IDs and marking tasks complete.
 */

/**
 * Formats task lines for sync operations.
 * Preserves original formatting while adding/updating sync metadata.
 */
export class TaskFormatter {
  private readonly TODOIST_ID_REGEX = /\s*🆔\s*\S+/g;

  /**
   * Appends or replaces Todoist ID on a task line.
   * @param line - Original task line
   * @param todoistId - Todoist task ID to append
   * @returns Updated line with ID
   */
  appendTodoistId(line: string, todoistId: string): string {
    // Remove any existing ID first to avoid duplicates
    const cleanLine = this.removeTodoistId(line);
    return `${cleanLine} 🆔 ${todoistId}`;
  }

  /**
   * Marks a task as completed with Obsidian Tasks format.
   * Removes Todoist ID since completed tasks don't need sync tracking.
   * @param line - Original task line
   * @param completionDate - Date in YYYY-MM-DD format
   * @returns Completed task line
   */
  markCompleted(line: string, completionDate: string): string {
    let result = line
      .replace("- [ ]", "- [x]")
      .replace(this.TODOIST_ID_REGEX, "");

    result = result.trimEnd() + ` ✅ ${completionDate}`;
    return result;
  }

  /**
   * Removes Todoist ID from a task line.
   * @param line - Task line with ID
   * @returns Line without ID
   */
  removeTodoistId(line: string): string {
    return line.replace(this.TODOIST_ID_REGEX, "").trimEnd();
  }
}
