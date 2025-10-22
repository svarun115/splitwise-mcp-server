import http from 'http';
import { exec } from 'child_process';
import axios from 'axios';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function main() {
  console.log('=== Splitwise OAuth Token Generator ===\n');
  
  // Try to get from environment variables first
  let CLIENT_ID = process.env.SPLITWISE_CONSUMER_KEY || '';
  let CLIENT_SECRET = process.env.SPLITWISE_CONSUMER_SECRET || '';
  
  // If not in env, prompt for them
  if (!CLIENT_ID) {
    CLIENT_ID = await question('Enter your Consumer Key (Client ID): ');
  } else {
    console.log(`Using Consumer Key from environment: ${CLIENT_ID.substring(0, 10)}...`);
  }
  
  if (!CLIENT_SECRET) {
    CLIENT_SECRET = await question('Enter your Consumer Secret: ');
  } else {
    console.log(`Using Consumer Secret from environment: ${CLIENT_SECRET.substring(0, 10)}...`);
  }
  
  const REDIRECT_URI = 'http://localhost:8080/callback';
  const PORT = 8080;

  console.log('\nStarting local server on port 8080...\n');

  // Start a local server to catch the callback
  const server = http.createServer(async (req, res) => {
    if (req.url?.startsWith('/callback')) {
      const url = new URL(req.url, `http://localhost:${PORT}`);
      const code = url.searchParams.get('code');

      if (code) {
        try {
          // Exchange code for token
          const response = await axios.post('https://secure.splitwise.com/oauth/token', {
            grant_type: 'authorization_code',
            code: code,
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            redirect_uri: REDIRECT_URI,
          });

          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Splitwise OAuth Success</title>
                <style>
                  body { 
                    font-family: Arial, sans-serif; 
                    max-width: 800px; 
                    margin: 50px auto; 
                    padding: 20px;
                    background: #f5f5f5;
                  }
                  .container {
                    background: white;
                    padding: 30px;
                    border-radius: 10px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                  }
                  h1 { color: #5bc5a7; }
                  pre { 
                    background: #f5f5f5; 
                    padding: 15px; 
                    border-radius: 5px; 
                    overflow-x: auto;
                    word-wrap: break-word;
                  }
                  .success { color: #5bc5a7; }
                  .info { color: #666; margin-top: 20px; }
                </style>
              </head>
              <body>
                <div class="container">
                  <h1>✓ Success!</h1>
                  <p>Your Splitwise access token has been generated.</p>
                  
                  <h3>Access Token:</h3>
                  <pre>${response.data.access_token}</pre>
                  
                  <h3>Refresh Token:</h3>
                  <pre>${response.data.refresh_token || 'N/A'}</pre>
                  
                  <div class="info">
                    <h3>Next Steps:</h3>
                    <ol>
                      <li>Copy the access token above</li>
                      <li>Add it to your <code>.env</code> file as:<br>
                          <code>SPLITWISE_ACCESS_TOKEN=&lt;your_token&gt;</code>
                      </li>
                      <li>You can close this window now</li>
                    </ol>
                    
                    <p><strong>Note:</strong> Save the refresh token if you need to renew your access token in the future.</p>
                  </div>
                </div>
              </body>
            </html>
          `);

          console.log('\n\n=== SUCCESS ===');
          console.log('\nAccess Token:', response.data.access_token);
          if (response.data.refresh_token) {
            console.log('Refresh Token:', response.data.refresh_token);
          }
          console.log('\n=== Add this to your .env file ===');
          console.log(`SPLITWISE_ACCESS_TOKEN=${response.data.access_token}`);
          console.log('\nYou can close the browser window now.');
          
          // Close server after a delay
          setTimeout(() => {
            server.close();
            rl.close();
            process.exit(0);
          }, 2000);
        } catch (error: any) {
          res.writeHead(500, { 'Content-Type': 'text/html' });
          res.end(`
            <!DOCTYPE html>
            <html>
              <head><title>Error</title></head>
              <body>
                <h1>Error</h1>
                <p>Failed to exchange authorization code for token.</p>
                <pre>${error.response?.data ? JSON.stringify(error.response.data, null, 2) : error.message}</pre>
              </body>
            </html>
          `);
          console.error('\n=== ERROR ===');
          console.error('Failed to exchange code for token');
          console.error(error.response?.data || error.message);
          setTimeout(() => {
            server.close();
            rl.close();
            process.exit(1);
          }, 1000);
        }
      } else {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('No authorization code provided');
      }
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
    }
  });

  server.listen(PORT, () => {
    const authUrl = `https://secure.splitwise.com/oauth/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
    
    console.log('Authorization URL:');
    console.log(authUrl);
    console.log('\n=== IMPORTANT ===');
    console.log('1. Your browser should open automatically');
    console.log('2. Log in to Splitwise and authorize the application');
    console.log('3. You will be redirected back to localhost');
    console.log('4. The token will be displayed here and in your browser\n');
    
    // Try to open the browser
    const command = process.platform === 'win32' ? 'start' : 
                    process.platform === 'darwin' ? 'open' : 'xdg-open';
    exec(`${command} "${authUrl}"`, (error) => {
      if (error) {
        console.log('Could not open browser automatically. Please copy and paste the URL above into your browser.\n');
      }
    });
  });

  server.on('error', (error: any) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`\nError: Port ${PORT} is already in use.`);
      console.error('Please close any application using this port and try again.\n');
    } else {
      console.error('\nServer error:', error.message);
    }
    rl.close();
    process.exit(1);
  });
}

main().catch((error) => {
  console.error('Error:', error.message);
  rl.close();
  process.exit(1);
});
