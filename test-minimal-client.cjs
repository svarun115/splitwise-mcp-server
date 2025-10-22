const { spawn } = require('child_process');

console.log('Testing minimal MCP server...\n');

const serverProcess = spawn('node', ['test-minimal-mcp.mjs'], {
  stdio: ['pipe', 'pipe', 'inherit']
});

let buffer = '';

serverProcess.stdout.on('data', (data) => {
  buffer += data.toString();
  console.log('[RESPONSE]', data.toString());
  serverProcess.kill();
  process.exit(0);
});

serverProcess.on('error', (err) => {
  console.error('[ERROR]', err);
  process.exit(1);
});

setTimeout(() => {
  console.log('[SENDING] initialize request');
  const initReq = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'test', version: '1.0.0' }
    }
  };
  const body = JSON.stringify(initReq);
  const frame = `Content-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`;
  serverProcess.stdin.write(frame);
  
  setTimeout(() => {
    console.log('[SENDING] tools/list request');
    const req = { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} };
    const body2 = JSON.stringify(req);
    const frame2 = `Content-Length: ${Buffer.byteLength(body2)}\r\n\r\n${body2}`;
    serverProcess.stdin.write(frame2);
  }, 500);
  
  setTimeout(() => {
    console.log('\n[TIMEOUT]');
    serverProcess.kill();
    process.exit(1);
  }, 3000);
}, 500);
