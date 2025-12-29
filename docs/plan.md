# Obsidian-Todoist Sync Plugin Design

## Overview

A plugin that syncs tasks from Obsidian to Todoist, with completion status synced back.

- **Single command**: "Sync with Todoist" handles both push and pull
- **Scope**: Current file only (vault-wide planned for future)
- **Source of truth**: Obsidian (always wins on conflicts)
- **Task format**: Obsidian Tasks plugin metadata style (required dependency)

## Architecture

```
src/
├── main.ts              # Plugin entry, registers command
├── sync/
│   ├── SyncEngine.ts    # Orchestrates full sync flow
│   ├── PullService.ts   # Fetches completions from Todoist
│   └── PushService.ts   # Creates/updates tasks in Todoist
├── parser/
│   ├── TaskParser.ts    # Extracts tasks from markdown
│   └── TaskFormatter.ts # Formats tasks back to markdown
├── todoist/
│   └── TodoistClient.ts # API wrapper with error handling
├── models/
│   └── types.ts         # Task, SyncResult interfaces
└── settings/
    ├── Settings.ts      # Settings interface & defaults
    └── SettingsTab.ts   # Settings UI
```

**Dependencies**
- Obsidian API (built-in)
- Obsidian Tasks plugin (required)
- Todoist REST API v2

## Sync Flow

### Pull Phase (Completions)

1. Collect all `🆔 [id]` values from current file
2. Batch fetch task statuses from Todoist API
3. For each completed task in Todoist:
   - Change `- [ ]` to `- [x]`
   - Append `✅ YYYY-MM-DD` (today's date)
   - Remove `🆔 [id]` (no longer needed)
4. Save file

### Push Phase (Create/Update)

1. Parse all incomplete tasks (`- [ ]`) from file
2. Filter to tasks with at least one mapped tag
3. Build parent-child relationships from indentation
4. For each task (parents first, then children):
   - If has `🆔`: update existing Todoist task
   - If no `🆔`: create new, append ID to Obsidian line
   - If 404 on update: recreate task with new ID
5. Save file with new IDs

Parents sync before children to ensure `parent_id` is available for sub-tasks.

## Data Mapping

### Task Parsing

Input:
```
- [ ] Review [[Project Alpha]] notes #work 📅 2024-01-15 ⏫ 🆔 abc123
```

Output:
```typescript
{
  rawText: "Review [[Project Alpha]] notes #work 📅 2024-01-15 ⏫ 🆔 abc123",
  title: "Review Project Alpha notes",  // brackets stripped, metadata removed
  tags: ["#work"],
  dueDate: "2024-01-15",
  priority: 1,
  todoistId: "abc123",
  indentLevel: 0
}
```

### Title Cleaning

1. Strip `[[` and `]]` from wiki links
2. Remove emoji metadata and their values
3. Remove tags (`#word`)
4. Trim whitespace

### Priority Mapping

| Obsidian | Todoist |
|----------|---------|
| ⏫ (highest) | 1 |
| 🔼 (high) | 2 |
| 🔽 (low) | 4 |
| ⏬ (lowest) | 4 |
| (none) | 4 |

### Due Date Handling

- `📅` (due date) takes priority over `⏳` (scheduled)
- Date only, time component ignored
- `🔁` (recurrence) ignored, syncs as one-time task

### Project Resolution

First tag matching a configured mapping determines project. Other tags ignored.

## Sub-task Handling

Sub-tasks (indented items) sync as Todoist sub-tasks using `parent_id`.

```markdown
- [ ] Main task #work 📅 2024-01-15
    - [ ] Sub-task one
    - [ ] Sub-task two
```

- Sub-tasks auto-include under synced parents (no tag required)
- If parent has no mapped tag, entire hierarchy skipped

## What Gets Synced

Only incomplete tasks with at least one mapped tag. Skip:
- Completed tasks (`- [x]`)
- Tasks with no mapped tag
- Tasks with empty/whitespace-only names

## Deleted/Completed Task Handling

| Scenario | Behavior |
|----------|----------|
| Task deleted in Obsidian | Orphaned in Todoist |
| Task deleted in Todoist | Recreated on next sync |
| Task completed in Todoist | Marked `[x]` in Obsidian with ✅ date |
| Task completed in Obsidian | Not synced |

## Settings

### Interface

```typescript
interface Settings {
  apiToken: string;
  tagMappings: TagMapping[];
}

interface TagMapping {
  tag: string;        // e.g., "#work"
  projectId: string;  // Todoist project ID
  projectName: string; // Display name for UI
}
```

### Settings UI

1. **API Token**: Password input with "Test Connection" button
2. **Tag Mappings**: Table with tag, project dropdown, remove button
   - Drag to reorder (first match wins)
   - Project dropdown populated from Todoist API after token validation

### Validation

- API token: non-empty, valid on test
- Tags: must start with `#`, no duplicates
- At least one mapping required

## Error Handling

### Retry Strategy

```typescript
{
  maxAttempts: 3,
  initialDelayMs: 1000,
  backoffMultiplier: 2  // 1s → 2s → 4s
}
```

**Retryable**: Rate limit (429), network errors, server errors (5xx)

**Non-retryable**: Auth errors (401, 403), bad request (400)

**404 on update**: Recreate task with new ID

### Failure Collection

Continue syncing all tasks, collect failures, report at end.

```typescript
interface SyncFailure {
  taskTitle: string;
  error: string;
  lineNumber: number;
}
```

### User Feedback

Success:
```
Synced with Todoist
• 3 created, 2 updated
• 1 marked complete
```

Partial failure:
```
Synced with Todoist (2 errors)
• 3 created, 1 updated
• Failed: "Review proposal" - Rate limited
• Failed: "Call client" - Network error
```

## Testing Strategy

### Unit Tests

| Component | Focus |
|-----------|-------|
| TaskParser | Emoji extraction, wiki link stripping, priority mapping, edge cases |
| TaskFormatter | ID appending, completion marking, line reconstruction |
| TodoistClient | Request building, response parsing, retry logic (mocked) |

### Integration Tests

Mock Todoist API to test:
- Create new tasks (no ID → ID appended)
- Update existing tasks
- Handle 404 (recreate with new ID)
- Pull completions
- Sub-task hierarchy preservation
- Partial failure collection

### Manual Testing Scenarios

1. First sync — tasks get IDs
2. Modify task in Obsidian — updates in Todoist
3. Complete in Todoist — marked done in Obsidian
4. Delete in Todoist — recreated on next sync
5. Network failure mid-sync — partial success reported
6. Multiple tags — first mapped tag wins
