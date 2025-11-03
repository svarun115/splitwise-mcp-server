#!/usr/bin/env node

import { createServer } from 'http';
import { WebSocket } from 'ws';
import express, { Request, Response } from 'express';

const HTTP_PORT = 4000;
const WS_BACKEND_URL = process.env.WS_BACKEND_URL || 'ws://localhost:4001';

const app = express();
app.use(express.json());

// Cache for tool metadata
interface ToolsCache {
  tools: any[];
  timestamp: number;
  backendConnected: boolean;
}

const cache: ToolsCache = {
  tools: [],
  timestamp: 0,
  backendConnected: false,
};

const CACHE_TTL = 60000; // 1 minute

// Helper function to fetch tools from backend
async function fetchToolsFromBackend(): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_BACKEND_URL);
    let responded = false;

    ws.on('open', () => {
      console.error('[ADAPTER] Connected to backend for tools/list');
      cache.backendConnected = true;
      ws.send(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }));
    });

    ws.on('message', (data: any) => {
      if (responded) return;
      responded = true;
      try {
        const response = JSON.parse(data.toString());
        if (response.result && response.result.tools) {
          cache.tools = response.result.tools;
          cache.timestamp = Date.now();
          console.error(`[ADAPTER] Cached ${cache.tools.length} tools`);
          resolve(cache.tools);
        } else {
          reject(new Error('Invalid tools response'));
        }
      } catch (error) {
        reject(error);
      } finally {
        ws.close();
      }
    });

    ws.on('error', (error: any) => {
      cache.backendConnected = false;
      console.error('[ADAPTER] Backend connection error:', error.message);
      reject(error);
    });

    setTimeout(() => {
      if (!responded) {
        responded = true;
        cache.backendConnected = false;
        ws.close();
        reject(new Error('Tools fetch timeout'));
      }
    }, 5000);
  });
}

// Health check endpoint
app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', type: 'mcp-adapter', version: '1.0.0' });
});

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

// Status endpoint - shows backend connection state and cached tools
app.get('/status', async (_req: Request, res: Response) => {
  try {
    // Check if cache is stale
    const cacheAge = Date.now() - cache.timestamp;
    const cacheStale = cacheAge > CACHE_TTL;

    // Try to refresh if stale
    if (cacheStale && cache.tools.length === 0) {
      try {
        await fetchToolsFromBackend();
      } catch (error) {
        console.error('[ADAPTER] Failed to refresh tools cache');
      }
    }

    res.json({
      status: 'ok',
      adapter: {
        version: '1.0.0',
        port: HTTP_PORT,
      },
      backend: {
        url: WS_BACKEND_URL,
        connected: cache.backendConnected,
        lastCheck: new Date(cache.timestamp),
      },
      tools: {
        cached: cache.tools.length,
        list: cache.tools.map((t: any) => ({ name: t.name, description: t.description })),
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// List tools endpoint - for easy curl testing
app.get('/listTools', async (_req: Request, res: Response) => {
  try {
    // Use cache if available and fresh
    if (cache.tools.length > 0 && Date.now() - cache.timestamp < CACHE_TTL) {
      console.error('[ADAPTER] Returning cached tools');
      return res.json({ tools: cache.tools });
    }

    // Fetch from backend
    const tools = await fetchToolsFromBackend();
    res.json({ tools });
  } catch (error: any) {
    console.error('[ADAPTER] Error fetching tools:', error.message);
    res.status(503).json({ error: 'Backend unavailable', message: error.message });
  }
});

// RPC endpoint - for testing JSON-RPC requests with curl
app.post('/rpc', async (req: Request, res: Response) => {
  try {
    const message = req.body;
    console.error('[ADAPTER] POST /rpc:', JSON.stringify(message).substring(0, 100));

    const ws = new WebSocket(WS_BACKEND_URL);
    let responded = false;

    ws.on('open', () => {
      console.error('[ADAPTER] Connected to backend for RPC call');
      cache.backendConnected = true;
      ws.send(JSON.stringify(message));
    });

    ws.on('message', (data: any) => {
      if (responded) return;
      responded = true;
      try {
        const response = JSON.parse(data);
        console.error('[ADAPTER] RPC response:', JSON.stringify(response));
        res.json(response);
      } catch (error) {
        res.status(500).json({ error: 'Invalid response from backend' });
      } finally {
        ws.close();
      }
    });

    ws.on('error', (error: any) => {
      cache.backendConnected = false;
      if (!responded) {
        responded = true;
        console.error('[ADAPTER] Backend error:', error.message);
        res.status(503).json({ error: 'Backend connection failed', message: error.message });
      }
    });

    setTimeout(() => {
      if (!responded) {
        responded = true;
        cache.backendConnected = false;
        ws.close();
        res.status(504).json({ error: 'Backend timeout' });
      }
    }, 30000);
  } catch (error: any) {
    console.error('[ADAPTER] RPC error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// HTTP POST adapter for JSON-RPC requests
app.post('/', async (req: Request, res: Response) => {
  try {
    const message = req.body;

    // Connect to backend WebSocket
    const ws = new WebSocket(WS_BACKEND_URL);
    let responded = false;

    ws.on('open', () => {
      console.error('[ADAPTER] Connected to backend, sending message:', JSON.stringify(message).substring(0, 100));
      cache.backendConnected = true;
      ws.send(JSON.stringify(message));
    });

    ws.on('message', (data: any) => {
      if (responded) return;
      responded = true;
      try {
        const response = JSON.parse(data);
        console.error('[ADAPTER] Received response from backend:', JSON.stringify(response));
        res.json(response);
      } catch (error) {
        res.status(500).json({ error: 'Invalid response from backend' });
      } finally {
        ws.close();
      }
    });

    ws.on('error', (error: any) => {
      cache.backendConnected = false;
      if (!responded) {
        responded = true;
        console.error('[ADAPTER] WebSocket error:', error);
        res.status(503).json({ error: 'Backend connection failed', message: error.message });
      }
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      if (!responded) {
        responded = true;
        cache.backendConnected = false;
        ws.close();
        res.status(504).json({ error: 'Backend timeout' });
      }
    }, 30000);
  } catch (error: any) {
    console.error('[ADAPTER] Error:', error);
    res.status(400).json({ error: error.message });
  }
});

const httpServer = createServer(app);

// Handle WebSocket upgrade requests and proxy them to backend
httpServer.on('upgrade', (request, socket, head) => {
  console.error(`[ADAPTER] Upgrade request for path: ${request.url}`);
  
  const backendWs = new WebSocket(WS_BACKEND_URL);
  
  backendWs.on('open', () => {
    console.error('[ADAPTER] Connected to backend for WebSocket upgrade');
    cache.backendConnected = true;
    
    // Create WebSocket connection with client
    const WebSocketServer = require('ws').WebSocketServer;
    const wss = new WebSocketServer({ noServer: true });
    
    wss.handleUpgrade(request, socket, head, (clientWs: any) => {
      console.error('[ADAPTER] Client WebSocket upgrade successful');
      
      // Proxy messages from client to backend
      clientWs.on('message', (msg: any) => {
        console.error('[ADAPTER] Client -> Backend:', JSON.stringify(JSON.parse(msg)));
        backendWs.send(msg);
      });

      // Proxy messages from backend to client
      backendWs.on('message', (msg: any) => {
        console.error('[ADAPTER] Backend -> Client:', JSON.stringify(JSON.parse(msg)));
        if (clientWs.readyState === 1) { // OPEN
          clientWs.send(msg);
        }
      });

      // Handle disconnections
      clientWs.on('close', () => {
        console.error('[ADAPTER] Client disconnected');
        backendWs.close();
      });

      backendWs.on('close', () => {
        console.error('[ADAPTER] Backend disconnected');
        cache.backendConnected = false;
        clientWs.close();
      });

      clientWs.on('error', (error: any) => {
        console.error('[ADAPTER] Client error:', error);
        backendWs.close();
      });

      backendWs.on('error', (error: any) => {
        cache.backendConnected = false;
        console.error('[ADAPTER] Backend error:', error);
        clientWs.close();
      });
    });
  });

  backendWs.on('error', (error: any) => {
    cache.backendConnected = false;
    console.error('[ADAPTER] Backend connection failed:', error);
    socket.destroy();
  });
});

httpServer.listen(HTTP_PORT, () => {
  console.error(`[ADAPTER] HTTP adapter listening on http://localhost:${HTTP_PORT}`);
  console.error(`[ADAPTER] Proxying to WebSocket backend at ${WS_BACKEND_URL}`);
  console.error(`[ADAPTER] Available routes:`);
  console.error(`[ADAPTER]   GET  /              - Health check`);
  console.error(`[ADAPTER]   GET  /health       - Health check`);
  console.error(`[ADAPTER]   GET  /status       - Adapter & backend status`);
  console.error(`[ADAPTER]   GET  /listTools    - List available tools`);
  console.error(`[ADAPTER]   POST /rpc          - JSON-RPC endpoint`);
  console.error(`[ADAPTER]   POST /             - JSON-RPC (alternative)`);
  console.error(`[ADAPTER]   WS   /             - WebSocket upgrade (any path)`);
});

process.on('SIGINT', () => {
  console.error('[ADAPTER] Shutting down...');
  httpServer.close(() => {
    console.error('[ADAPTER] Adapter closed');
    process.exit(0);
  });
});
