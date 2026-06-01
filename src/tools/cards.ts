import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { TrelloClient, QueryParams } from '../trello-client.js';
import type { TrelloCard, TrelloList } from '../types.js';
import { textResult, errorResult } from './shared.js';

const positionSchema = z
  .union([z.enum(['top', 'bottom']), z.number()])
  .describe('Position: "top", "bottom", or a numeric position value');

function normalizePosition(pos: 'top' | 'bottom' | number | undefined): string | number | undefined {
  if (pos === undefined) return undefined;
  return pos;
}

export function registerCardTools(server: McpServer, client: TrelloClient): void {
  server.tool(
    'get_cards',
    'Get all cards on a Trello board or list. Provide either board_id or list_id.',
    {
      board_id: z.string().optional().describe('The ID of the board to get cards from'),
      list_id: z.string().optional().describe('The ID of the list to get cards from'),
    },
    async ({ board_id, list_id }) => {
      try {
        if (!board_id && !list_id) {
          return errorResult(
            new Error('Either board_id or list_id must be provided'),
          );
        }
        const path = list_id
          ? `/lists/${list_id}/cards`
          : `/boards/${board_id}/cards`;
        const cards = await client.get<TrelloCard[]>(path, {
          fields:
            'name,desc,due,dueComplete,idList,idBoard,idLabels,labels,url,shortUrl,closed,pos,dateLastActivity',
        });
        let listLookup: Map<string, string> = new Map();
        if (board_id) {
          try {
            const lists = await client.get<TrelloList[]>(`/boards/${board_id}/lists`, {
              fields: 'name',
              filter: 'all',
            });
            listLookup = new Map(lists.map((l) => [l.id, l.name]));
          } catch {
            // ignore enrichment failure
          }
        }
        const summary = cards.map((card) => ({
          id: card.id,
          name: card.name,
          description: card.desc ?? '',
          due_date: card.due ?? null,
          due_complete: card.dueComplete ?? false,
          labels: (card.labels ?? []).map((l) => ({
            id: l.id,
            name: l.name,
            color: l.color,
          })),
          list_id: card.idList,
          list_name: listLookup.get(card.idList),
          url: card.url,
          closed: card.closed,
          position: card.pos,
        }));
        return textResult(summary);
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    'get_card',
    'Get a specific Trello card with full details including checklists, comments, and attachments.',
    {
      card_id: z.string().min(1).describe('The ID of the card to retrieve'),
    },
    async ({ card_id }) => {
      try {
        const card = await client.get<TrelloCard>(`/cards/${card_id}`, {
          checklists: 'all',
          attachments: 'true',
          actions: 'commentCard',
          fields: 'all',
        });
        return textResult(card);
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    'create_card',
    'Create a new Trello card in a list.',
    {
      list_id: z.string().min(1).describe('The ID of the list to create the card in'),
      name: z.string().min(1).describe('Name of the new card'),
      description: z.string().optional().describe('Optional description for the card'),
      due_date: z
        .string()
        .optional()
        .describe('Optional due date in ISO 8601 format (e.g. "2025-12-31T23:59:00Z")'),
      labels: z
        .array(z.string())
        .optional()
        .describe('Optional array of label IDs to attach to the card'),
      position: positionSchema.optional(),
    },
    async ({ list_id, name, description, due_date, labels, position }) => {
      try {
        const query: QueryParams = {
          idList: list_id,
          name,
        };
        if (description !== undefined) query.desc = description;
        if (due_date !== undefined) query.due = due_date;
        if (labels !== undefined && labels.length > 0) query.idLabels = labels;
        const pos = normalizePosition(position);
        if (pos !== undefined) query.pos = pos;
        const card = await client.post<TrelloCard>('/cards', query);
        return textResult(card);
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    'update_card',
    'Update fields on a Trello card.',
    {
      card_id: z.string().min(1).describe('The ID of the card to update'),
      name: z.string().optional().describe('New name for the card'),
      description: z.string().optional().describe('New description for the card'),
      due_date: z
        .string()
        .nullable()
        .optional()
        .describe('New due date in ISO 8601 format, or null to clear'),
      position: positionSchema.optional(),
    },
    async ({ card_id, name, description, due_date, position }) => {
      try {
        const query: QueryParams = {};
        if (name !== undefined) query.name = name;
        if (description !== undefined) query.desc = description;
        if (due_date !== undefined) query.due = due_date;
        const pos = normalizePosition(position);
        if (pos !== undefined) query.pos = pos;
        if (Object.keys(query).length === 0) {
          return errorResult(
            new Error('At least one field must be provided to update'),
          );
        }
        const card = await client.put<TrelloCard>(`/cards/${card_id}`, query);
        return textResult(card);
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    'move_card',
    'Move a Trello card to a different list.',
    {
      card_id: z.string().min(1).describe('The ID of the card to move'),
      list_id: z.string().min(1).describe('The ID of the destination list'),
      position: positionSchema.optional(),
    },
    async ({ card_id, list_id, position }) => {
      try {
        const query: QueryParams = { idList: list_id };
        const pos = normalizePosition(position);
        if (pos !== undefined) query.pos = pos;
        const card = await client.put<TrelloCard>(`/cards/${card_id}`, query);
        return textResult(card);
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    'delete_card',
    'Permanently delete a Trello card.',
    {
      card_id: z.string().min(1).describe('The ID of the card to delete'),
    },
    async ({ card_id }) => {
      try {
        await client.delete(`/cards/${card_id}`);
        return textResult({ success: true, deleted_card_id: card_id });
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
