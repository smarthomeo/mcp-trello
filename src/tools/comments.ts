import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { TrelloClient } from '../trello-client.js';
import type { TrelloAction } from '../types.js';
import { textResult, errorResult } from './shared.js';

export function registerCommentTools(server: McpServer, client: TrelloClient): void {
  server.tool(
    'add_comment',
    'Add a comment to a Trello card.',
    {
      card_id: z.string().min(1).describe('The ID of the card to comment on'),
      text: z.string().min(1).describe('The comment text'),
    },
    async ({ card_id, text }) => {
      try {
        const action = await client.post<TrelloAction>(
          `/cards/${card_id}/actions/comments`,
          { text },
        );
        return textResult(action);
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
