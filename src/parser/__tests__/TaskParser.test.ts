import { describe, it, expect } from "vitest";
import { TaskParser } from "../TaskParser";

describe("TaskParser", () => {
  const parser = new TaskParser();

  describe("parseLine", () => {
    it("should parse a simple incomplete task", () => {
      const result = parser.parseLine("- [ ] Buy groceries", 0);

      expect(result).not.toBeNull();
      expect(result?.title).toBe("Buy groceries");
      expect(result?.isCompleted).toBe(false);
      expect(result?.indentLevel).toBe(0);
    });

    it("should parse a completed task", () => {
      const result = parser.parseLine("- [x] Done task", 0);

      expect(result).not.toBeNull();
      expect(result?.isCompleted).toBe(true);
    });

    it("should return null for non-task lines", () => {
      expect(parser.parseLine("Just some text", 0)).toBeNull();
      expect(parser.parseLine("- Not a checkbox", 0)).toBeNull();
      expect(parser.parseLine("", 0)).toBeNull();
    });

    it("should detect indent level", () => {
      const result = parser.parseLine("    - [ ] Nested task", 0);

      expect(result?.indentLevel).toBe(1);
    });

    it("should handle tab indentation", () => {
      const result = parser.parseLine("\t- [ ] Tab indented", 0);

      expect(result?.indentLevel).toBe(1);
    });
  });

  describe("metadata extraction", () => {
    it("should extract due date", () => {
      const result = parser.parseLine("- [ ] Task 📅 2024-01-15", 0);

      expect(result?.dueDate).toBe("2024-01-15");
      expect(result?.title).toBe("Task");
    });

    it("should extract scheduled date when no due date", () => {
      const result = parser.parseLine("- [ ] Task ⏳ 2024-01-15", 0);

      expect(result?.scheduledDate).toBe("2024-01-15");
      expect(result?.dueDate).toBeNull();
    });

    it("should prefer due date over scheduled date", () => {
      const result = parser.parseLine("- [ ] Task 📅 2024-01-20 ⏳ 2024-01-15", 0);

      expect(result?.dueDate).toBe("2024-01-20");
    });

    it("should extract priority markers", () => {
      expect(parser.parseLine("- [ ] Task ⏫", 0)?.priority).toBe(1);
      expect(parser.parseLine("- [ ] Task 🔼", 0)?.priority).toBe(2);
      expect(parser.parseLine("- [ ] Task 🔽", 0)?.priority).toBe(4);
      expect(parser.parseLine("- [ ] Task ⏬", 0)?.priority).toBe(4);
      expect(parser.parseLine("- [ ] Task", 0)?.priority).toBe(4);
    });

    it("should extract todoist ID", () => {
      const result = parser.parseLine("- [ ] Task 🆔 abc123", 0);

      expect(result?.todoistId).toBe("abc123");
      expect(result?.title).toBe("Task");
    });

    it("should extract tags", () => {
      const result = parser.parseLine("- [ ] Task #work #urgent", 0);

      expect(result?.tags).toEqual(["#work", "#urgent"]);
      expect(result?.title).toBe("Task");
    });

    it("should strip wiki links from title", () => {
      const result = parser.parseLine("- [ ] Review [[Project Alpha]] notes", 0);

      expect(result?.title).toBe("Review Project Alpha notes");
    });

    it("should handle complex task with all metadata", () => {
      const result = parser.parseLine(
        "- [ ] Review [[Project]] notes #work 📅 2024-01-15 ⏫ 🆔 abc123",
        5
      );

      expect(result).toEqual({
        lineNumber: 5,
        rawText: "- [ ] Review [[Project]] notes #work 📅 2024-01-15 ⏫ 🆔 abc123",
        title: "Review Project notes",
        tags: ["#work"],
        dueDate: "2024-01-15",
        scheduledDate: null,
        priority: 1,
        todoistId: "abc123",
        indentLevel: 0,
        isCompleted: false,
      });
    });
  });
});
