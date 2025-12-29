import { describe, it, expect, vi, beforeEach } from "vitest";
import { SyncEngine } from "../SyncEngine";
import { PullService } from "../PullService";
import { PushService } from "../PushService";

describe("SyncEngine", () => {
  let syncEngine: SyncEngine;
  let mockPullService: any;
  let mockPushService: any;

  beforeEach(() => {
    mockPullService = {
      pullCompletions: vi.fn(),
    };
    mockPushService = {
      pushTasks: vi.fn(),
    };

    syncEngine = new SyncEngine(mockPullService, mockPushService);
  });

  describe("sync", () => {
    it("should run pull then push and return combined result", async () => {
      const content = "- [ ] Task 🆔 abc123";

      mockPullService.pullCompletions.mockResolvedValue({
        content: "- [x] Task ✅ 2024-01-15",
        completedCount: 1,
        errors: [],
      });

      mockPushService.pushTasks.mockResolvedValue({
        content: "- [x] Task ✅ 2024-01-15",
        createdCount: 0,
        updatedCount: 0,
        errors: [],
      });

      const result = await syncEngine.sync(content);

      expect(mockPullService.pullCompletions).toHaveBeenCalledWith(content);
      expect(mockPushService.pushTasks).toHaveBeenCalled();
      expect(result.completed).toBe(1);
    });

    it("should combine errors from both services", async () => {
      mockPullService.pullCompletions.mockResolvedValue({
        content: "content",
        completedCount: 0,
        errors: [{ taskTitle: "Task 1", error: "Pull error", lineNumber: 0 }],
      });

      mockPushService.pushTasks.mockResolvedValue({
        content: "content",
        createdCount: 0,
        updatedCount: 0,
        errors: [{ taskTitle: "Task 2", error: "Push error", lineNumber: 1 }],
      });

      const result = await syncEngine.sync("content");

      expect(result.failed).toBe(2);
      expect(result.errors).toHaveLength(2);
    });
  });
});
