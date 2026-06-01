import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { TrelloClient } from '../trello-client.js';
import type { TrelloBoard } from '../types.js';
import { textResult, errorResult } from './shared.js';

export function registerBoardTools(server: McpServer, client: TrelloClient): void {
  server.tool(
    'list_boards',
    'List all Trello boards for the authenticated user.',
    {},
    async () => {
      try {
        const boards = await client.get<TrelloBoard[]>('/members/me/boards', {
          fields: 'name,desc,url,closed,shortUrl,idOrganization',
          filter: 'all',
        });
        const summary = boards.map((board) => ({
          id: board.id,
          name: board.name,
          description: board.desc ?? '',
          url: board.url,
          closed: board.closed,
        }));
        return textResult(summary);
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    'get_board',
    'Get details of a specific Trello board including lists, labels, and members.',
    {
      board_id: z.string().min(1).describe('The ID of the board to retrieve'),
    },
    async ({ board_id }) => {
      try {
        const board = await client.get<TrelloBoard>(`/boards/${board_id}`, {
          lists: 'open',
          labels: 'all',
          members: 'all',
          fields: 'name,desc,url,closed,shortUrl,idOrganization,prefs,dateLastActivity',
        });
        return textResult(board);
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    'create_board',
    'Create a new Trello board.',
    {
      name: z.string().min(1).describe('Name of the new board'),
      description: z.string().optional().describe('Optional description for the board'),
      default_lists: z
        .boolean()
        .optional()
        .describe('Whether to create default lists (To Do, Doing, Done). Defaults to true.'),
    },
    async ({ name, description, default_lists }) => {
      try {
        const board = await client.post<TrelloBoard>('/boards', {
          name,
          desc: description,
          defaultLists: default_lists ?? true,
        });
        return textResult(board);
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
