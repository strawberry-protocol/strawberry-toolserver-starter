#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from "@modelcontextprotocol/sdk/types.js";
import { strawberry } from "@strawberryprotocol/str-toolserver";
import { createTokenGateVerifier } from "@strawberryprotocol/str-toolserver";
import { Address, createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import dotenv from "dotenv";

dotenv.config({ path: `${__dirname}/.env` });

function createServer() {
  // Create a simple MCP server
  const server = new Server(
    { name: "echo", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );

  // Create public client for token balance checks
  const rpcUrl = process.env.RPC_URL || "https://sepolia.base.org";

  const client = createPublicClient({
    chain: baseSepolia,
    transport: http(rpcUrl)
  });

  const verifierOptions = {
    domain: {
      name: "Strawberry.fun",
      version: "1",
      chainId: parseInt(process.env.STRAWBERRY_NETWORK_ID || "1") as number
    },
    tokenAddress: process.env.LOCALHOST_TOKEN as Address,
    minTokenBalance: 1n
  };
  console.log(verifierOptions);

  // Create a token gate verifier
  const verifier = createTokenGateVerifier(client as any, verifierOptions);

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "echo",
        description: "Token-gated echo service - requires 1 token to use",
        inputSchema: {
          type: "object",
          properties: {
            message: { type: "string", description: "Message to echo back" },
            strawberry_signature: {
              type: "string",
              description: "EIP-712 signature of the request parameters"
            }
          },
          required: ["message", "strawberry_signature"]
        }
      }
    ]
  }));

  // Handle echo requests with token gating
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      // This will throw if signature is invalid or token balance is insufficient
      const { signerAddress, balance } = await verifier(request);

      return {
        content: [
          {
            type: "text",
            text: `Message from ${signerAddress} (balance: ${balance}): ${
              request.params.arguments?.message || "No message provided"
            }`
          }
        ]
      };
    } catch (error: any) {
      throw new Error(`Access denied: ${error?.message || "Unknown error"}`);
    }
  });

  return server;
}

// Start the server
const app = strawberry(createServer);
app.connect();

app.listen(3000, () =>
  console.log("Token-gated echo server running on http://localhost:3000")
);
