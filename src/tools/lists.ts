import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { TrelloClient } from '../trello-client.js';
import type { TrelloList } from '../types.js';
import { textResult, errorResult } from './shared.js';

export function registerListTools(server: McpServer, client: TrelloClient): void {
  server.tool(
    'get_lists',
    'Get all lists on a Trello board.',
    {
      board_id: z.string().min(1).describe('The ID of the board'),
    },
    async ({ board_id }) => {
      try {
        const lists = await client.get<TrelloList[]>(
          `/boards/${board_id}/lists`,
          {
            fields: 'name,closed,idBoard,pos,subscribed',
            filter: 'all',
          },
        );
        const summary = lists.map((list) => ({
          id: list.id,
          name: list.name,
          position: list.pos,
          closed: list.closed,
        }));
        return textResult(summary);
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    'create_list',
    'Create a new list on a Trello board.',
    {
      board_id: z.string().min(1).describe('The ID of the board'),
      name: z.string().min(1).describe('Name of the new list'),
    },
    async ({ board_id, name }) => {
      try {
        const list = await client.post<TrelloList>('/lists', {
          name,
          idBoard: board_id,
        });
        return textResult(list);
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    'archive_list',
    'Archive or unarchive a Trello list.',
    {
      list_id: z.string().min(1).describe('The ID of the list to archive/unarchive'),
      archive: z
        .boolean()
        .optional()
        .describe('Whether to archive (true) or unarchive (false). Defaults to true.'),
    },
    async ({ list_id, archive }) => {
      try {
        const shouldArchive = archive ?? true;
        const list = await client.put<TrelloList>(`/lists/${list_id}/closed`, {
          value: shouldArchive,
        });
        return textResult(list);
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
