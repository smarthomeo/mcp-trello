import { describe, expect, it, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerCardTools } from '../../src/tools/cards.js';
import {
  callTool,
  createMockFetch,
  createTestClient,
  parseToolText,
  MockFetch,
} from '../helpers.js';

function createServer(mockFetch: MockFetch): McpServer {
  const server = new McpServer({ name: 'test', version: '1.0.0' });
  const client = createTestClient(mockFetch);
  registerCardTools(server, client);
  return server;
}

describe('card tools', () => {
  let mockFetch: MockFetch;
  let server: McpServer;

  beforeEach(() => {
    mockFetch = createMockFetch();
    server = createServer(mockFetch);
  });

  describe('get_cards', () => {
    it('returns an error if neither board_id nor list_id is provided', async () => {
      const result = await callTool(server, 'get_cards', {});
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/board_id or list_id/);
    });

    it('gets cards from a list', async () => {
      mockFetch.enqueue({
        body: [
          {
            id: 'c1',
            name: 'Card 1',
            desc: 'desc',
            idList: 'l1',
            idBoard: 'b1',
            labels: [],
            url: 'https://trello.com/c/c1',
            closed: false,
            pos: 1,
          },
        ],
      });
      const result = await callTool(server, 'get_cards', { list_id: 'l1' });
      expect(result.isError).toBeFalsy();
      const data = parseToolText<any[]>(result);
      expect(data).toHaveLength(1);
      expect(data[0].id).toBe('c1');
      expect(data[0].list_id).toBe('l1');
      expect(mockFetch.calls[0].url).toContain('/lists/l1/cards');
    });

    it('gets cards from a board and enriches with list names', async () => {
      mockFetch.setHandler(({ url }) => {
        if (url.includes('/boards/b1/cards')) {
          return {
            body: [
              {
                id: 'c1',
                name: 'Card 1',
                desc: '',
                idList: 'l1',
                idBoard: 'b1',
                labels: [{ id: 'lb1', name: 'bug', color: 'red' }],
                url: 'https://trello.com/c/c1',
                closed: false,
                pos: 1,
                due: null,
              },
            ],
          };
        }
        if (url.includes('/boards/b1/lists')) {
          return {
            body: [
              { id: 'l1', name: 'To Do' },
              { id: 'l2', name: 'Done' },
            ],
          };
        }
        return { status: 404, body: 'not found' };
      });
      const result = await callTool(server, 'get_cards', { board_id: 'b1' });
      expect(result.isError).toBeFalsy();
      const data = parseToolText<any[]>(result);
      expect(data).toHaveLength(1);
      expect(data[0].list_name).toBe('To Do');
      expect(data[0].labels).toEqual([
        { id: 'lb1', name: 'bug', color: 'red' },
      ]);
    });

    it('still returns cards if list enrichment fails', async () => {
      mockFetch.setHandler(({ url }) => {
        if (url.includes('/boards/b1/cards')) {
          return {
            body: [
              {
                id: 'c1',
                name: 'C',
                idList: 'l1',
                idBoard: 'b1',
                labels: [],
                url: 'u',
                closed: false,
                pos: 1,
              },
            ],
          };
        }
        return { status: 500, body: 'oops' };
      });
      const result = await callTool(server, 'get_cards', { board_id: 'b1' });
      expect(result.isError).toBeFalsy();
      const data = parseToolText<any[]>(result);
      expect(data[0].list_name).toBeUndefined();
    });
  });

  describe('get_card', () => {
    it('fetches a card with checklists and attachments', async () => {
      mockFetch.enqueue({
        body: {
          id: 'c1',
          name: 'Card',
          checklists: [{ id: 'cl1', name: 'Tasks', checkItems: [] }],
          attachments: [],
          actions: [],
          idBoard: 'b1',
          idList: 'l1',
          url: 'u',
          closed: false,
          pos: 1,
        },
      });
      const result = await callTool(server, 'get_card', { card_id: 'c1' });
      expect(result.isError).toBeFalsy();
      const data = parseToolText<any>(result);
      expect(data.id).toBe('c1');
      expect(data.checklists).toHaveLength(1);
      const url = mockFetch.calls[0].url;
      expect(url).toContain('/cards/c1');
      expect(url).toContain('checklists=all');
      expect(url).toContain('attachments=true');
      expect(url).toContain('actions=commentCard');
    });

    it('returns error if API fails', async () => {
      mockFetch.enqueue({ status: 404, body: 'missing' });
      const result = await callTool(server, 'get_card', { card_id: 'x' });
      expect(result.isError).toBe(true);
    });
  });

  describe('create_card', () => {
    it('creates a card with required fields', async () => {
      mockFetch.enqueue({
        body: {
          id: 'c-new',
          name: 'New Card',
          idList: 'l1',
          idBoard: 'b1',
          url: 'u',
          closed: false,
          pos: 1,
        },
      });
      const result = await callTool(server, 'create_card', {
        list_id: 'l1',
        name: 'New Card',
      });
      expect(result.isError).toBeFalsy();
      const data = parseToolText<any>(result);
      expect(data.id).toBe('c-new');
      const call = mockFetch.calls[0];
      expect(call.method).toBe('POST');
      expect(call.url).toContain('/cards');
      expect(call.url).toContain('idList=l1');
      expect(call.url).toContain('name=New+Card');
    });

    it('passes optional fields including labels and position', async () => {
      mockFetch.enqueue({ body: { id: 'c', name: 'n', idList: 'l1', idBoard: 'b', url: 'u', closed: false, pos: 1 } });
      await callTool(server, 'create_card', {
        list_id: 'l1',
        name: 'n',
        description: 'desc',
        due_date: '2026-01-01T00:00:00Z',
        labels: ['lb1', 'lb2'],
        position: 'top',
      });
      const url = mockFetch.calls[0].url;
      expect(url).toContain('desc=desc');
      expect(url).toContain('due=2026-01-01T00%3A00%3A00Z');
      expect(url).toContain('idLabels=lb1%2Clb2');
      expect(url).toContain('pos=top');
    });

    it('passes numeric position', async () => {
      mockFetch.enqueue({ body: { id: 'c', name: 'n', idList: 'l1', idBoard: 'b', url: 'u', closed: false, pos: 1024 } });
      await callTool(server, 'create_card', {
        list_id: 'l1',
        name: 'n',
        position: 1024,
      });
      expect(mockFetch.calls[0].url).toContain('pos=1024');
    });

    it('returns error on API failure', async () => {
      mockFetch.enqueue({ status: 400, body: 'oops' });
      const result = await callTool(server, 'create_card', {
        list_id: 'l1',
        name: 'X',
      });
      expect(result.isError).toBe(true);
    });
  });

  describe('update_card', () => {
    it('updates fields on a card', async () => {
      mockFetch.enqueue({ body: { id: 'c1', name: 'Renamed', idList: 'l1', idBoard: 'b1', url: 'u', closed: false, pos: 1 } });
      const result = await callTool(server, 'update_card', {
        card_id: 'c1',
        name: 'Renamed',
        description: 'updated desc',
      });
      expect(result.isError).toBeFalsy();
      const call = mockFetch.calls[0];
      expect(call.method).toBe('PUT');
      expect(call.url).toContain('/cards/c1');
      expect(call.url).toContain('name=Renamed');
      expect(call.url).toContain('desc=updated+desc');
    });

    it('accepts numeric position', async () => {
      mockFetch.enqueue({ body: { id: 'c1', name: 'n', idList: 'l', idBoard: 'b', url: 'u', closed: false, pos: 500 } });
      await callTool(server, 'update_card', {
        card_id: 'c1',
        position: 500,
      });
      expect(mockFetch.calls[0].url).toContain('pos=500');
    });

    it('returns error when no fields are provided', async () => {
      const result = await callTool(server, 'update_card', { card_id: 'c1' });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/At least one field/);
    });

    it('returns error on API failure', async () => {
      mockFetch.enqueue({ status: 400, body: 'bad' });
      const result = await callTool(server, 'update_card', {
        card_id: 'c1',
        name: 'X',
      });
      expect(result.isError).toBe(true);
    });
  });

  describe('move_card', () => {
    it('moves a card to a new list', async () => {
      mockFetch.enqueue({ body: { id: 'c1', idList: 'l2', name: 'n', idBoard: 'b1', url: 'u', closed: false, pos: 1 } });
      const result = await callTool(server, 'move_card', {
        card_id: 'c1',
        list_id: 'l2',
      });
      expect(result.isError).toBeFalsy();
      const call = mockFetch.calls[0];
      expect(call.method).toBe('PUT');
      expect(call.url).toContain('/cards/c1');
      expect(call.url).toContain('idList=l2');
    });

    it('moves a card to a position', async () => {
      mockFetch.enqueue({ body: { id: 'c1', idList: 'l2', name: 'n', idBoard: 'b1', url: 'u', closed: false, pos: 1 } });
      await callTool(server, 'move_card', {
        card_id: 'c1',
        list_id: 'l2',
        position: 'bottom',
      });
      expect(mockFetch.calls[0].url).toContain('pos=bottom');
    });

    it('returns error on API failure', async () => {
      mockFetch.enqueue({ status: 404, body: 'no' });
      const result = await callTool(server, 'move_card', {
        card_id: 'c1',
        list_id: 'l2',
      });
      expect(result.isError).toBe(true);
    });
  });

  describe('delete_card', () => {
    it('deletes a card', async () => {
      mockFetch.enqueue({ body: { _value: null } });
      const result = await callTool(server, 'delete_card', { card_id: 'c1' });
      expect(result.isError).toBeFalsy();
      const data = parseToolText<{ success: boolean; deleted_card_id: string }>(result);
      expect(data.success).toBe(true);
      expect(data.deleted_card_id).toBe('c1');
      const call = mockFetch.calls[0];
      expect(call.method).toBe('DELETE');
      expect(call.url).toContain('/cards/c1');
    });

    it('returns error on API failure', async () => {
      mockFetch.enqueue({ status: 404, body: 'no' });
      const result = await callTool(server, 'delete_card', { card_id: 'x' });
      expect(result.isError).toBe(true);
    });
  });
});
