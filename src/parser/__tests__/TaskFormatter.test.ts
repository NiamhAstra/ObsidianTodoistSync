import { describe, it, expect } from "vitest";
import { TaskFormatter } from "../TaskFormatter";

describe("TaskFormatter", () => {
  const formatter = new TaskFormatter();

  describe("appendTodoistId", () => {
    it("should append ID to task line", () => {
      const line = "- [ ] My task #work";
      const result = formatter.appendTodoistId(line, "abc123");

      expect(result).toBe("- [ ] My task #work 🆔 abc123");
    });

    it("should replace existing ID", () => {
      const line = "- [ ] My task 🆔 old123";
      const result = formatter.appendTodoistId(line, "new456");

      expect(result).toBe("- [ ] My task 🆔 new456");
    });
  });

  describe("markCompleted", () => {
    it("should mark task as completed with date", () => {
      const line = "- [ ] My task #work 🆔 abc123";
      const result = formatter.markCompleted(line, "2024-01-15");

      expect(result).toBe("- [x] My task #work ✅ 2024-01-15");
    });

    it("should remove todoist ID when completing", () => {
      const line = "- [ ] Task 🆔 abc123";
      const result = formatter.markCompleted(line, "2024-01-15");

      expect(result).not.toContain("🆔");
    });
  });

  describe("removeTodoistId", () => {
    it("should remove ID from task line", () => {
      const line = "- [ ] My task 🆔 abc123";
      const result = formatter.removeTodoistId(line);

      expect(result).toBe("- [ ] My task");
    });
  });
});
