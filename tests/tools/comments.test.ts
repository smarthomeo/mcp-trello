import { describe, test, expect, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerCommentTools } from '../../src/tools/comments.js';
import { callTool, createMockFetch, createTestClient, MockFetch } from '../helpers.js';

function createServer(mockFetch: MockFetch) {
  const server = new McpServer({ name: 'test', version: '1.0.0' });
  const client = createTestClient(mockFetch);
  registerCommentTools(server, client);
  return { server, client };
}

describe('comment tools', () => {
  let mockFetch: MockFetch;

  beforeEach(() => { mockFetch = createMockFetch(); });

  test('add_comment adds a comment to a card', async () => {
    mockFetch.enqueue({ status: 200, body: { id: 'action_1', data: { text: 'Looks good!' }, type: 'commentCard' } });
    const { server } = createServer(mockFetch);
    const result = await callTool(server, 'add_comment', { card_id: 'card_1', text: 'Looks good!' });
    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('Looks good!');
  });

  test('add_comment handles API error', async () => {
    mockFetch.enqueue({ status: 401, statusText: 'Unauthorized', body: 'Unauthorized' });
    const { server } = createServer(mockFetch);
    const result = await callTool(server, 'add_comment', { card_id: 'card_1', text: 'test' });
    expect(result.isError).toBe(true);
  });
});
