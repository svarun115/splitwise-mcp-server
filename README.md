# Splitwise MCP Server

A standalone Model Context Protocol (MCP) server that provides complete access to the Splitwise API. Use it with **Claude Desktop**, **VS Code Copilot**, **ChatGPT**, or any MCP-compatible client to manage your Splitwise expenses through natural language.

## Features

**26 MCP Tools** organized in 7 categories:
- 👤 **User Management** (3) - Profile and settings
- 👥 **Group Management** (7) - Create/manage expense groups
- 🤝 **Friend Management** (5) - Add/manage friends
- 💰 **Expense Management** (6) - Create/track expenses with custom splits
- 💬 **Comments** (3) - Comment on expenses
- 🔔 **Notifications** (1) - View account activity
- 🛠️ **Utilities** (2) - Currencies and categories

## Supported Clients

- ✅ **Claude Desktop** (Anthropic's desktop app)
- ✅ **VS Code with GitHub Copilot** (via [splitwise-mcp-vscode extension](https://github.com/svarun115/splitwise-mcp-vscode))
- ✅ **ChatGPT** (with custom MCP integration)
- ✅ **Any MCP-compatible client** (uses stdio transport)

## Quick Start

### 1. Install Dependencies
```bash
npm install
npm run build
```

### 2. Get Splitwise Credentials

Visit [secure.splitwise.com/apps](https://secure.splitwise.com/apps) and register your app:
- **Name**: My Splitwise MCP
- **Homepage URL**: `http://localhost`
- **Callback URL**: `http://localhost:8080/callback`

Save your **Consumer Key** and **Consumer Secret**.

### 3. Get Access Token

Run the token helper:
```bash
npm run get-token
```

Or manually:
1. Visit: `https://secure.splitwise.com/oauth/authorize?client_id=YOUR_CONSUMER_KEY&response_type=code&redirect_uri=http://localhost:8080/callback`
2. Authorize the app and copy the `code` from the redirect URL
3. Exchange for token:
```bash
curl -X POST "https://secure.splitwise.com/oauth/token" \
  -d "grant_type=authorization_code" \
  -d "code=YOUR_AUTH_CODE" \
  -d "client_id=YOUR_CONSUMER_KEY" \
  -d "client_secret=YOUR_CONSUMER_SECRET" \
  -d "redirect_uri=http://localhost:8080/callback"
```

### 4. Configure Environment

Create `.env`:
```env
SPLITWISE_ACCESS_TOKEN=your_access_token_here
```

### 5. Choose Your Client

#### Option A: Claude Desktop (Recommended)

Edit your Claude Desktop config file:
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Mac/Linux**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "splitwise": {
      "command": "splitwise-mcp-server",
      "env": {
        "SPLITWISE_ACCESS_TOKEN": "your_access_token_here"
      }
    }
  }
}
```

Restart Claude Desktop and test:
```
"Show me my Splitwise friends"
"List my recent expenses"
"Create a $50 dinner expense split equally"
```

#### Option B: VS Code with GitHub Copilot

Install the [Splitwise MCP VS Code Extension](https://github.com/svarun115/splitwise-mcp-vscode):

```bash
# Install the VS Code extension
code --install-extension splitwise-mcp-1.0.0.vsix
```

Configure your access token in VS Code settings, then use Copilot Chat:
```
"Show my Splitwise balance"
"Add a $30 grocery expense to my Roommates group"
```

See the [VS Code extension README](https://github.com/svarun115/splitwise-mcp-vscode) for detailed setup.

#### Option C: Custom MCP Client

The server uses stdio transport and follows the MCP specification. Connect any MCP client:

```javascript
// Example: Using MCP SDK Client
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const transport = new StdioClientTransport({
  command: 'splitwise-mcp-server',
  env: { SPLITWISE_ACCESS_TOKEN: 'your_token' }
});

const client = new Client({ name: 'my-client', version: '1.0.0' }, { capabilities: {} });
await client.connect(transport);
const tools = await client.listTools();
```

## Available Tools

### User Management
- `splitwise_get_current_user` - Get your profile info
- `splitwise_get_user` - Get another user's info
- `splitwise_update_user` - Update profile settings

### Group Management
- `splitwise_get_groups` - List all groups
- `splitwise_get_group` - Get group details
- `splitwise_create_group` - Create new group
- `splitwise_delete_group` - Delete group
- `splitwise_restore_group` - Restore deleted group
- `splitwise_add_user_to_group` - Add member to group
- `splitwise_remove_user_from_group` - Remove member from group

### Friend Management
- `splitwise_get_friends` - List all friends with balances
- `splitwise_get_friend` - Get friend details
- `splitwise_add_friend` - Add single friend
- `splitwise_add_friends` - Add multiple friends
- `splitwise_remove_friend` - Remove friend

### Expense Management
- `splitwise_get_expenses` - List/filter expenses
- `splitwise_get_expense` - Get expense details
- `splitwise_create_expense` - Create expense (equal or custom split)
- `splitwise_update_expense` - Update expense
- `splitwise_delete_expense` - Delete expense
- `splitwise_restore_expense` - Restore deleted expense

### Comments
- `splitwise_get_comments` - Get expense comments
- `splitwise_add_comment` - Add comment to expense
- `splitwise_delete_comment` - Delete comment

### Notifications
- `splitwise_get_notifications` - Get recent activity

### Utilities
- `splitwise_get_currencies` - Get supported currencies
- `splitwise_get_categories` - Get expense categories

## Usage Examples

**View balances:**
```
"What do I owe each of my friends?"
"Show me my Splitwise balance"
```

**Create expenses:**
```
"Add a $60 grocery expense split equally in my Roommates group"
"I paid $100 for dinner - I owe $40, John owes $60"
"Create a $1200 monthly rent expense split equally"
```

**Manage groups:**
```
"Create a group called 'Vegas Trip' and add alice@email.com"
"Who's in my Apartment group?"
"Show me all expenses in the Weekend Getaway group"
```

**Filter expenses:**
```
"Show me restaurant expenses from last month"
"List all expenses over $100"
"What did I spend the most on this year?"
```

## Troubleshooting

**Authentication failed:**
- Verify token in `.env` matches the one in `claude_desktop_config.json`
- No extra spaces or quotes around the token
- Token hasn't expired - regenerate with `npm run get-token`

**Server not found:**
- Use absolute path in config
- Windows: Use `\\` (double backslashes)
- Run `npm run build` after code changes
- Path should point to `dist/index.js` not `src/index.ts`

**Tools not appearing in Claude:**
- Verify JSON syntax in `claude_desktop_config.json`
- Completely close and restart Claude Desktop (check system tray)
- Check Claude Desktop logs: Help → Show Logs

**Authorization code expired:**
- Codes expire in 10 minutes
- Get a new code and exchange immediately
- Use the token helper script to automate: `npm run get-token`

For detailed setup instructions, see [SETUP.md](SETUP.md)

## Development

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Watch mode (auto-rebuild)
npm run watch

# Test server
npm run dev

# Get OAuth token
npm run get-token
```

## Project Structure

```
SplitwiseMCPServer/
├── src/
│   ├── index.ts              # Main MCP server
│   ├── splitwise-client.ts   # Splitwise API wrapper
│   ├── tools.ts              # Tool definitions (26 tools)
│   └── get-token.ts          # OAuth helper script
├── dist/                      # Compiled output
├── .env                       # Your credentials (not in git)
├── package.json
└── tsconfig.json
```

## API Reference

All tools follow the Splitwise API v3.0 specification: [dev.splitwise.com](https://dev.splitwise.com/)

**Base URL**: `https://secure.splitwise.com/api/v3.0`  
**Authentication**: OAuth 2.0 Bearer Token

## Security

- Never commit `.env` to version control
- Keep your access token private
- Use environment variables for credentials
- Set proper file permissions: `chmod 600 .env` (Unix/Mac)

## Requirements

- **Node.js**: 18+
- **NPM**: Latest
- **Splitwise Account**: Free or premium

## License

MIT

## Related

- **[Splitwise MCP VS Code Extension](https://github.com/svarun115/splitwise-mcp-vscode)** - Optional VS Code integration
- **[Splitwise API Documentation](https://dev.splitwise.com/)** - Official API reference
- **[Model Context Protocol](https://modelcontextprotocol.io/)** - MCP specification

## Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Support

- **Issues**: [GitHub Issues](https://github.com/svarun115/splitwise-mcp-server/issues)
- **Splitwise API**: [dev.splitwise.com](https://dev.splitwise.com/)
- **MCP Docs**: [modelcontextprotocol.io](https://modelcontextprotocol.io/)

## License

MIT License - see LICENSE file for details

---

**Built with**: TypeScript 5.3, MCP SDK 1.20.1, Axios 1.6.0
