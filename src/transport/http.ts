/**
 * Streamable HTTP transport for Splitwise MCP (Model Context Protocol).
 * 
 * Implements the official MCP Streamable HTTP specification:
 * - Single /mcp endpoint for all JSON-RPC communication
 * - POST /mcp: accepts JSON-RPC requests, responds with JSON or SSE
 * - GET /mcp: optional persistent SSE stream for server notifications
 * - /healthz: health check endpoint (separate from /mcp)
 */

import express, { Request, Response, Express } from 'express';
import { isValidJsonRpc, isNotification, createSuccessResponse, createErrorResponse, JsonRpcError, validateMcpProtocolVersion } from '../utils/jsonrpc.js';
import { getAllTools, handleToolCall } from '../tools.js';
import { SplitwiseClient } from '../splitwise-client.js';

let splitwiseClient: SplitwiseClient | null = null;

function getClient(): SplitwiseClient {
  if (!splitwiseClient) {
    splitwiseClient = new SplitwiseClient();
  }
  return splitwiseClient;
}

/**
 * Handle a single MCP JSON-RPC request.
 */
async function handleMcpRequest(requestData: any): Promise<any> {
  const method = requestData.method;
  const params = requestData.params || {};
  const requestId = requestData.id;

  try {
    if (method === 'initialize') {
      const result = {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {},
        },
        serverInfo: {
          name: 'splitwise-mcp-server',
          version: '1.0.0',
        },
      };
      return createSuccessResponse(requestId, result);
    } else if (method === 'ping') {
      return null;
    } else if (method === 'tools/list') {
      const tools = getAllTools();
      return createSuccessResponse(requestId, {
        tools: tools.map((tool: any) => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        })),
      });
    } else if (method === 'tools/call') {
      const toolName = params.name;
      const toolArgs = params.arguments || {};

      if (!toolName) {
        return createErrorResponse(requestId, JsonRpcError.INVALID_PARAMS, 'Missing tool name');
      }

      try {
        const client = getClient();
        const raw = await handleToolCall(toolName, toolArgs, client);

        // Normalize to MCP tool response shape
        let result;
        if (raw && typeof raw === 'object' && Array.isArray((raw as any).content)) {
          result = raw;
        } else {
          result = {
            content: [
              {
                type: 'text',
                text: JSON.stringify(raw, null, 2),
              },
            ],
          };
        }

        return createSuccessResponse(requestId, result);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[DEBUG] Tool execution error: ${message}`);
        return createErrorResponse(requestId, JsonRpcError.INTERNAL_ERROR, message);
      }
    } else if (method === 'notifications/initialized') {
      return null;
    } else {
      return createErrorResponse(requestId, JsonRpcError.METHOD_NOT_FOUND, `Unknown method: ${method}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[DEBUG] Error handling method ${method}:`, message);
    return createErrorResponse(requestId, JsonRpcError.INTERNAL_ERROR, message);
  }
}

/**
 * Create and run the HTTP transport server.
 */
export function createHttpServer(port: number = 4000): Express {
  const app = express();
  app.use(express.json());

  // POST /mcp - Main MCP endpoint
  app.post('/mcp', async (req: Request, res: Response) => {
    const mcpProtocolVersion = req.get('MCP-Protocol-Version');

    if (mcpProtocolVersion && !validateMcpProtocolVersion(mcpProtocolVersion)) {
      return res.status(400).json(
        createErrorResponse(
          null,
          JsonRpcError.INVALID_REQUEST,
          `Unsupported MCP protocol version: ${mcpProtocolVersion}`
        )
      );
    }

    const body = req.body;

    if (!isValidJsonRpc(body)) {
      return res.status(400).json(
        createErrorResponse(body?.id, JsonRpcError.INVALID_REQUEST, 'Invalid JSON-RPC request')
      );
    }

    if (isNotification(body)) {
      handleMcpRequest(body).catch((error) => {
        console.error('[DEBUG] Error handling notification:', error);
      });
      return res.status(202).send();
    }

    const response = await handleMcpRequest(body);

    if (!response) {
      return res.status(202).send();
    }

    res.json(response);
  });

  // GET /mcp - Optional SSE stream
  app.get('/mcp', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const interval = setInterval(() => {
      res.write(': keepalive\n\n');
    }, 30000);

    req.on('close', () => {
      clearInterval(interval);
      res.end();
    });
  });

  // Health check endpoint
  app.get('/healthz', (req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      app: 'initialized',
    });
  });

  return app;
}

/**
 * Run the HTTP server.
 */
export function runHttpServer(port: number = 4000): void {
  const app = createHttpServer(port);

  app.listen(port, () => {
    console.log(`Splitwise MCP Server (HTTP) listening on http://localhost:${port}/mcp`);
    console.error(`[DEBUG] Server initialized on port ${port}`);
  });

  process.on('SIGINT', () => {
    console.error('[DEBUG] Shutting down...');
    process.exit(0);
  });
}
