import { describe, expect, it } from 'vitest';
import { TrelloApiError, TrelloClient } from '../src/trello-client.js';
import { createMockFetch } from './helpers.js';

describe('TrelloClient', () => {
  describe('constructor', () => {
    it('throws when apiKey is missing', () => {
      expect(
        () => new TrelloClient({ apiKey: '', token: 'tok' }),
      ).toThrowError(/apiKey is required/);
    });

    it('throws when token is missing', () => {
      expect(
        () => new TrelloClient({ apiKey: 'key', token: '' }),
      ).toThrowError(/token is required/);
    });

    it('uses default baseUrl', () => {
      const mockFetch = createMockFetch();
      const client = new TrelloClient({
        apiKey: 'k',
        token: 't',
        fetch: mockFetch.fetch,
      });
      const url = client.buildUrl('/boards');
      expect(url).toMatch(/^https:\/\/api\.trello\.com\/1\/boards/);
    });

    it('strips trailing slash on baseUrl', () => {
      const mockFetch = createMockFetch();
      const client = new TrelloClient({
        apiKey: 'k',
        token: 't',
        baseUrl: 'https://example.com/v1/',
        fetch: mockFetch.fetch,
      });
      const url = client.buildUrl('/boards');
      expect(url).toMatch(/^https:\/\/example\.com\/v1\/boards/);
    });
  });

  describe('buildUrl', () => {
    const mockFetch = createMockFetch();
    const client = new TrelloClient({
      apiKey: 'my-key',
      token: 'my-token',
      fetch: mockFetch.fetch,
    });

    it('includes key and token as query params', () => {
      const url = new URL(client.buildUrl('/boards'));
      expect(url.searchParams.get('key')).toBe('my-key');
      expect(url.searchParams.get('token')).toBe('my-token');
    });

    it('includes provided query params', () => {
      const url = new URL(
        client.buildUrl('/boards', { fields: 'name,desc', limit: 10 }),
      );
      expect(url.searchParams.get('fields')).toBe('name,desc');
      expect(url.searchParams.get('limit')).toBe('10');
    });

    it('serializes array params as comma-separated', () => {
      const url = new URL(
        client.buildUrl('/cards', { idLabels: ['a', 'b', 'c'] }),
      );
      expect(url.searchParams.get('idLabels')).toBe('a,b,c');
    });

    it('skips undefined and null params', () => {
      const url = new URL(
        client.buildUrl('/boards', { fields: undefined, name: null, x: 'y' }),
      );
      expect(url.searchParams.has('fields')).toBe(false);
      expect(url.searchParams.has('name')).toBe(false);
      expect(url.searchParams.get('x')).toBe('y');
    });

    it('adds leading slash if missing', () => {
      const url = client.buildUrl('boards');
      expect(url).toMatch(/\/boards\?/);
    });

    it('coerces boolean and number to strings', () => {
      const url = new URL(
        client.buildUrl('/boards', { closed: false, count: 5 }),
      );
      expect(url.searchParams.get('closed')).toBe('false');
      expect(url.searchParams.get('count')).toBe('5');
    });
  });

  describe('request methods', () => {
    it('GET returns parsed JSON', async () => {
      const mockFetch = createMockFetch();
      mockFetch.enqueue({ body: { id: 'abc', name: 'My Board' } });
      const client = new TrelloClient({
        apiKey: 'k',
        token: 't',
        fetch: mockFetch.fetch,
      });
      const result = await client.get<{ id: string; name: string }>(
        '/boards/abc',
      );
      expect(result).toEqual({ id: 'abc', name: 'My Board' });
      expect(mockFetch.calls).toHaveLength(1);
      expect(mockFetch.calls[0].method).toBe('GET');
      expect(mockFetch.calls[0].url).toContain('/boards/abc');
      expect(mockFetch.calls[0].url).toContain('key=k');
      expect(mockFetch.calls[0].url).toContain('token=t');
    });

    it('POST sends body as JSON when provided', async () => {
      const mockFetch = createMockFetch();
      mockFetch.enqueue({ body: { id: 'new' } });
      const client = new TrelloClient({
        apiKey: 'k',
        token: 't',
        fetch: mockFetch.fetch,
      });
      await client.request('POST', '/cards', {
        body: { foo: 'bar' },
      });
      expect(mockFetch.calls[0].method).toBe('POST');
      expect(mockFetch.calls[0].body).toEqual({ foo: 'bar' });
      const headers = mockFetch.calls[0].headers as Record<string, string>;
      expect(headers['Content-Type']).toBe('application/json');
    });

    it('POST sends params as query string', async () => {
      const mockFetch = createMockFetch();
      mockFetch.enqueue({ body: {} });
      const client = new TrelloClient({
        apiKey: 'k',
        token: 't',
        fetch: mockFetch.fetch,
      });
      await client.post('/cards', { name: 'Test', idList: 'l1' });
      const url = mockFetch.calls[0].url;
      expect(url).toContain('name=Test');
      expect(url).toContain('idList=l1');
    });

    it('PUT sends params correctly', async () => {
      const mockFetch = createMockFetch();
      mockFetch.enqueue({ body: { id: 'x' } });
      const client = new TrelloClient({
        apiKey: 'k',
        token: 't',
        fetch: mockFetch.fetch,
      });
      await client.put('/cards/x', { name: 'New Name' });
      expect(mockFetch.calls[0].method).toBe('PUT');
      expect(mockFetch.calls[0].url).toContain('name=New+Name');
    });

    it('DELETE works without body', async () => {
      const mockFetch = createMockFetch();
      mockFetch.enqueue({ body: { _value: null } });
      const client = new TrelloClient({
        apiKey: 'k',
        token: 't',
        fetch: mockFetch.fetch,
      });
      await client.delete('/cards/x');
      expect(mockFetch.calls[0].method).toBe('DELETE');
    });

    it('throws TrelloApiError on non-2xx response', async () => {
      const mockFetch = createMockFetch();
      mockFetch.enqueue({
        status: 404,
        statusText: 'Not Found',
        body: 'invalid id',
      });
      const client = new TrelloClient({
        apiKey: 'k',
        token: 't',
        fetch: mockFetch.fetch,
      });
      await expect(client.get('/boards/missing')).rejects.toBeInstanceOf(
        TrelloApiError,
      );
    });

    it('TrelloApiError includes status and body', async () => {
      const mockFetch = createMockFetch();
      mockFetch.enqueue({
        status: 401,
        statusText: 'Unauthorized',
        body: 'bad token',
      });
      const client = new TrelloClient({
        apiKey: 'k',
        token: 't',
        fetch: mockFetch.fetch,
      });
      try {
        await client.get('/members/me');
        throw new Error('should have thrown');
      } catch (e) {
        const err = e as TrelloApiError;
        expect(err.status).toBe(401);
        expect(err.statusText).toBe('Unauthorized');
        expect(err.body).toBe('bad token');
        expect(err.message).toContain('401');
        expect(err.message).toContain('bad token');
      }
    });

    it('handles non-JSON response as text', async () => {
      const mockFetch = createMockFetch();
      mockFetch.enqueue({
        body: 'plain text response',
        headers: { 'content-type': 'text/plain' },
      });
      const client = new TrelloClient({
        apiKey: 'k',
        token: 't',
        fetch: mockFetch.fetch,
      });
      const result = await client.get<string>('/foo');
      expect(result).toBe('plain text response');
    });

    it('handles empty response', async () => {
      const mockFetch = createMockFetch();
      mockFetch.enqueue({
        body: '',
        headers: { 'content-type': 'text/plain' },
      });
      const client = new TrelloClient({
        apiKey: 'k',
        token: 't',
        fetch: mockFetch.fetch,
      });
      const result = await client.get('/foo');
      expect(result).toBeUndefined();
    });

    it('handler can inspect URL and return different responses', async () => {
      const mockFetch = createMockFetch();
      mockFetch.setHandler(({ url }) => {
        if (url.includes('/boards/a')) {
          return { body: { id: 'a', name: 'A' } };
        }
        return { body: { id: 'b', name: 'B' } };
      });
      const client = new TrelloClient({
        apiKey: 'k',
        token: 't',
        fetch: mockFetch.fetch,
      });
      const a = await client.get<{ id: string }>('/boards/a');
      const b = await client.get<{ id: string }>('/boards/b');
      expect(a.id).toBe('a');
      expect(b.id).toBe('b');
    });
  });
});
