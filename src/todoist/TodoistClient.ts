import { TodoistProject, TodoistTask } from "../models/types";

const BASE_URL = "https://api.todoist.com/rest/v2";
const MAX_RETRIES = 3;
const INITIAL_DELAY_MS = 1000;
const BACKOFF_MULTIPLIER = 2;

const RETRYABLE_STATUS_CODES = [429, 500, 502, 503];

export class TodoistClient {
  constructor(private apiToken: string) {}

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiToken}`,
      "Content-Type": "application/json",
    };
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async fetchWithRetry(
    url: string,
    options: RequestInit
  ): Promise<Response> {
    let lastError: Error | null = null;
    let delayMs = INITIAL_DELAY_MS;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const response = await fetch(url, options);

      if (response.ok) {
        return response;
      }

      if (!RETRYABLE_STATUS_CODES.includes(response.status)) {
        throw new Error(`Request failed: ${response.status}`);
      }

      lastError = new Error(`Request failed: ${response.status}`);

      if (attempt < MAX_RETRIES - 1) {
        await this.delay(delayMs);
        delayMs *= BACKOFF_MULTIPLIER;
      }
    }

    throw new Error("Max retries exceeded");
  }

  async getProjects(): Promise<TodoistProject[]> {
    const response = await this.fetchWithRetry(`${BASE_URL}/projects`, {
      method: "GET",
      headers: this.headers,
    });

    return response.json();
  }

  async getTask(taskId: string): Promise<TodoistTask | null> {
    try {
      const response = await fetch(`${BASE_URL}/tasks/${taskId}`, {
        method: "GET",
        headers: this.headers,
      });

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      if (error instanceof Error && error.message.includes("404")) {
        return null;
      }
      throw error;
    }
  }

  async createTask(task: {
    content: string;
    project_id: string;
    priority?: number;
    due_date?: string;
    parent_id?: string;
  }): Promise<TodoistTask> {
    const response = await this.fetchWithRetry(`${BASE_URL}/tasks`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(task),
    });

    return response.json();
  }

  async updateTask(
    taskId: string,
    updates: {
      content?: string;
      priority?: number;
      due_date?: string;
    }
  ): Promise<TodoistTask> {
    const response = await this.fetchWithRetry(`${BASE_URL}/tasks/${taskId}`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(updates),
    });

    return response.json();
  }

  async closeTask(taskId: string): Promise<void> {
    await this.fetchWithRetry(`${BASE_URL}/tasks/${taskId}/close`, {
      method: "POST",
      headers: this.headers,
    });
  }
}
