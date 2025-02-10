# Hello World MCP Tool Server Example

This is the simplest possible example of a Model Context Protocol (MCP) tool server. It implements a single tool that echoes back whatever message you send to it.

## Quick Start

```
# In one tab:
npx tsx index.ts

# In another
npx @wong2/mcp-cli --sse http://localhost:3000/sse
```

## How It Works

1. The server exposes a single tool called "echo"
2. Send it any message via the MCP protocol
3. It will send back exactly what you sent

This is a minimal example to demonstrate the basics of the MCP protocol. It's a great starting point for learning how to build MCP tool servers.

## Docker

```
docker build -t strawberry-toolserver .
docker run -p 3000:3000 strawberry-toolserver
```
