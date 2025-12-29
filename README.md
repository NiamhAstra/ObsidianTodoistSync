# Obsidian Todoist Sync

Sync tasks between Obsidian and Todoist. Push new tasks to Todoist, pull completion status back to Obsidian.

> **Note:** This plugin was a one-day build made primarily for my wife to use. Feature requests and additional development beyond keeping it functional will likely be slow or non-existent. Contributions are welcome!

## Features

- **One-command sync** - Single "Sync with Todoist" command handles both push and pull
- **Tag-based routing** - Map Obsidian tags to Todoist projects (e.g., `#work` → Work project)
- **Tasks plugin compatible** - Supports due dates, priorities, and scheduled dates using standard emoji markers
- **Sub-task support** - Preserves task hierarchy when syncing to Todoist
- **Completion sync** - Tasks completed in Todoist get marked done in Obsidian
- **Robust error handling** - Continues on failures, reports all errors at end

## Installation

### From Community Plugins (Recommended)

1. Open Obsidian Settings → Community plugins
2. Click "Browse" and search for "Todoist Sync"
3. Click Install, then Enable

### Manual Installation

1. Download `main.js` and `manifest.json` from the latest release
2. Create folder: `.obsidian/plugins/todoist-sync/`
3. Copy both files into that folder
4. Enable the plugin in Obsidian settings

## Configuration

1. Get your Todoist API token from [Todoist Settings → Integrations → Developer](https://todoist.com/app/settings/integrations/developer)
2. Open Obsidian Settings → Todoist Sync
3. Paste your API token and click "Test Connection"
4. Add tag mappings to route tasks to Todoist projects:
   - Tag: `#work` → Project: Work
   - Tag: `#personal` → Project: Personal

## Usage

### Writing Tasks

Use standard Obsidian Tasks plugin format:

```markdown
- [ ] Buy groceries #personal
- [ ] Review quarterly report #work 📅 2025-01-15
- [ ] Call dentist #personal ⏫
- [ ] Update documentation #work 🔼
```

### Supported Metadata

| Marker | Meaning | Todoist Priority |
|--------|---------|------------------|
| `📅 2025-01-15` | Due date | - |
| `⏳ 2025-01-15` | Scheduled date (used as due date if no 📅) | - |
| `⏫` | Highest priority | P1 |
| `🔼` | High priority | P2 |
| `🔽` | Low priority | P4 |
| `⏬` | Lowest priority | P4 |

### Syncing

1. Open a markdown file with tasks
2. Run command: `Ctrl/Cmd + P` → "Sync with Todoist"

**What happens:**
- Tasks with mapped tags (e.g., `#work`) are created in the corresponding Todoist project
- Each synced task gets a Todoist ID appended: `🆔 abc123`
- Tasks already synced (have `🆔`) are updated if changed
- Tasks completed in Todoist are marked done with: `- [x] Task ✅ 2025-01-15`

### Example

Before sync:
```markdown
- [ ] Review PR #work 📅 2025-01-20 ⏫
- [ ] Buy milk #personal
```

After sync (assuming `#work` is mapped):
```markdown
- [ ] Review PR #work 📅 2025-01-20 ⏫ 🆔 8150234567
- [ ] Buy milk #personal
```

The `#personal` task wasn't synced because there's no mapping for it.

## How It Works

1. **Pull phase**: Checks all tasks with Todoist IDs (`🆔`). If completed in Todoist, marks them done locally.
2. **Push phase**: Creates new tasks (no `🆔`) or updates existing ones in Todoist based on tag mappings.

Obsidian is the source of truth for task content. Todoist is the source of truth for completion status.

## Limitations

- Syncs current file only (vault-wide sync planned for future)
- One-way content sync (Obsidian → Todoist). Completion syncs back.
- Requires at least one tag mapping to sync tasks
- Wiki links are stripped from task titles when sent to Todoist

## Privacy & Network

This plugin communicates with the Todoist REST API (api.todoist.com) to sync tasks. Your API token is stored locally in Obsidian's plugin data and is only sent to Todoist servers. No other data is collected or transmitted.

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Watch mode for development
npm run dev
```

## License

CC0 1.0 Universal - Public Domain Dedication

To the extent possible under law, Miana Ella Winter has waived all copyright and related rights to this work.
