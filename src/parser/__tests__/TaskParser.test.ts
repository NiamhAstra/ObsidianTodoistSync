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
});
