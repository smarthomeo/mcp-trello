export interface TrelloClientOptions {
  apiKey: string;
  token: string;
  baseUrl?: string;
  fetch?: typeof fetch;
}

export class TrelloApiError extends Error {
  readonly status: number;
  readonly statusText: string;
  readonly body: string;
  readonly url: string;

  constructor(status: number, statusText: string, body: string, url: string) {
    super(
      `Trello API error ${status} ${statusText}: ${body || '(no body)'} (${url})`,
    );
    this.name = 'TrelloApiError';
    this.status = status;
    this.statusText = statusText;
    this.body = body;
    this.url = url;
  }
}

export type QueryValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Array<string | number>;

export type QueryParams = Record<string, QueryValue>;

export class TrelloClient {
  private readonly apiKey: string;
  private readonly token: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: TrelloClientOptions) {
    if (!options.apiKey) {
      throw new Error('TrelloClient: apiKey is required');
    }
    if (!options.token) {
      throw new Error('TrelloClient: token is required');
    }
    this.apiKey = options.apiKey;
    this.token = options.token;
    this.baseUrl = (options.baseUrl ?? 'https://api.trello.com/1').replace(
      /\/$/,
      '',
    );
    this.fetchImpl = options.fetch ?? fetch;
  }

  buildUrl(path: string, query: QueryParams = {}): string {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const url = new URL(`${this.baseUrl}${normalizedPath}`);
    url.searchParams.set('key', this.apiKey);
    url.searchParams.set('token', this.token);
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue;
      if (Array.isArray(value)) {
        url.searchParams.set(key, value.join(','));
      } else {
        url.searchParams.set(key, String(value));
      }
    }
    return url.toString();
  }

  async request<T = unknown>(
    method: string,
    path: string,
    options: { query?: QueryParams; body?: unknown } = {},
  ): Promise<T> {
    const url = this.buildUrl(path, options.query ?? {});
    const init: RequestInit = {
      method,
      headers: {
        Accept: 'application/json',
      },
    };
    if (options.body !== undefined) {
      init.headers = {
        ...init.headers,
        'Content-Type': 'application/json',
      };
      init.body = JSON.stringify(options.body);
    }
    const response = await this.fetchImpl(url, init);
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new TrelloApiError(
        response.status,
        response.statusText,
        body,
        url,
      );
    }
    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      return (await response.json()) as T;
    }
    const text = await response.text();
    if (!text) {
      return undefined as T;
    }
    try {
      return JSON.parse(text) as T;
    } catch {
      return text as unknown as T;
    }
  }

  get<T = unknown>(path: string, query: QueryParams = {}): Promise<T> {
    return this.request<T>('GET', path, { query });
  }

  post<T = unknown>(
    path: string,
    query: QueryParams = {},
    body?: unknown,
  ): Promise<T> {
    return this.request<T>('POST', path, { query, body });
  }

  put<T = unknown>(
    path: string,
    query: QueryParams = {},
    body?: unknown,
  ): Promise<T> {
    return this.request<T>('PUT', path, { query, body });
  }

  delete<T = unknown>(path: string, query: QueryParams = {}): Promise<T> {
    return this.request<T>('DELETE', path, { query });
  }
}
