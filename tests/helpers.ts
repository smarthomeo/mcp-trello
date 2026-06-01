import { vi } from 'vitest';
import { TrelloClient } from '../src/trello-client.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export interface FetchCall {
  url: string;
  method: string;
  body?: unknown;
  headers?: Record<string, string>;
}

export interface MockResponse {
  status?: number;
  statusText?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

export type FetchHandler = (
  call: FetchCall,
) => MockResponse | Promise<MockResponse>;

export interface MockFetch {
  fetch: typeof fetch;
  calls: FetchCall[];
  setHandler(handler: FetchHandler): void;
  enqueue(response: MockResponse): void;
}

export function createMockFetch(): MockFetch {
  const calls: FetchCall[] = [];
  const queue: MockResponse[] = [];
  let handler: FetchHandler | null = null;

  const setHandler = (h: FetchHandler) => {
    handler = h;
  };

  const enqueue = (response: MockResponse) => {
    queue.push(response);
  };

  const fetchImpl: typeof fetch = vi.fn(async (input: any, init?: any) => {
    const url =
      typeof input === 'string' || input instanceof URL
        ? String(input)
        : input.url;
    const method = init?.method ?? 'GET';
    let body: unknown = undefined;
    if (init?.body) {
      try {
        body = JSON.parse(init.body as string);
      } catch {
        body = init.body;
      }
    }
    const call: FetchCall = {
      url,
      method,
      body,
      headers: init?.headers as Record<string, string> | undefined,
    };
    calls.push(call);

    let response: MockResponse | undefined;
    if (handler) {
      response = await handler(call);
    } else if (queue.length > 0) {
      response = queue.shift();
    }
    if (!response) {
      response = { status: 200, body: {} };
    }
    const status = response.status ?? 200;
    const statusText = response.statusText ?? (status === 200 ? 'OK' : 'Error');
    const isJson = typeof response.body !== 'string';
    const bodyText = isJson
      ? JSON.stringify(response.body ?? {})
      : (response.body as string);
    const headers = new Headers(response.headers ?? {});
    if (isJson && !headers.has('content-type')) {
      headers.set('content-type', 'application/json');
    }
    return new Response(bodyText, {
      status,
      statusText,
      headers,
    });
  }) as unknown as typeof fetch;

  return {
    fetch: fetchImpl,
    calls,
    setHandler,
    enqueue,
  };
}

export function createTestClient(mockFetch: MockFetch): TrelloClient {
  return new TrelloClient({
    apiKey: 'test-key',
    token: 'test-token',
    fetch: mockFetch.fetch,
  });
}

type ToolHandler = (
  args: Record<string, unknown>,
  extra: any,
) => Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }>;

interface RegisteredToolEntry {
  handler: ToolHandler;
  description?: string;
  enabled: boolean;
}

export async function callTool(
  server: McpServer,
  name: string,
  args: Record<string, unknown> = {},
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  const registered = (server as unknown as {
    _registeredTools: Record<string, RegisteredToolEntry>;
  })._registeredTools;
  const entry = registered[name];
  if (!entry) {
    throw new Error(`Tool not registered: ${name}`);
  }
  const extra = {
    signal: new AbortController().signal,
    requestId: 1,
    sendNotification: async () => {},
    sendRequest: async () => ({}) as never,
  };
  const result = await entry.handler(args, extra);
  return result as {
    content: Array<{ type: string; text: string }>;
    isError?: boolean;
  };
}

export function parseToolText<T = unknown>(result: {
  content: Array<{ type: string; text: string }>;
}): T {
  const text = result.content[0]?.text;
  if (!text) {
    throw new Error('No text content in tool result');
  }
  return JSON.parse(text) as T;
}

export function getRegisteredToolNames(server: McpServer): string[] {
  const registered = (server as unknown as {
    _registeredTools: Record<string, unknown>;
  })._registeredTools;
  return Object.keys(registered);
}
