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
