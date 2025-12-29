import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TodoistClient } from "../TodoistClient";

describe("TodoistClient", () => {
  let client: TodoistClient;

  beforeEach(() => {
    client = new TodoistClient("test-token");
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getProjects", () => {
    it("should fetch projects with correct headers", async () => {
      const mockProjects = [{ id: "123", name: "Work" }];
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockProjects,
      });

      const result = await client.getProjects();

      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.todoist.com/rest/v2/projects",
        expect.objectContaining({
          headers: {
            Authorization: "Bearer test-token",
            "Content-Type": "application/json",
          },
        })
      );
      expect(result).toEqual(mockProjects);
    });

    it("should throw error when response is not ok", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      await expect(client.getProjects()).rejects.toThrow("401");
    });
  });

  describe("task operations", () => {
    describe("getTask", () => {
      it("should fetch a single task by ID", async () => {
        const mockTask = { id: "task-123", content: "Test task", is_completed: false };
        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: async () => mockTask,
        });

        const result = await client.getTask("task-123");

        expect(global.fetch).toHaveBeenCalledWith(
          "https://api.todoist.com/rest/v2/tasks/task-123",
          expect.any(Object)
        );
        expect(result).toEqual(mockTask);
      });

      it("should return null for 404", async () => {
        (global.fetch as any).mockResolvedValueOnce({ ok: false, status: 404 });

        const result = await client.getTask("nonexistent");

        expect(result).toBeNull();
      });
    });

    describe("createTask", () => {
      it("should create a task with correct payload", async () => {
        const mockTask = { id: "new-123", content: "New task" };
        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: async () => mockTask,
        });

        const result = await client.createTask({
          content: "New task",
          project_id: "proj-123",
          priority: 1,
          due_date: "2024-01-15",
        });

        expect(global.fetch).toHaveBeenCalledWith(
          "https://api.todoist.com/rest/v2/tasks",
          expect.objectContaining({
            method: "POST",
            body: JSON.stringify({
              content: "New task",
              project_id: "proj-123",
              priority: 1,
              due_date: "2024-01-15",
            }),
          })
        );
        expect(result).toEqual(mockTask);
      });
    });

    describe("updateTask", () => {
      it("should update a task", async () => {
        const mockTask = { id: "task-123", content: "Updated" };
        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: async () => mockTask,
        });

        const result = await client.updateTask("task-123", { content: "Updated" });

        expect(global.fetch).toHaveBeenCalledWith(
          "https://api.todoist.com/rest/v2/tasks/task-123",
          expect.objectContaining({
            method: "POST",
            body: JSON.stringify({ content: "Updated" }),
          })
        );
        expect(result).toEqual(mockTask);
      });
    });

    describe("closeTask", () => {
      it("should close a task", async () => {
        (global.fetch as any).mockResolvedValueOnce({ ok: true });

        await client.closeTask("task-123");

        expect(global.fetch).toHaveBeenCalledWith(
          "https://api.todoist.com/rest/v2/tasks/task-123/close",
          expect.objectContaining({ method: "POST" })
        );
      });
    });
  });

  describe("retry logic", () => {
    it("should retry on 429 with exponential backoff", async () => {
      const mockProjects = [{ id: "123", name: "Work" }];

      (global.fetch as any)
        .mockResolvedValueOnce({ ok: false, status: 429 })
        .mockResolvedValueOnce({ ok: false, status: 429 })
        .mockResolvedValueOnce({ ok: true, json: async () => mockProjects });

      vi.useFakeTimers();
      const promise = client.getProjects();

      await vi.advanceTimersByTimeAsync(1000); // First retry
      await vi.advanceTimersByTimeAsync(2000); // Second retry

      const result = await promise;
      vi.useRealTimers();

      expect(global.fetch).toHaveBeenCalledTimes(3);
      expect(result).toEqual(mockProjects);
    });

    it("should throw after max retries", async () => {
      (global.fetch as any)
        .mockResolvedValue({ ok: false, status: 429 });

      vi.useFakeTimers();
      const promise = client.getProjects();

      // Attach rejection handler immediately to prevent unhandled rejection warning
      let caughtError: Error | null = null;
      promise.catch((e) => {
        caughtError = e;
      });

      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(2000);
      await vi.advanceTimersByTimeAsync(4000);

      vi.useRealTimers();

      await expect(promise).rejects.toThrow("Max retries exceeded");
    });

    it("should not retry on 401", async () => {
      (global.fetch as any).mockResolvedValueOnce({ ok: false, status: 401 });

      await expect(client.getProjects()).rejects.toThrow("401");
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });
});
