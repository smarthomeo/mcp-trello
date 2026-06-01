import { describe, expect, it, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerLabelTools } from '../../src/tools/labels.js';
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
  registerLabelTools(server, client);
  return server;
}

describe('label tools', () => {
  let mockFetch: MockFetch;
  let server: McpServer;

  beforeEach(() => {
    mockFetch = createMockFetch();
    server = createServer(mockFetch);
  });

  describe('get_labels', () => {
    it('returns labels for a board', async () => {
      mockFetch.enqueue({
        body: [
          { id: 'lb1', name: 'bug', color: 'red', idBoard: 'b1' },
          { id: 'lb2', name: 'feature', color: 'green', idBoard: 'b1' },
        ],
      });
      const result = await callTool(server, 'get_labels', { board_id: 'b1' });
      expect(result.isError).toBeFalsy();
      const data = parseToolText<any[]>(result);
      expect(data).toEqual([
        { id: 'lb1', name: 'bug', color: 'red' },
        { id: 'lb2', name: 'feature', color: 'green' },
      ]);
      expect(mockFetch.calls[0].url).toContain('/boards/b1/labels');
    });

    it('returns error on API failure', async () => {
      mockFetch.enqueue({ status: 404, body: 'no' });
      const result = await callTool(server, 'get_labels', { board_id: 'x' });
      expect(result.isError).toBe(true);
    });
  });

  describe('create_label', () => {
    it('creates a new label', async () => {
      mockFetch.enqueue({
        body: { id: 'lb-new', name: 'urgent', color: 'orange', idBoard: 'b1' },
      });
      const result = await callTool(server, 'create_label', {
        board_id: 'b1',
        name: 'urgent',
        color: 'orange',
      });
      expect(result.isError).toBeFalsy();
      const data = parseToolText<any>(result);
      expect(data.id).toBe('lb-new');
      const call = mockFetch.calls[0];
      expect(call.method).toBe('POST');
      expect(call.url).toContain('/labels');
      expect(call.url).toContain('name=urgent');
      expect(call.url).toContain('color=orange');
      expect(call.url).toContain('idBoard=b1');
    });

    it('returns error on API failure', async () => {
      mockFetch.enqueue({ status: 400, body: 'bad' });
      const result = await callTool(server, 'create_label', {
        board_id: 'b1',
        name: 'x',
        color: 'red',
      });
      expect(result.isError).toBe(true);
    });
  });

  describe('add_label_to_card', () => {
    it('adds a label to a card', async () => {
      mockFetch.enqueue({ body: ['lb1'] });
      const result = await callTool(server, 'add_label_to_card', {
        card_id: 'c1',
        label_id: 'lb1',
      });
      expect(result.isError).toBeFalsy();
      const data = parseToolText<any>(result);
      expect(data.success).toBe(true);
      expect(data.card_id).toBe('c1');
      expect(data.label_id).toBe('lb1');
      const call = mockFetch.calls[0];
      expect(call.method).toBe('POST');
      expect(call.url).toContain('/cards/c1/idLabels');
      expect(call.url).toContain('value=lb1');
    });

    it('returns error on API failure', async () => {
      mockFetch.enqueue({ status: 400, body: 'bad' });
      const result = await callTool(server, 'add_label_to_card', {
        card_id: 'c1',
        label_id: 'lb1',
      });
      expect(result.isError).toBe(true);
    });
  });

  describe('remove_label_from_card', () => {
    it('removes a label from a card', async () => {
      mockFetch.enqueue({ body: { _value: null } });
      const result = await callTool(server, 'remove_label_from_card', {
        card_id: 'c1',
        label_id: 'lb1',
      });
      expect(result.isError).toBeFalsy();
      const data = parseToolText<any>(result);
      expect(data.success).toBe(true);
      const call = mockFetch.calls[0];
      expect(call.method).toBe('DELETE');
      expect(call.url).toContain('/cards/c1/idLabels/lb1');
    });

    it('returns error on API failure', async () => {
      mockFetch.enqueue({ status: 404, body: 'no' });
      const result = await callTool(server, 'remove_label_from_card', {
        card_id: 'c1',
        label_id: 'lb1',
      });
      expect(result.isError).toBe(true);
    });
  });
});
