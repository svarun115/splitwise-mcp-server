#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

console.error('[MINIMAL] Creating server...');

const server = new Server(
  { name: 'test-server', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

console.error('[MINIMAL] Setting up handler...');

server.setRequestHandler(ListToolsRequestSchema, async () => {
  console.error('[MINIMAL] ListTools called!');
  return { tools: [{ name: 'test', description: 'test tool', inputSchema: { type: 'object' } }] };
});

console.error('[MINIMAL] Starting transport...');

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[MINIMAL] Server ready');
}

main().catch((e) => {
  console.error('[MINIMAL] Error:', e);
  process.exit(1);
});
