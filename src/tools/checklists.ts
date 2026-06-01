import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { TrelloClient } from '../trello-client.js';
import type { TrelloCheckItem, TrelloChecklist } from '../types.js';
import { textResult, errorResult } from './shared.js';

export function registerChecklistTools(server: McpServer, client: TrelloClient): void {
  server.tool(
    'get_checklists',
    'Get all checklists on a Trello card.',
    {
      card_id: z.string().min(1).describe('The ID of the card'),
    },
    async ({ card_id }) => {
      try {
        const checklists = await client.get<TrelloChecklist[]>(
          `/cards/${card_id}/checklists`,
          { checkItems: 'all', fields: 'name,idCard,pos' },
        );
        const summary = checklists.map((cl) => ({
          id: cl.id,
          name: cl.name,
          position: cl.pos,
          items: (cl.checkItems ?? []).map((item) => ({
            id: item.id,
            name: item.name,
            checked: item.state === 'complete',
            position: item.pos,
          })),
        }));
        return textResult(summary);
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    'create_checklist',
    'Create a new checklist on a Trello card.',
    {
      card_id: z.string().min(1).describe('The ID of the card'),
      name: z.string().min(1).describe('Name of the new checklist'),
    },
    async ({ card_id, name }) => {
      try {
        const checklist = await client.post<TrelloChecklist>('/checklists', {
          idCard: card_id,
          name,
        });
        return textResult(checklist);
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    'add_checklist_item',
    'Add an item to an existing checklist.',
    {
      checklist_id: z.string().min(1).describe('The ID of the checklist'),
      name: z.string().min(1).describe('Name of the new checklist item'),
      checked: z
        .boolean()
        .optional()
        .describe('Whether the item should start as checked. Defaults to false.'),
    },
    async ({ checklist_id, name, checked }) => {
      try {
        const item = await client.post<TrelloCheckItem>(
          `/checklists/${checklist_id}/checkItems`,
          {
            name,
            checked: checked ?? false,
          },
        );
        return textResult(item);
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
