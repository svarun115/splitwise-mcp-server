#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import express, { Request, Response } from 'express';
import { createServer as createHttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { SplitwiseClient } from './splitwise-client.js';
import { getAllTools, handleToolCall } from './tools.js';

// Initialize the Splitwise client (lazily)
let splitwiseClient: SplitwiseClient | null = null;

function getClient(): SplitwiseClient {
  if (!splitwiseClient) {
    try {
      splitwiseClient = new SplitwiseClient();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Failed to initialize Splitwise client: ${errorMessage}`
      );
    }
  }
  return splitwiseClient;
}

// Create the MCP server
const server = new Server(
  {
    name: 'splitwise-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  console.error('[DEBUG] ListTools request received');
  const tools = getAllTools();
  console.error(`[DEBUG] Returning ${tools.length} tools`);
  return {
    tools: tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    })),
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    const client = getClient();
    const result = await handleToolCall(name, args || {}, client);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Check if it's an authentication error
    if (errorMessage.includes('401') || errorMessage.includes('Invalid API key')) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Authentication failed: ${errorMessage}. Please check your SPLITWISE_ACCESS_TOKEN.`
      );
    }
    
    // Check if it's a forbidden error
    if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Access forbidden: ${errorMessage}. You may not have permission to access this resource.`
      );
    }
    
    // Check if it's a not found error
    if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Resource not found: ${errorMessage}`
      );
    }
    
    // Generic error
    throw new McpError(
      ErrorCode.InternalError,
      `Tool execution failed: ${errorMessage}`
    );
  }
});

// Helper function to create JSON-RPC response
function createJsonRpcResponse(id: any, result?: any, error?: any): any {
  const response: any = {
    jsonrpc: '2.0',
    id,
  };

  if (error) {
    response.error = error;
  } else {
    response.result = result;
  }

  return response;
}

// Handle WebSocket connections
async function handleWebSocketConnection(ws: WebSocket) {
  console.error('[DEBUG] WebSocket client connected');
  let isInitialized = false;

  ws.on('message', async (data: any) => {
    try {
      const message = JSON.parse(data.toString());
      console.error('[DEBUG] Received message:', JSON.stringify(message).substring(0, 100));

      let result: any;
      let errorResponse: any = null;

      try {
        // Handle initialize - required first call
        if (message.method === 'initialize') {
          console.error('[DEBUG] Processing initialize request');
          isInitialized = true;
          result = {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {},
            },
            serverInfo: {
              name: 'splitwise-mcp-server',
              version: '1.0.0',
            },
          };
        } 
        // Handle tools/list
        else if (message.method === 'tools/list') {
          console.error('[DEBUG] Processing tools/list request');
          const tools = getAllTools();
          result = {
            tools: tools.map((tool) => ({
              name: tool.name,
              description: tool.description,
              inputSchema: tool.inputSchema,
            })),
          };
        } 
        // Handle tools/call
        else if (message.method === 'tools/call') {
          const { name, arguments: args } = message.params || {};
          console.error(`[DEBUG] Processing tool call: ${name}`);

          try {
            const client = getClient();
            result = await handleToolCall(name, args || {}, client);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            let code = -32603; // Internal error

            if (errorMessage.includes('401') || errorMessage.includes('Invalid API key')) {
              code = -32001; // Custom error code for auth
            } else if (errorMessage.includes('403')) {
              code = -32002; // Custom error code for forbidden
            } else if (errorMessage.includes('404')) {
              code = -32003; // Custom error code for not found
            }

            errorResponse = {
              code,
              message: errorMessage,
            };
          }
        } 
        else {
          errorResponse = {
            code: -32601,
            message: `Unknown method: ${message.method}`,
          };
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        errorResponse = {
          code: -32603,
          message: errorMessage,
        };
      }

      // Send JSON-RPC 2.0 response
      const response = createJsonRpcResponse(
        message.id,
        errorResponse ? undefined : result,
        errorResponse
      );

      console.error('[DEBUG] Sending response:', JSON.stringify(response).substring(0, 100));
      ws.send(JSON.stringify(response));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      console.error('[DEBUG] Error processing message:', errorMessage);
      
      const errorResponse = {
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32700,
          message: 'Parse error',
        },
      };

      console.error('[DEBUG] Sending error response:', JSON.stringify(errorResponse));
      ws.send(JSON.stringify(errorResponse));
    }
  });

  ws.on('close', () => {
    console.error('[DEBUG] WebSocket client disconnected');
  });

  ws.on('error', (error: any) => {
    console.error('[DEBUG] WebSocket error:', error);
  });
}

// Start the server
async function main() {
  // Handle --version flag
  if (process.argv.includes('--version') || process.argv.includes('-v')) {
    console.log('splitwise-mcp-server version 1.0.0');
    process.exit(0);
  }

  // Check if stdio mode is requested
  const useStdio = process.argv.includes('--stdio');
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4001;

  if (useStdio) {
    // Stdio mode - original implementation
    console.error('[DEBUG] Starting in stdio mode...');
    const transport = new StdioServerTransport();
    console.error('[DEBUG] Connecting transport...');
    await server.connect(transport);
    console.error('Splitwise MCP server running on stdio');
    console.error('[DEBUG] Server connected and ready');
  } else {
    // WebSocket + HTTP mode
    console.error('[DEBUG] Starting in WebSocket mode...');
    const app = express();

    app.use(express.json());
    
    // Health check endpoint
    app.get('/health', (_req: Request, res: Response) => {
      res.json({ status: 'ok', version: '1.0.0' });
    });

    // HTTP GET response for MCP client initial fetch/handshake
    app.get('/', (_req: Request, res: Response) => {
      res.status(200).json({ status: 'ok', type: 'mcp-server', version: '1.0.0' });
    });

    // HTTP POST response for MCP client requests (before WebSocket upgrade)
    app.post('/', (_req: Request, res: Response) => {
      res.status(200).json({ status: 'ok', type: 'mcp-server', version: '1.0.0' });
    });

    const httpServer = createHttpServer(app);
    
    // Create WebSocket server - accepts connections on any path
    const wss = new WebSocketServer({ noServer: true });

    // Handle HTTP upgrade requests for WebSocket
    httpServer.on('upgrade', (request, socket, head) => {
      console.error(`[DEBUG] Upgrade request for path: ${request.url}`);
      wss.handleUpgrade(request, socket, head, (ws) => {
        console.error('[DEBUG] WebSocket upgrade successful');
        wss.emit('connection', ws, request);
      });
    });

    // Handle WebSocket connections
    wss.on('connection', handleWebSocketConnection);

    httpServer.listen(PORT, () => {
      console.log(`Splitwise MCP server listening on ws://localhost:${PORT}`);
      console.error(`[DEBUG] Server initialized on port ${PORT}`);
    });

    process.on('SIGINT', () => {
      console.error('[DEBUG] Shutting down...');
      httpServer.close(() => {
        console.error('[DEBUG] Server closed');
        process.exit(0);
      });
    });
  }
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
