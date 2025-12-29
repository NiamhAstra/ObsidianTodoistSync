import { describe, it, expect, vi, beforeEach } from "vitest";
import { TodoistClient } from "../todoist/TodoistClient";
import { TaskParser } from "../parser/TaskParser";
import { TaskFormatter } from "../parser/TaskFormatter";
import { PullService } from "../sync/PullService";
import { PushService } from "../sync/PushService";
import { SyncEngine } from "../sync/SyncEngine";
import { Settings } from "../models/types";

describe("Integration: Full Sync Flow", () => {
  let syncEngine: SyncEngine;
  let mockFetch: any;

  const settings: Settings = {
    apiToken: "test-token",
    tagMappings: [
      { tag: "#work", projectId: "proj-work", projectName: "Work" },
    ],
  };

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;

    const client = new TodoistClient(settings.apiToken);
    const parser = new TaskParser();
    const formatter = new TaskFormatter();

    const pullService = new PullService(client, parser, formatter);
    const pushService = new PushService(client, parser, formatter, settings);
    syncEngine = new SyncEngine(pullService, pushService);
  });

  it("should complete full sync: pull completions, push new tasks", async () => {
    const content = `# Tasks

- [ ] Existing task #work 🆔 task-1
- [ ] New task #work 📅 2024-01-15`;

    // Mock: task-1 is completed in Todoist
    mockFetch.mockImplementation((url: string, options: any) => {
      if (url.includes("/tasks/task-1") && options.method === "GET") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: "task-1", is_completed: true }),
        });
      }
      if (url.includes("/tasks") && options.method === "POST" && !url.includes("task-1")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: "new-task-123" }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    const result = await syncEngine.sync(content);

    expect(result.completed).toBe(1);
    expect(result.created).toBe(1);
    expect(result.content).toContain("- [x] Existing task");
    expect(result.content).toContain("✅");
    expect(result.content).toContain("🆔 new-task-123");
  });
});
