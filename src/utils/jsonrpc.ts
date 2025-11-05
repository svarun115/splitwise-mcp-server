/**
 * JSON-RPC 2.0 validation and utility functions for MCP.
 */

// JSON-RPC 2.0 Error Codes
export const JsonRpcError = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
} as const;

/**
 * Validate basic JSON-RPC 2.0 structure.
 */
export function isValidJsonRpc(data: any): boolean {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  if (data.jsonrpc !== '2.0') {
    return false;
  }

  if (typeof data.method !== 'string') {
    return false;
  }

  return true;
}

/**
 * Check if JSON-RPC message is a notification (no response expected).
 */
export function isNotification(data: any): boolean {
  return !('id' in data);
}

/**
 * Create a JSON-RPC success response.
 */
export function createSuccessResponse(requestId: any, result: any): any {
  return {
    jsonrpc: '2.0',
    id: requestId,
    result,
  };
}

/**
 * Create a JSON-RPC error response.
 */
export function createErrorResponse(requestId: any, code: number, message: string, data?: any): any {
  const error: any = {
    code,
    message,
  };

  if (data !== undefined) {
    error.data = data;
  }

  return {
    jsonrpc: '2.0',
    id: requestId,
    error,
  };
}

/**
 * Validate MCP-Protocol-Version header.
 */
export function validateMcpProtocolVersion(version: string | undefined): boolean {
  if (!version) {
    return false;
  }

  const supportedVersions = ['2024-11-05'];
  return supportedVersions.includes(version);
}
