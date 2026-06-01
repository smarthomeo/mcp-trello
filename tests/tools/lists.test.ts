import { describe, expect, it, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerListTools } from '../../src/tools/lists.js';
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
  registerListTools(server, client);
  return server;
}

describe('list tools', () => {
  let mockFetch: MockFetch;
  let server: McpServer;

  beforeEach(() => {
    mockFetch = createMockFetch();
    server = createServer(mockFetch);
  });

  describe('get_lists', () => {
    it('returns lists for board', async () => {
      mockFetch.enqueue({
        body: [
          { id: 'l1', name: 'Backlog', closed: false, pos: 65535, idBoard: 'b1' },
          { id: 'l2', name: 'Done', closed: true, pos: 131071, idBoard: 'b1' },
        ],
      });
      const result = await callTool(server, 'get_lists', { board_id: 'b1' });
      expect(result.isError).toBeFalsy();
      const data = parseToolText<any[]>(result);
      expect(data).toEqual([
        { id: 'l1', name: 'Backlog', position: 65535, closed: false },
        { id: 'l2', name: 'Done', position: 131071, closed: true },
      ]);
      expect(mockFetch.calls[0].url).toContain('/boards/b1/lists');
    });

    it('returns error on API failure', async () => {
      mockFetch.enqueue({ status: 404, body: 'no board' });
      const result = await callTool(server, 'get_lists', { board_id: 'x' });
      expect(result.isError).toBe(true);
    });
  });

  describe('create_list', () => {
    it('creates a list on a board', async () => {
      mockFetch.enqueue({
        body: { id: 'l-new', name: 'Sprint 1', closed: false, idBoard: 'b1', pos: 16384 },
      });
      const result = await callTool(server, 'create_list', {
        board_id: 'b1',
        name: 'Sprint 1',
      });
      expect(result.isError).toBeFalsy();
      const data = parseToolText<any>(result);
      expect(data.id).toBe('l-new');
      const call = mockFetch.calls[0];
      expect(call.method).toBe('POST');
      expect(call.url).toContain('/lists');
      expect(call.url).toContain('name=Sprint+1');
      expect(call.url).toContain('idBoard=b1');
    });

    it('returns error on API failure', async () => {
      mockFetch.enqueue({ status: 400, body: 'bad' });
      const result = await callTool(server, 'create_list', {
        board_id: 'b1',
        name: 'X',
      });
      expect(result.isError).toBe(true);
    });
  });

  describe('archive_list', () => {
    it('archives a list with default archive=true', async () => {
      mockFetch.enqueue({ body: { id: 'l1', closed: true } });
      const result = await callTool(server, 'archive_list', { list_id: 'l1' });
      expect(result.isError).toBeFalsy();
      const call = mockFetch.calls[0];
      expect(call.method).toBe('PUT');
      expect(call.url).toContain('/lists/l1/closed');
      expect(call.url).toContain('value=true');
    });

    it('unarchives a list when archive=false', async () => {
      mockFetch.enqueue({ body: { id: 'l1', closed: false } });
      await callTool(server, 'archive_list', { list_id: 'l1', archive: false });
      const call = mockFetch.calls[0];
      expect(call.url).toContain('value=false');
    });

    it('returns error on API failure', async () => {
      mockFetch.enqueue({ status: 404, body: 'no list' });
      const result = await callTool(server, 'archive_list', { list_id: 'x' });
      expect(result.isError).toBe(true);
    });
  });
});
