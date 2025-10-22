#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
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
    const client = getClient(); // Lazy initialization
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

// Start the server
async function main() {
  // Handle --version flag
  if (process.argv.includes('--version') || process.argv.includes('-v')) {
    console.log('splitwise-mcp-server version 1.0.0');
    process.exit(0);
  }

  console.error('[DEBUG] Initializing server...');
  const transport = new StdioServerTransport();
  console.error('[DEBUG] Connecting transport...');
  await server.connect(transport);
  console.error('Splitwise MCP server running on stdio');
  console.error('[DEBUG] Server connected and ready');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
