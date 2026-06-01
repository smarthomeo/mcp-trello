#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const TRELLO_API_KEY = process.env.TRELLO_API_KEY;
const TRELLO_TOKEN = process.env.TRELLO_TOKEN;

if (!TRELLO_API_KEY || !TRELLO_TOKEN) {
  console.error('Error: TRELLO_API_KEY and TRELLO_TOKEN environment variables are required.');
  console.error('Get your key at: https://trello.com/power-ups/admin/');
  console.error('Get your token at: https://trello.com/1/authorize?expiration=never&scope=read,write&response_type=token&key=YOUR_KEY');
  process.exit(1);
}

const server = new McpServer({
  name: 'mcp-trello',
  version: '0.1.0',
});

// TODO: Register tools - see SPEC.md

const transport = new StdioServerTransport();
await server.connect(transport);
