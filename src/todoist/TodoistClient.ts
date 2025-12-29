/**
 * Todoist REST API client with automatic retry for transient failures.
 * Handles authentication, request formatting, and error recovery.
 */

import { TodoistProject, TodoistTask } from "../models/types";

const BASE_URL = "https://api.todoist.com/rest/v2";
const MAX_RETRIES = 3;
const INITIAL_DELAY_MS = 1000;
const BACKOFF_MULTIPLIER = 2;

// 429 = rate limited, 5xx = server errors (usually transient)
const RETRYABLE_STATUS_CODES = [429, 500, 502, 503];

/**
 * Client for Todoist REST API v2.
 * Implements exponential backoff for rate limits and server errors.
 */
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

  /**
   * Wraps fetch with exponential backoff retry logic.
   * Retries on rate limits (429) and server errors (5xx).
   * Fails fast on client errors (4xx) since those won't resolve with retry.
   * @param url - API endpoint
   * @param options - Fetch options
   * @returns Response if successful
   */
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

      // Don't retry client errors - they won't succeed on retry
      if (!RETRYABLE_STATUS_CODES.includes(response.status)) {
        throw new Error(`Request failed: ${response.status}`);
      }

      lastError = new Error(`Request failed: ${response.status}`);

      // Wait before next attempt with exponential backoff (1s, 2s, 4s)
      if (attempt < MAX_RETRIES - 1) {
        await this.delay(delayMs);
        delayMs *= BACKOFF_MULTIPLIER;
      }
    }

    throw new Error("Max retries exceeded");
  }

  /**
   * Fetches all projects for the authenticated user.
   * @returns List of projects
   */
  async getProjects(): Promise<TodoistProject[]> {
    const response = await this.fetchWithRetry(`${BASE_URL}/projects`, {
      method: "GET",
      headers: this.headers,
    });

    return response.json();
  }

  /**
   * Fetches a single task by ID.
   * Returns null for deleted/missing tasks instead of throwing.
   * @param taskId - Todoist task ID
   * @returns Task if found, null if deleted
   */
  async getTask(taskId: string): Promise<TodoistTask | null> {
    try {
      const response = await fetch(`${BASE_URL}/tasks/${taskId}`, {
        method: "GET",
        headers: this.headers,
      });

      // Task was deleted in Todoist - not an error, just missing
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

  /**
   * Creates a new task in Todoist.
   * @param task - Task content and metadata
   * @returns Created task with assigned ID
   */
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

  /**
   * Updates an existing task.
   * @param taskId - Todoist task ID
   * @param updates - Fields to update
   * @returns Updated task
   */
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

  /**
   * Marks a task as complete in Todoist.
   * @param taskId - Todoist task ID
   */
  async closeTask(taskId: string): Promise<void> {
    await this.fetchWithRetry(`${BASE_URL}/tasks/${taskId}/close`, {
      method: "POST",
      headers: this.headers,
    });
  }
}
