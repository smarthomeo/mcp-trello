import { describe, test, expect, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerChecklistTools } from '../../src/tools/checklists.js';
import { callTool, createMockFetch, createTestClient, MockFetch } from '../helpers.js';

function makeChecklist(overrides = {}) {
  return {
    id: 'chk_1', name: 'Launch Checklist', idBoard: 'board_1', idCard: 'card_1', pos: 1,
    checkItems: [
      { id: 'ci_1', name: 'Deploy to staging', state: 'complete', pos: 1 },
      { id: 'ci_2', name: 'Run tests', state: 'incomplete', pos: 2 },
    ],
    ...overrides,
  };
}

function createServer(mockFetch: MockFetch) {
  const server = new McpServer({ name: 'test', version: '1.0.0' });
  const client = createTestClient(mockFetch);
  registerChecklistTools(server, client);
  return { server, client };
}

describe('checklist tools', () => {
  let mockFetch: MockFetch;

  beforeEach(() => { mockFetch = createMockFetch(); });

  test('get_checklists returns checklists for a card', async () => {
    mockFetch.enqueue({ status: 200, body: [makeChecklist()] });
    const { server } = createServer(mockFetch);
    const result = await callTool(server, 'get_checklists', { card_id: 'card_1' });
    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('chk_1');
    expect(result.content[0].text).toContain('Launch Checklist');
  });

  test('create_checklist creates a checklist on a card', async () => {
    mockFetch.enqueue({ status: 200, body: makeChecklist({ id: 'chk_new' }) });
    const { server } = createServer(mockFetch);
    const result = await callTool(server, 'create_checklist', { card_id: 'card_1', name: 'Launch Checklist' });
    expect(result.isError).toBeFalsy();
  });

  test('add_checklist_item adds an item to a checklist', async () => {
    mockFetch.enqueue({ status: 200, body: { id: 'ci_new', name: 'New item', state: 'incomplete' } });
    const { server } = createServer(mockFetch);
    const result = await callTool(server, 'add_checklist_item', { checklist_id: 'chk_1', name: 'New item' });
    expect(result.isError).toBeFalsy();
  });

  test('add_checklist_item with checked=true', async () => {
    mockFetch.enqueue({ status: 200, body: { id: 'ci_new', name: 'Done', state: 'complete' } });
    const { server } = createServer(mockFetch);
    const result = await callTool(server, 'add_checklist_item', { checklist_id: 'chk_1', name: 'Done', checked: true });
    expect(result.isError).toBeFalsy();
  });

  test('get_checklists handles API error', async () => {
    mockFetch.enqueue({ status: 404, statusText: 'Not Found', body: 'Card not found' });
    const { server } = createServer(mockFetch);
    const result = await callTool(server, 'get_checklists', { card_id: 'bad_id' });
    expect(result.isError).toBe(true);
  });
});
