import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { TrelloClient, QueryParams } from '../trello-client.js';
import type { TrelloSearchResult } from '../types.js';
import { textResult, errorResult } from './shared.js';

export function registerSearchTools(server: McpServer, client: TrelloClient): void {
  server.tool(
    'search',
    'Search across Trello boards, lists, and cards. Optionally restrict to a single board.',
    {
      query: z.string().min(1).describe('Search query text'),
      board_id: z
        .string()
        .optional()
        .describe('Optional board ID to restrict the search to a single board'),
    },
    async ({ query, board_id }) => {
      try {
        const params: QueryParams = {
          query,
          modelTypes: 'cards,boards,members',
          cards_limit: 50,
          boards_limit: 25,
          card_fields: 'name,desc,due,idList,idBoard,labels,url,closed',
          board_fields: 'name,desc,url,closed',
          partial: true,
        };
        if (board_id) {
          params.idBoards = board_id;
        }
        const result = await client.get<TrelloSearchResult>('/search', params);
        return textResult({
          cards: result.cards ?? [],
          boards: result.boards ?? [],
        });
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
