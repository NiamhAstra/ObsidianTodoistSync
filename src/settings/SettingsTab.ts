import { App, PluginSettingTab, Setting } from "obsidian";
import TodoistSyncPlugin from "../main";
import { TodoistClient } from "../todoist/TodoistClient";
import { TodoistProject } from "../models/types";

export class TodoistSyncSettingTab extends PluginSettingTab {
  plugin: TodoistSyncPlugin;
  projects: TodoistProject[] = [];

  constructor(app: App, plugin: TodoistSyncPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Todoist Sync Settings" });

    new Setting(containerEl)
      .setName("API Token")
      .setDesc("Your Todoist API token (Settings → Integrations → Developer)")
      .addText((text) => {
        text
          .setPlaceholder("Enter your API token")
          .setValue(this.plugin.settings.apiToken)
          .onChange(async (value) => {
            this.plugin.settings.apiToken = value;
            await this.plugin.saveSettings();
          });
        text.inputEl.type = "password";
      })
      .addButton((button) =>
        button.setButtonText("Test Connection").onClick(async () => {
          await this.testConnection();
        })
      );

    containerEl.createEl("h3", { text: "Tag to Project Mappings" });
    containerEl.createEl("p", {
      text: "Map Obsidian tags to Todoist projects. First matching tag wins.",
      cls: "setting-item-description",
    });

    const mappingsContainer = containerEl.createDiv();
    this.renderMappings(mappingsContainer);

    new Setting(containerEl).addButton((button) =>
      button.setButtonText("Add Mapping").onClick(async () => {
        this.plugin.settings.tagMappings.push({
          tag: "#",
          projectId: "",
          projectName: "",
        });
        await this.plugin.saveSettings();
        this.display();
      })
    );
  }

  private renderMappings(container: HTMLElement): void {
    container.empty();

    this.plugin.settings.tagMappings.forEach((mapping, index) => {
      new Setting(container)
        .addText((text) =>
          text
            .setPlaceholder("#tag")
            .setValue(mapping.tag)
            .onChange(async (value) => {
              this.plugin.settings.tagMappings[index].tag = value.startsWith("#")
                ? value
                : `#${value}`;
              await this.plugin.saveSettings();
            })
        )
        .addDropdown((dropdown) => {
          dropdown.addOption("", "Select project...");
          this.projects.forEach((project) => {
            dropdown.addOption(project.id, project.name);
          });
          dropdown.setValue(mapping.projectId);
          dropdown.onChange(async (value) => {
            const project = this.projects.find((p) => p.id === value);
            this.plugin.settings.tagMappings[index].projectId = value;
            this.plugin.settings.tagMappings[index].projectName =
              project?.name || "";
            await this.plugin.saveSettings();
          });
        })
        .addButton((button) =>
          button.setIcon("trash").onClick(async () => {
            this.plugin.settings.tagMappings.splice(index, 1);
            await this.plugin.saveSettings();
            this.display();
          })
        );
    });
  }

  private async testConnection(): Promise<void> {
    const token = this.plugin.settings.apiToken;
    if (!token) {
      this.plugin.showNotice("Please enter an API token first");
      return;
    }

    try {
      const client = new TodoistClient(token);
      this.projects = await client.getProjects();
      this.plugin.showNotice(`Connected! Found ${this.projects.length} projects`);
      this.display();
    } catch (error) {
      console.error("Todoist connection test failed:", error);
      this.plugin.showNotice("Connection failed. Check your API token.");
    }
  }
}
