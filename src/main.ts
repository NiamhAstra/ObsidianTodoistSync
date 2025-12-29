/**
 * Obsidian Todoist Sync Plugin
 * Syncs tasks from Obsidian to Todoist with completion status synced back.
 */

import { Notice, Plugin } from "obsidian";
import { DEFAULT_SETTINGS, Settings } from "./models/types";
import { TodoistSyncSettingTab } from "./settings/SettingsTab";
import { TodoistClient } from "./todoist/TodoistClient";
import { TaskParser } from "./parser/TaskParser";
import { TaskFormatter } from "./parser/TaskFormatter";
import { PullService } from "./sync/PullService";
import { PushService } from "./sync/PushService";
import { SyncEngine } from "./sync/SyncEngine";

/**
 * Main plugin class.
 * Registers the sync command and settings tab.
 */
export default class TodoistSyncPlugin extends Plugin {
  settings: Settings = DEFAULT_SETTINGS;

  async onload() {
    await this.loadSettings();

    this.addCommand({
      id: "sync-with-todoist",
      name: "Sync with Todoist",
      callback: () => this.syncCurrentFile(),
    });

    this.addSettingTab(new TodoistSyncSettingTab(this.app, this));
  }

  async onunload() {}

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  /**
   * Shows a notification to the user.
   * @param message - Text to display
   */
  showNotice(message: string) {
    new Notice(message);
  }

  /**
   * Syncs the currently active file with Todoist.
   * Validates configuration before running sync.
   */
  private async syncCurrentFile() {
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) {
      this.showNotice("No active file to sync");
      return;
    }

    if (!this.settings.apiToken) {
      this.showNotice("Configure API token in settings");
      return;
    }

    if (this.settings.tagMappings.length === 0) {
      this.showNotice("Configure tag mappings in settings");
      return;
    }

    try {
      const content = await this.app.vault.read(activeFile);

      // Build the sync pipeline
      const client = new TodoistClient(this.settings.apiToken);
      const parser = new TaskParser();
      const formatter = new TaskFormatter();

      const pullService = new PullService(client, parser, formatter);
      const pushService = new PushService(client, parser, formatter, this.settings);
      const syncEngine = new SyncEngine(pullService, pushService);

      const result = await syncEngine.sync(content);

      // Write updated content back to file
      await this.app.vault.modify(activeFile, result.content);

      this.showSyncResult(result);
    } catch (error) {
      this.showNotice(
        `Sync failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  // Formats sync results into a user-friendly notification
  private showSyncResult(result: {
    created: number;
    updated: number;
    completed: number;
    failed: number;
    errors: Array<{ taskTitle: string; error: string }>;
  }) {
    const parts: string[] = [];

    if (result.created > 0 || result.updated > 0) {
      parts.push(`${result.created} created, ${result.updated} updated`);
    }

    if (result.completed > 0) {
      parts.push(`${result.completed} marked complete`);
    }

    if (result.failed > 0) {
      parts.push(`${result.failed} failed`);
    }

    if (parts.length === 0) {
      this.showNotice("No tasks to sync");
      return;
    }

    let message = `Synced with Todoist\n• ${parts.join("\n• ")}`;

    // Show first 3 errors for debugging without overwhelming the user
    if (result.errors.length > 0) {
      const errorDetails = result.errors
        .slice(0, 3)
        .map((e) => `"${e.taskTitle}" - ${e.error}`)
        .join("\n• ");
      message += `\n• Failed: ${errorDetails}`;
    }

    this.showNotice(message);
  }
}
