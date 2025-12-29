import { SyncResult } from "../models/types";
import { PullService } from "./PullService";
import { PushService } from "./PushService";

export class SyncEngine {
  constructor(
    private pullService: PullService,
    private pushService: PushService
  ) {}

  async sync(content: string): Promise<SyncResult & { content: string }> {
    const pullResult = await this.pullService.pullCompletions(content);

    const pushResult = await this.pushService.pushTasks(pullResult.content);

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
