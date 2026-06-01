import { describe, test, expect, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerSearchTools } from '../../src/tools/search.js';
import { callTool, createMockFetch, createTestClient, MockFetch } from '../helpers.js';

function createServer(mockFetch: MockFetch) {
  const server = new McpServer({ name: 'test', version: '1.0.0' });
  const client = createTestClient(mockFetch);
  registerSearchTools(server, client);
  return { server, client };
}

describe('search tools', () => {
  let mockFetch: MockFetch;

  beforeEach(() => { mockFetch = createMockFetch(); });

  test('search returns matching cards', async () => {
    mockFetch.enqueue({ status: 200, body: {
      cards: [
        { id: 'card_1', name: 'Fix login bug', shortUrl: 'https://trello.com/c/abc' },
        { id: 'card_2', name: 'Bug in payments', shortUrl: 'https://trello.com/c/def' },
      ],
      boards: [],
    }});
    const { server } = createServer(mockFetch);
    const result = await callTool(server, 'search', { query: 'bug' });
    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('Fix login bug');
  });

  test('search with board_id restriction', async () => {
    mockFetch.enqueue({ status: 200, body: { cards: [{ id: 'card_1', name: 'Test' }], boards: [] } });
    const { server } = createServer(mockFetch);
    const result = await callTool(server, 'search', { query: 'test', board_id: 'board_1' });
    expect(result.isError).toBeFalsy();
  });

  test('search returns empty results', async () => {
    mockFetch.enqueue({ status: 200, body: { cards: [], boards: [] } });
    const { server } = createServer(mockFetch);
    const result = await callTool(server, 'search', { query: 'nonexistent' });
    expect(result.isError).toBeFalsy();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.cards).toEqual([]);
    expect(parsed.boards).toEqual([]);
  });

  test('search handles API error', async () => {
    mockFetch.enqueue({ status: 429, statusText: 'Rate limit exceeded', body: 'Rate limit' });
    const { server } = createServer(mockFetch);
    const result = await callTool(server, 'search', { query: 'test' });
    expect(result.isError).toBe(true);
  });
});
