/**
 * SSE (Server-Sent Events) framing utilities for MCP Streamable HTTP transport.
 */

/**
 * Format a JSON-RPC message as an SSE event.
 */
export function formatSseEvent(data: any): string {
  const jsonStr = JSON.stringify(data);
  return `data: ${jsonStr}\n\n`;
}

/**
 * Format a JSON-RPC error as an SSE event.
 */
export function formatSseError(errorId: string | number, code: number, message: string): string {
  const errorResponse = {
    jsonrpc: '2.0',
    id: errorId,
    error: {
      code,
      message,
    },
  };
  return formatSseEvent(errorResponse);
}

/**
 * Async generator for streaming multiple SSE events.
 */
export async function* sseGenerator(messages: any[]): AsyncGenerator<string, void, unknown> {
  for (const message of messages) {
    yield formatSseEvent(message);
  }
}
