#!/usr/bin/env node
// Minimal MCP test client for Splitwise MCP server using stdio
// Usage:
//   SPLITWISE_ACCESS_TOKEN=... node test-client.js
// Will:
//   1. Spawn server (assumes global install 'splitwise-mcp-server' or local dist via npx)
//   2. Send ListTools request
//   3. Call splitwise_get_current_user (if token valid)
//
// This is NOT a full MCP implementation—just enough to validate server behavior.

const { spawn } = require('child_process');
const path = require('path');

function mcpFrame(json) {
  const body = JSON.stringify(json);
  return `Content-Length: ${Buffer.byteLength(body, 'utf8')}\r\n\r\n${body}`;
}

let nextId = 1;
function req(method, params) {
  return { jsonrpc: '2.0', id: nextId++, method, params };
}

// Resolve server command
const serverCmd = 'splitwise-mcp-server'; // if not in PATH, adjust below

console.log('[client] Spawning server:', serverCmd);
const server = spawn(serverCmd, [], { stdio: ['pipe', 'pipe', 'inherit'], env: process.env });

let buffer = '';

server.stdout.on('data', (chunk) => {
  buffer += chunk.toString();
  // Parse frames (very naive Content-Length parser)
  while (true) {
    const headerEnd = buffer.indexOf('\r\n\r\n');
    if (headerEnd === -1) break;
    const header = buffer.slice(0, headerEnd);
    const match = header.match(/Content-Length: (\d+)/i);
    if (!match) {
      console.error('[client] Missing Content-Length header');
      buffer = buffer.slice(headerEnd + 4);
      continue;
    }
    const length = parseInt(match[1], 10);
    const start = headerEnd + 4;
    if (buffer.length < start + length) break; // wait for full body
    const body = buffer.slice(start, start + length);
    buffer = buffer.slice(start + length);
    try {
      const msg = JSON.parse(body);
      console.log('\n[client] ←', JSON.stringify(msg, null, 2));
    } catch (e) {
      console.error('[client] JSON parse error:', e.message);
    }
  }
});

server.on('error', (e) => console.error('[client] server process error', e));
server.on('exit', (code) => console.log('[client] server exited code', code));

function send(json) {
  const frame = mcpFrame(json);
  server.stdin.write(frame);
  console.log('\n[client] →', JSON.stringify(json));
}

// Sequence
setTimeout(() => {
  // 1. List tools
  send(req('tools/list', {}));
}, 400);

setTimeout(() => {
  // 2. Call current user tool
  send(req('tools/call', { name: 'splitwise_get_current_user', arguments: {} }));
}, 1200);

// Exit after a bit
setTimeout(() => {
  console.log('[client] Done. Sending SIGINT');
  server.kill('SIGINT');
}, 4000);
