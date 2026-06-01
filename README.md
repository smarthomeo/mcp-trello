# mcp-trello

**MCP server for Trello.** Manage boards, lists, cards, labels, and checklists from any AI agent.

No official or maintained MCP server exists for Trello. This is the first one.

## Install

```bash
npm install -g mcp-trello
```

Or run directly with npx:

```bash
npx mcp-trello
```

## Configuration

### Get your Trello credentials

1. **API Key:** Go to [trello.com/power-ups/admin/](https://trello.com/power-ups/admin/) and copy your API key
2. **Token:** Visit this URL (replace `YOUR_KEY`):
   ```
   https://trello.com/1/authorize?expiration=never&scope=read,write&response_type=token&key=YOUR_KEY
   ```

### Add to your MCP client

**Claude Desktop** (`~/Library/Application Support/Claude/claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "trello": {
      "command": "npx",
      "args": ["-y", "mcp-trello"],
      "env": {
        "TRELLO_API_KEY": "your-key",
        "TRELLO_TOKEN": "your-token"
      }
    }
  }
}
```

**Cursor** (`.cursor/mcp.json`):
```json
{
  "mcpServers": {
    "trello": {
      "command": "npx",
      "args": ["-y", "mcp-trello"],
      "env": {
        "TRELLO_API_KEY": "your-key",
        "TRELLO_TOKEN": "your-token"
      }
    }
  }
}
```

**Gemini CLI** (`~/.config/gemini/settings.json`):
```json
{
  "mcpServers": {
    "trello": {
      "command": "npx",
      "args": ["-y", "mcp-trello"],
      "env": {
        "TRELLO_API_KEY": "your-key",
        "TRELLO_TOKEN": "your-token"
      }
    }
  }
}
```

## Available Tools

### Boards
| Tool | Description |
|------|-------------|
| `list_boards` | List all boards for the authenticated user |
| `get_board` | Get details of a specific board (with lists, labels, members) |
| `create_board` | Create a new board |

### Lists
| Tool | Description |
|------|-------------|
| `get_lists` | Get all lists on a board |
| `create_list` | Create a new list on a board |
| `archive_list` | Archive or unarchive a list |

### Cards
| Tool | Description |
|------|-------------|
| `get_cards` | Get all cards on a board or list |
| `get_card` | Get a specific card with full details |
| `create_card` | Create a new card |
| `update_card` | Update a card's name, description, due date, or position |
| `move_card` | Move a card to a different list |
| `delete_card` | Delete a card |

### Labels
| Tool | Description |
|------|-------------|
| `get_labels` | Get all labels on a board |
| `create_label` | Create a new label |
| `add_label_to_card` | Add a label to a card |
| `remove_label_from_card` | Remove a label from a card |

### Checklists
| Tool | Description |
|------|-------------|
| `get_checklists` | Get checklists on a card |
| `create_checklist` | Create a checklist on a card |
| `add_checklist_item` | Add an item to a checklist |

### Comments
| Tool | Description |
|------|-------------|
| `add_comment` | Add a comment to a card |

### Search
| Tool | Description |
|------|-------------|
| `search` | Search across all boards (cards, boards, members) |

## Example Prompts

Once configured, ask your AI agent:

- "Show me all cards in the Backlog list"
- "Move the login bug card to In Progress"
- "Create a card called 'Update dependencies' in the Sprint list"
- "Add a comment to card abc123 saying 'Reviewed and approved'"
- "Search for all cards mentioning 'authentication'"
- "Create a new board called 'Q3 Roadmap'"

## Development

```bash
git clone https://github.com/smarthomeo/mcp-trello.git
cd mcp-trello
npm install
npm test        # Run 72 tests
npm run build   # Build to dist/
```

## License

MIT
