import { TrelloApiError } from '../trello-client.js';

export interface ToolTextResult {
  [x: string]: unknown;
  content: Array<{ type: 'text'; text: string; [x: string]: unknown }>;
  isError?: boolean;
}

export function textResult(data: unknown): ToolTextResult {
  const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  return {
    content: [
      {
        type: 'text',
        text,
      },
    ],
  };
}

export function errorResult(error: unknown): ToolTextResult {
  let message: string;
  if (error instanceof TrelloApiError) {
    message = `Trello API error ${error.status} ${error.statusText}: ${
      error.body || '(no body)'
    }`;
  } else if (error instanceof Error) {
    message = error.message;
  } else {
    message = String(error);
  }
  return {
    content: [
      {
        type: 'text',
        text: message,
      },
    ],
    isError: true,
  };
}
