#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from "@modelcontextprotocol/sdk/types.js";
import { strawberry } from "@strawberryprotocol/str-toolserver";

// Create a simple MCP server
function createServer() {
  const server = new Server(
    { name: "echo", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "echo",
        description: "Echoes back whatever message you send",
        inputSchema: {
          type: "object",
          properties: {
            message: { type: "string", description: "Message to echo back" }
          },
          required: ["message"]
        }
      }
    ]
  }));

  // Handle echo requests
  server.setRequestHandler(CallToolRequestSchema, async (request) => ({
    content: [
      {
        type: "text",
        text: request.params.arguments?.message || "No message provided"
      }
    ]
  }));

  return server;
}

// Start the server
const app = strawberry(createServer);
app.connect();

async function main() {
  const port = 3000;
  app.listen(port, () =>
    console.log(`Echo server running on http://localhost:${port}`)
  );
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
