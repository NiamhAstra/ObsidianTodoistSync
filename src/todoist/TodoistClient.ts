import { TodoistProject } from "../models/types";

const BASE_URL = "https://api.todoist.com/rest/v2";

export class TodoistClient {
  constructor(private apiToken: string) {}

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiToken}`,
      "Content-Type": "application/json",
    };
  }

  async getProjects(): Promise<TodoistProject[]> {
    const response = await fetch(`${BASE_URL}/projects`, {
      method: "GET",
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.status}`);
    }

    return response.json();
  }
}
