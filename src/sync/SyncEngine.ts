/**
 * Orchestrates the full sync process.
 * Coordinates pull (completions from Todoist) and push (tasks to Todoist).
 */

import { SyncResult } from "../models/types";
import { PullService } from "./PullService";
import { PushService } from "./PushService";

/**
 * Main sync coordinator.
 * Runs pull first (to catch completions), then push (to sync changes).
 */
export class SyncEngine {
  constructor(
    private pullService: PullService,
    private pushService: PushService
  ) {}

  /**
   * Performs a complete sync operation.
   * Pull runs first so completions are marked before we push updates.
   * @param content - Markdown file content
   * @returns Updated content and combined sync statistics
   */
  async sync(content: string): Promise<SyncResult & { content: string }> {
    // Pull first: mark local tasks done if completed in Todoist
    const pullResult = await this.pullService.pullCompletions(content);

    // Push second: sync current state to Todoist (using pull's updated content)
    const pushResult = await this.pushService.pushTasks(pullResult.content);

    // Combine errors from both phases
    const allErrors = [...pullResult.errors, ...pushResult.errors];

    return {
      content: pushResult.content,
      created: pushResult.createdCount,
      updated: pushResult.updatedCount,
      completed: pullResult.completedCount,
      failed: allErrors.length,
      errors: allErrors,
    };
  }
}
