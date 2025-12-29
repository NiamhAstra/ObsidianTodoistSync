import { Plugin } from "obsidian";

export default class TodoistSyncPlugin extends Plugin {
  async onload() {
    console.log("Loading Todoist Sync plugin");
  }

  async onunload() {
    console.log("Unloading Todoist Sync plugin");
  }
}
