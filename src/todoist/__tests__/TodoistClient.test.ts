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

      await expect(client.getProjects()).rejects.toThrow("Failed to fetch projects: 401");
    });
  });
});
