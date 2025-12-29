import { describe, it, expect, vi, beforeEach } from "vitest";
import { PushService } from "../PushService";
import { TodoistClient } from "../../todoist/TodoistClient";
import { TaskParser } from "../../parser/TaskParser";
import { TaskFormatter } from "../../parser/TaskFormatter";
import { Settings } from "../../models/types";

vi.mock("../../todoist/TodoistClient");

describe("PushService", () => {
  let pushService: PushService;
  let mockClient: any;
  let parser: TaskParser;
  let formatter: TaskFormatter;
  let settings: Settings;

  beforeEach(() => {
    mockClient = {
      createTask: vi.fn(),
      updateTask: vi.fn(),
      getTask: vi.fn(),
    };
    parser = new TaskParser();
    formatter = new TaskFormatter();
    settings = {
      apiToken: "test",
      tagMappings: [{ tag: "#work", projectId: "proj-1", projectName: "Work" }],
    };

    pushService = new PushService(mockClient, parser, formatter, settings);
  });

  describe("pushTasks", () => {
    it("should create new task and append ID", async () => {
      const content = "- [ ] New task #work";
      mockClient.createTask.mockResolvedValue({ id: "new-123" });

      const result = await pushService.pushTasks(content);

      expect(mockClient.createTask).toHaveBeenCalledWith(
        expect.objectContaining({
          content: "New task",
          project_id: "proj-1",
        })
      );
      expect(result.content).toContain("🆔 new-123");
      expect(result.createdCount).toBe(1);
    });

    it("should update existing task", async () => {
      const content = "- [ ] Updated task #work 🆔 existing-123";
      mockClient.updateTask.mockResolvedValue({ id: "existing-123" });

      const result = await pushService.pushTasks(content);

      expect(mockClient.updateTask).toHaveBeenCalledWith(
        "existing-123",
        expect.objectContaining({ content: "Updated task" })
      );
      expect(result.updatedCount).toBe(1);
    });

    it("should skip tasks without mapped tags", async () => {
      const content = "- [ ] Task #personal";

      const result = await pushService.pushTasks(content);

      expect(mockClient.createTask).not.toHaveBeenCalled();
      expect(result.createdCount).toBe(0);
    });

    it("should recreate task on 404", async () => {
      const content = "- [ ] Task #work 🆔 deleted-123";
      mockClient.updateTask.mockRejectedValue(new Error("404"));
      mockClient.createTask.mockResolvedValue({ id: "new-456" });

      const result = await pushService.pushTasks(content);

      expect(mockClient.createTask).toHaveBeenCalled();
      expect(result.content).toContain("🆔 new-456");
    });
  });
});
