# MCP Trello Server

## Overview
A Model Context Protocol (MCP) server that exposes Trello as tools for AI coding agents. Lets agents read boards, create cards, move items, search, and manage Trello workflows via natural language.

## Why
No official or maintained MCP server exists for Trello. The community needs one that's reliable, well-tested, and covers the core Trello workflow. This is the first proper MCP server for Trello.

## Technical Stack
- **Language:** TypeScript
- **MCP SDK:** `@modelcontextprotocol/sdk`
- **Transport:** stdio (standard for MCP servers)
- **Trello API:** REST v1 (https://api.trello.com/1/)
- **Auth:** Trello API key + token (passed as env vars)
- **Build:** tsup
- **Tests:** vitest
- **Published as:** npm package `mcp-trello`

## Environment Variables
- `TRELLO_API_KEY` — Trello API key (required)
- `TRELLO_TOKEN` — Trello API token (required)

## Tools to Implement

### Board Tools
1. **list_boards** — List all boards for the authenticated user
   - No required params
   - Returns: board id, name, description, url, closed status

2. **get_board** — Get details of a specific board
   - Params: `board_id` (required)
   - Returns: board details with lists, labels, members

3. **create_board** — Create a new board
   - Params: `name` (required), `description` (optional), `default_lists` (optional, default true)
   - Returns: created board

### List Tools
4. **get_lists** — Get all lists on a board
   - Params: `board_id` (required)
   - Returns: list id, name, position, closed status

5. **create_list** — Create a new list on a board
   - Params: `board_id` (required), `name` (required)
   - Returns: created list

6. **archive_list** — Archive/unarchive a list
   - Params: `list_id` (required), `archive` (optional, default true)

### Card Tools
7. **get_cards** — Get all cards on a board or list
   - Params: `board_id` (optional), `list_id` (optional) — provide one
   - Returns: card id, name, description, due date, labels, list name

8. **get_card** — Get a specific card with full details
   - Params: `card_id` (required)
   - Returns: card with checklists, comments, attachments

9. **create_card** — Create a new card
   - Params: `list_id` (required), `name` (required), `description` (optional), `due_date` (optional), `labels` (optional, array of label IDs), `position` (optional, "top", "bottom", or number)
   - Returns: created card

10. **update_card** — Update a card
    - Params: `card_id` (required), `name` (optional), `description` (optional), `due_date` (optional), `position` (optional)
    - Returns: updated card

11. **move_card** — Move a card to a different list
    - Params: `card_id` (required), `list_id` (required), `position` (optional)
    - Returns: moved card

12. **delete_card** — Delete a card
    - Params: `card_id` (required)

### Label Tools
13. **get_labels** — Get all labels on a board
    - Params: `board_id` (required)
    - Returns: label id, name, color

14. **create_label** — Create a new label on a board
    - Params: `board_id` (required), `name` (required), `color` (required)
    - Returns: created label

15. **add_label_to_card** — Add a label to a card
    - Params: `card_id` (required), `label_id` (required)

16. **remove_label_from_card** — Remove a label from a card
    - Params: `card_id` (required), `label_id` (required)

### Checklist Tools
17. **get_checklists** — Get checklists on a card
    - Params: `card_id` (required)
    - Returns: checklist id, name, items (with checked status)

18. **create_checklist** — Create a checklist on a card
    - Params: `card_id` (required), `name` (required)
    - Returns: created checklist

19. **add_checklist_item** — Add an item to a checklist
    - Params: `checklist_id` (required), `name` (required), `checked` (optional, default false)

### Comment Tools
20. **add_comment** — Add a comment to a card
    - Params: `card_id` (required), `text` (required)

### Search Tool
21. **search** — Search across all boards
    - Params: `query` (required), `board_id` (optional, restrict to one board)
    - Returns: matching cards, boards, lists

## Project Structure
```
mcp-trello/
├── src/
│   ├── index.ts              # Entry point, MCP server setup
│   ├── trello-client.ts      # Trello API client (fetch wrapper)
│   ├── tools/
│   │   ├── boards.ts         # Board tools
│   │   ├── lists.ts          # List tools
│   │   ├── cards.ts          # Card tools
│   │   ├── labels.ts         # Label tools
│   │   ├── checklists.ts     # Checklist tools
│   │   ├── comments.ts       # Comment tools
│   │   └── search.ts         # Search tool
│   └── types.ts              # Trello API types
├── tests/
│   ├── trello-client.test.ts # API client tests (mocked)
│   ├── tools/
│   │   ├── boards.test.ts
│   │   ├── lists.test.ts
│   │   ├── cards.test.ts
│   │   ├── labels.test.ts
│   │   ├── checklists.test.ts
│   │   ├── comments.test.ts
│   │   └── search.test.ts
│   └── helpers.ts            # Test utilities
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
├── README.md
└── LICENSE
```

## MCP Server Configuration
The server should be configurable via env vars and usable in any MCP client:

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

## Testing Strategy
- Mock the Trello API (no real API calls in tests)
- Unit tests for each tool handler
- Integration tests for the MCP server lifecycle
- Test error handling (invalid IDs, API errors, rate limits)
- Minimum 80% coverage

## README Requirements
- What it does + why (no Trello MCP exists)
- Installation: `npx mcp-trello` or `npm install -g mcp-trello`
- Configuration for Claude, Cursor, Gemini, Codex
- Available tools list with descriptions
- Example: "Move all cards from Backlog to In Progress"
- Getting your Trello API key + token
- Badge for npm version, license

## Quality
- Strict TypeScript
- Proper error messages (Trello errors are descriptive)
- Rate limiting awareness (100 requests/10s per token)
- Works with any MCP client (Claude, Cursor, Codex, Gemini)
