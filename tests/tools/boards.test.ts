import { describe, expect, it, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerBoardTools } from '../../src/tools/boards.js';
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
  registerBoardTools(server, client);
  return server;
}

describe('board tools', () => {
  let mockFetch: MockFetch;
  let server: McpServer;

  beforeEach(() => {
    mockFetch = createMockFetch();
    server = createServer(mockFetch);
  });

  describe('list_boards', () => {
    it('returns list of boards with summary fields', async () => {
      mockFetch.enqueue({
        body: [
          {
            id: 'b1',
            name: 'Board One',
            desc: 'First board',
            url: 'https://trello.com/b/b1',
            closed: false,
          },
          {
            id: 'b2',
            name: 'Board Two',
            desc: '',
            url: 'https://trello.com/b/b2',
            closed: true,
          },
        ],
      });
      const result = await callTool(server, 'list_boards');
      expect(result.isError).toBeFalsy();
      const data = parseToolText<unknown[]>(result);
      expect(data).toEqual([
        {
          id: 'b1',
          name: 'Board One',
          description: 'First board',
          url: 'https://trello.com/b/b1',
          closed: false,
        },
        {
          id: 'b2',
          name: 'Board Two',
          description: '',
          url: 'https://trello.com/b/b2',
          closed: true,
        },
      ]);
      expect(mockFetch.calls[0].url).toContain('/members/me/boards');
    });

    it('returns error on API failure', async () => {
      mockFetch.enqueue({ status: 401, statusText: 'Unauthorized', body: 'bad' });
      const result = await callTool(server, 'list_boards');
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('401');
    });
  });

  describe('get_board', () => {
    it('fetches a specific board with lists/labels/members', async () => {
      mockFetch.enqueue({
        body: {
          id: 'b1',
          name: 'My Board',
          desc: 'Desc',
          url: 'https://trello.com/b/b1',
          closed: false,
          lists: [{ id: 'l1', name: 'To Do' }],
          labels: [{ id: 'lb1', name: 'urgent', color: 'red' }],
          members: [{ id: 'm1', fullName: 'Alice' }],
        },
      });
      const result = await callTool(server, 'get_board', { board_id: 'b1' });
      expect(result.isError).toBeFalsy();
      const data = parseToolText<any>(result);
      expect(data.id).toBe('b1');
      expect(data.lists).toHaveLength(1);
      expect(data.labels).toHaveLength(1);
      expect(data.members).toHaveLength(1);
      expect(mockFetch.calls[0].url).toContain('/boards/b1');
      expect(mockFetch.calls[0].url).toContain('lists=open');
      expect(mockFetch.calls[0].url).toContain('labels=all');
      expect(mockFetch.calls[0].url).toContain('members=all');
    });

    it('returns error on missing board', async () => {
      mockFetch.enqueue({ status: 404, body: 'not found' });
      const result = await callTool(server, 'get_board', { board_id: 'xxx' });
      expect(result.isError).toBe(true);
    });
  });

  describe('create_board', () => {
    it('creates a board with name', async () => {
      mockFetch.enqueue({
        body: {
          id: 'new-id',
          name: 'New Board',
          url: 'https://trello.com/b/new',
          closed: false,
        },
      });
      const result = await callTool(server, 'create_board', {
        name: 'New Board',
      });
      expect(result.isError).toBeFalsy();
      const data = parseToolText<{ id: string }>(result);
      expect(data.id).toBe('new-id');
      const call = mockFetch.calls[0];
      expect(call.method).toBe('POST');
      expect(call.url).toContain('/boards');
      expect(call.url).toContain('name=New+Board');
      expect(call.url).toContain('defaultLists=true');
    });

    it('passes description and default_lists when provided', async () => {
      mockFetch.enqueue({ body: { id: 'x', name: 'X', url: 'u', closed: false } });
      await callTool(server, 'create_board', {
        name: 'X',
        description: 'A description',
        default_lists: false,
      });
      const call = mockFetch.calls[0];
      expect(call.url).toContain('desc=A+description');
      expect(call.url).toContain('defaultLists=false');
    });

    it('returns error on API failure', async () => {
      mockFetch.enqueue({ status: 400, body: 'invalid' });
      const result = await callTool(server, 'create_board', { name: 'X' });
      expect(result.isError).toBe(true);
    });
  });
});
