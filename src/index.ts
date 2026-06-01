#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { TrelloClient } from './trello-client.js';
import { registerBoardTools } from './tools/boards.js';
import { registerListTools } from './tools/lists.js';
import { registerCardTools } from './tools/cards.js';
import { registerLabelTools } from './tools/labels.js';
import { registerChecklistTools } from './tools/checklists.js';
import { registerCommentTools } from './tools/comments.js';
import { registerSearchTools } from './tools/search.js';

export function createServer(client: TrelloClient): McpServer {
  const server = new McpServer({
    name: 'mcp-trello',
    version: '0.1.0',
  });

  registerBoardTools(server, client);
  registerListTools(server, client);
  registerCardTools(server, client);
  registerLabelTools(server, client);
  registerChecklistTools(server, client);
  registerCommentTools(server, client);
  registerSearchTools(server, client);

  return server;
}

async function main(): Promise<void> {
  const TRELLO_API_KEY = process.env.TRELLO_API_KEY;
  const TRELLO_TOKEN = process.env.TRELLO_TOKEN;

  if (!TRELLO_API_KEY || !TRELLO_TOKEN) {
    console.error('Error: TRELLO_API_KEY and TRELLO_TOKEN environment variables are required.');
    console.error('Get your key at: https://trello.com/power-ups/admin/');
    console.error(
      'Get your token at: https://trello.com/1/authorize?expiration=never&scope=read,write&response_type=token&key=YOUR_KEY',
    );
    process.exit(1);
  }

  const client = new TrelloClient({
    apiKey: TRELLO_API_KEY,
    token: TRELLO_TOKEN,
  });

  const server = createServer(client);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { TrelloClient } from './trello-client.js';
export * from './types.js';
