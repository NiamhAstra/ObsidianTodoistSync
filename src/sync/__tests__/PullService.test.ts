import { describe, it, expect, vi, beforeEach } from "vitest";
import { PullService } from "../PullService";
import { TodoistClient } from "../../todoist/TodoistClient";
import { TaskParser } from "../../parser/TaskParser";
import { TaskFormatter } from "../../parser/TaskFormatter";

vi.mock("../../todoist/TodoistClient");
vi.mock("../../parser/TaskParser");
vi.mock("../../parser/TaskFormatter");

describe("PullService", () => {
  let pullService: PullService;
  let mockClient: any;
  let mockParser: any;
  let mockFormatter: any;

  beforeEach(() => {
    mockClient = {
      getTask: vi.fn(),
    };
    mockParser = {
      parseContent: vi.fn(),
    };
    mockFormatter = {
      markCompleted: vi.fn(),
    };

    pullService = new PullService(mockClient, mockParser, mockFormatter);
  });

  describe("pullCompletions", () => {
    it("should mark completed tasks in content", async () => {
      const content = `- [ ] Task one 🆔 task-1
- [ ] Task two 🆔 task-2`;

      mockParser.parseContent.mockReturnValue([
        { lineNumber: 0, todoistId: "task-1", isCompleted: false, rawText: "- [ ] Task one 🆔 task-1" },
        { lineNumber: 1, todoistId: "task-2", isCompleted: false, rawText: "- [ ] Task two 🆔 task-2" },
      ]);

      mockClient.getTask
        .mockResolvedValueOnce({ id: "task-1", is_completed: true })
        .mockResolvedValueOnce({ id: "task-2", is_completed: false });

      mockFormatter.markCompleted.mockReturnValue("- [x] Task one ✅ 2024-01-15");

      const result = await pullService.pullCompletions(content);

      expect(result.completedCount).toBe(1);
      expect(result.content).toContain("- [x] Task one");
    });

    it("should skip tasks without todoist ID", async () => {
      const content = "- [ ] Task without ID";

      mockParser.parseContent.mockReturnValue([
        { lineNumber: 0, todoistId: null, isCompleted: false },
      ]);

      const result = await pullService.pullCompletions(content);

      expect(mockClient.getTask).not.toHaveBeenCalled();
      expect(result.completedCount).toBe(0);
    });
  });
});
