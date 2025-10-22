# Detailed Setup Guide

Complete step-by-step instructions for setting up the Splitwise MCP Server.

## Prerequisites

- [x] Node.js 18+ installed
- [x] Splitwise account at [splitwise.com](https://splitwise.com)
- [x] Claude Desktop installed

## Step 1: Register Splitwise Application

1. Go to [secure.splitwise.com/apps](https://secure.splitwise.com/apps)
2. Click "Register your application"
3. Fill in:
   - **Name**: My Splitwise MCP (or any name)
   - **Homepage URL**: `http://localhost`
   - **Callback URL**: `http://localhost:8080/callback`
4. Click "Register"
5. Save your **Consumer Key** and **Consumer Secret**

## Step 2: Install and Build

```bash
cd "c:\Users\vasashid\AI Projects\SplitwiseMCPServer"
npm install
npm run build
```

Expected output: TypeScript compiles with no errors, creates `dist/` folder.

## Step 3: Get OAuth Access Token

### Method A: Using Helper Script (Recommended)

```bash
npm run get-token
```

The script will:
1. Ask for your Consumer Key and Consumer Secret (if not in `.env`)
2. Open your browser to authorize
3. Display your access token
4. You copy the token

### Method B: Manual OAuth Flow

1. **Get authorization code:**
   
   Visit this URL (replace `YOUR_CONSUMER_KEY`):
   ```
   https://secure.splitwise.com/oauth/authorize?client_id=YOUR_CONSUMER_KEY&response_type=code&redirect_uri=http://localhost:8080/callback
   ```

2. **Authorize the app** in your browser

3. **Copy the code** from the redirect URL:
   ```
   http://localhost:8080/callback?code=XXXXXXXXX
   ```
   Copy everything after `code=`

4. **Exchange code for token:**
   
   Windows (PowerShell):
   ```powershell
   $body = @{
       grant_type = "authorization_code"
       code = "YOUR_CODE_HERE"
       client_id = "YOUR_CONSUMER_KEY"
       client_secret = "YOUR_CONSUMER_SECRET"
       redirect_uri = "http://localhost:8080/callback"
   }
   Invoke-RestMethod -Uri "https://secure.splitwise.com/oauth/token" -Method Post -Body $body | ConvertTo-Json
   ```

   Mac/Linux (curl):
   ```bash
   curl -X POST "https://secure.splitwise.com/oauth/token" \
     -d "grant_type=authorization_code" \
     -d "code=YOUR_CODE_HERE" \
     -d "client_id=YOUR_CONSUMER_KEY" \
     -d "client_secret=YOUR_CONSUMER_SECRET" \
     -d "redirect_uri=http://localhost:8080/callback"
   ```

5. **Copy the `access_token`** from the JSON response

**Important**: Authorization codes expire in 10 minutes. Exchange immediately!

## Step 4: Configure Environment

Create `.env` file:
```bash
cp .env.example .env
```

Edit `.env`:
```env
SPLITWISE_ACCESS_TOKEN=your_access_token_here
```

**Security**: Never commit `.env` to git. It's already in `.gitignore`.

## Step 5: Test the Server

```bash
npm run dev
```

Expected output:
```
Splitwise MCP server running on stdio
```

Press Ctrl+C to stop. If you see errors, check:
- Token is correct in `.env`
- No extra spaces or quotes
- You ran `npm run build`

## Step 6: Configure Claude Desktop

### Find Config File Location

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`  
**Mac**: `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Linux**: `~/.config/Claude/claude_desktop_config.json`

### Edit Config File

Create or edit `claude_desktop_config.json`:

**Windows Example**:
```json
{
  "mcpServers": {
    "splitwise": {
      "command": "node",
      "args": [
        "C:\\Users\\vasashid\\AI Projects\\SplitwiseMCPServer\\dist\\index.js"
      ],
      "env": {
        "SPLITWISE_ACCESS_TOKEN": "your_access_token_here"
      }
    }
  }
}
```

**Mac/Linux Example**:
```json
{
  "mcpServers": {
    "splitwise": {
      "command": "node",
      "args": [
        "/Users/username/SplitwiseMCPServer/dist/index.js"
      ],
      "env": {
        "SPLITWISE_ACCESS_TOKEN": "your_access_token_here"
      }
    }
  }
}
```

**Important**:
- Use **absolute paths** (not relative like `./` or `../`)
- Windows: Use double backslashes `\\` or forward slashes `/`
- Replace `your_access_token_here` with your actual token
- Path must point to `dist/index.js` (not `src/index.ts`)

### Validate JSON

Copy your config and validate at [jsonlint.com](https://jsonlint.com/) to ensure no syntax errors.

## Step 7: Restart Claude Desktop

1. **Completely close** Claude Desktop
2. Check system tray/menu bar to ensure it's fully closed
3. **Reopen** Claude Desktop
4. Wait a few seconds for servers to load

## Step 8: Verify Installation

Try these commands in Claude:

**Test 1: Get your profile**
```
Show me my Splitwise profile
```
Expected: Your name, email, user ID

**Test 2: List friends**
```
Show me my Splitwise friends
```
Expected: List of friends (or empty if you have none)

**Test 3: List groups**
```
List my Splitwise groups
```
Expected: List of groups (or empty)

**Test 4: Get categories**
```
What expense categories does Splitwise support?
```
Expected: List of categories like Entertainment, Food, Utilities, etc.

## Troubleshooting

### "Authentication failed: 401"

**Problem**: Invalid or expired token

**Solutions**:
1. Verify token in `.env` matches Claude config
2. Check for extra spaces, quotes, or line breaks
3. Regenerate token: `npm run get-token`
4. Test token manually:
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" https://secure.splitwise.com/api/v3.0/get_current_user
   ```

### "Cannot find module" error

**Problem**: Path in config is wrong or build failed

**Solutions**:
1. Run `npm run build` again
2. Check `dist/index.js` exists
3. Use absolute path in config
4. Verify path has no typos

### Tools don't appear in Claude

**Problem**: Config file has issues or Claude not restarted

**Solutions**:
1. Validate JSON syntax at [jsonlint.com](https://jsonlint.com/)
2. Check for:
   - Missing commas
   - Extra commas at end of objects
   - Unmatched brackets
3. Completely restart Claude Desktop
4. Check Claude logs: Help → Show Logs

### "Authorization code expired"

**Problem**: Codes expire in 10 minutes

**Solution**: Get a fresh code and exchange immediately, or use `npm run get-token` script.

### Port 8080 already in use (during token generation)

**Problem**: Another app is using port 8080

**Solutions**:
1. Close other applications using port 8080
2. Or modify `src/get-token.ts` to use different port
3. Update callback URL in Splitwise app settings to match

### Server starts then immediately crashes

**Check**:
1. `.env` file exists with valid token
2. No syntax errors in `.env`
3. Node.js version is 18+: `node --version`
4. Dependencies installed: `npm install`

## Token Management

### Token Lifespan

Splitwise access tokens typically last a long time but can expire. If you get authentication errors, regenerate your token.

### Regenerating Token

```bash
npm run get-token
```

Then update:
1. `.env` file
2. `claude_desktop_config.json`
3. Restart Claude Desktop

### Revoking Access

To revoke your token:
1. Go to [secure.splitwise.com/apps](https://secure.splitwise.com/apps)
2. Find your application
3. Click "Revoke access" or delete the app

## Security Best Practices

- ✅ Keep `.env` in `.gitignore` (already configured)
- ✅ Never share your access token
- ✅ Never commit credentials to version control
- ✅ Use environment variables, not hardcoded values
- ✅ Set file permissions: `chmod 600 .env` (Mac/Linux)
- ✅ Regularly rotate tokens
- ✅ Use HTTPS callback URLs in production

## Next Steps

Once set up successfully:

1. **Explore capabilities**: Try different expense operations
2. **Create test expense**: Practice with small amounts
3. **Set up groups**: Organize expenses by category
4. **Add friends**: Connect with people you split expenses with
5. **Review documentation**: See README.md for all available tools

## Getting Help

- **API Documentation**: [dev.splitwise.com](https://dev.splitwise.com/)
- **MCP Documentation**: [modelcontextprotocol.io](https://modelcontextprotocol.io/)
- **Check logs**: Claude Desktop → Help → Show Logs
- **Test manually**: Use curl to test API directly
- **Open issue**: Report bugs on GitHub

## Checklist

Use this to verify your setup:

- [ ] Node.js 18+ installed
- [ ] Splitwise app registered
- [ ] Consumer Key and Secret saved
- [ ] Dependencies installed (`npm install`)
- [ ] Project built (`npm run build`)
- [ ] Access token obtained
- [ ] `.env` file created with token
- [ ] Claude config file updated
- [ ] Absolute path used in config
- [ ] Claude Desktop restarted
- [ ] Basic test commands work

If all checked, you're ready to use Splitwise through Claude! 🎉
