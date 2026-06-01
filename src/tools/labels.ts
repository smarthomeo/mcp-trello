import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { TrelloClient } from '../trello-client.js';
import type { TrelloLabel } from '../types.js';
import { textResult, errorResult } from './shared.js';

const LABEL_COLORS = [
  'yellow',
  'purple',
  'blue',
  'red',
  'green',
  'orange',
  'black',
  'sky',
  'pink',
  'lime',
  'null',
] as const;

export function registerLabelTools(server: McpServer, client: TrelloClient): void {
  server.tool(
    'get_labels',
    'Get all labels on a Trello board.',
    {
      board_id: z.string().min(1).describe('The ID of the board'),
    },
    async ({ board_id }) => {
      try {
        const labels = await client.get<TrelloLabel[]>(
          `/boards/${board_id}/labels`,
          { fields: 'name,color,idBoard,uses' },
        );
        const summary = labels.map((label) => ({
          id: label.id,
          name: label.name,
          color: label.color,
        }));
        return textResult(summary);
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    'create_label',
    'Create a new label on a Trello board.',
    {
      board_id: z.string().min(1).describe('The ID of the board'),
      name: z.string().min(1).describe('Name of the new label'),
      color: z
        .enum(LABEL_COLORS)
        .describe(
          'Color of the label. One of: yellow, purple, blue, red, green, orange, black, sky, pink, lime, null',
        ),
    },
    async ({ board_id, name, color }) => {
      try {
        const label = await client.post<TrelloLabel>('/labels', {
          name,
          color,
          idBoard: board_id,
        });
        return textResult(label);
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    'add_label_to_card',
    'Add an existing label to a Trello card.',
    {
      card_id: z.string().min(1).describe('The ID of the card'),
      label_id: z.string().min(1).describe('The ID of the label to add'),
    },
    async ({ card_id, label_id }) => {
      try {
        await client.post(`/cards/${card_id}/idLabels`, { value: label_id });
        return textResult({
          success: true,
          card_id,
          label_id,
        });
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    'remove_label_from_card',
    'Remove a label from a Trello card.',
    {
      card_id: z.string().min(1).describe('The ID of the card'),
      label_id: z.string().min(1).describe('The ID of the label to remove'),
    },
    async ({ card_id, label_id }) => {
      try {
        await client.delete(`/cards/${card_id}/idLabels/${label_id}`);
        return textResult({
          success: true,
          card_id,
          label_id,
        });
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
