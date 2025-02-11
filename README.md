# Strawberry Toolserver Starter

This repository provides a **starter kit** for building and deploying your own **Strawberry.fun**-compatible AI tools. With Strawberry, you can quickly create a **Model Context Protocol (MCP)** server that either offers a free “open” API (like `index.ts`) or a **token-gated** API (like `index-gated.ts`) requiring users to hold a specific token before they can access your tool.

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/template/kgM9wm)

---

## Why Strawberry?

**Strawberry.fun** is the App Store for AI Agents that allows tool builders to:

- **Publish** services (APIs) in a **machine-discoverable** manner.
- **Tokenize** each service with its own ERC-20 token.
- **Gate** usage by checking token balances (or more advanced pay-per-request flows).
- **Earn fees** as AI agents and users buy the token for your tool.

This kit leverages:

- **@modelcontextprotocol/sdk**: A standard for AI “tool servers,” letting any AI agent call them over an MCP endpoint.
- **@strawberryprotocol/str-toolserver**: A library that simplifies building a tool server with token gating, EIP-712 signature verification, and more.

---

## Key Files & Structure

```
.
├── src
│   ├── index.ts         # Basic echo server (no gating)
│   └── index-gated.ts   # Token-gated echo server
├── Dockerfile           # Multi-stage Docker build
├── package.json         # Project scripts & dependencies
├── tsconfig.json        # TypeScript config
└── README.md            # This file
```

1. **`src/index.ts`**  
   Demonstrates a **basic** MCP tool server that simply echoes back a user’s message—no token checks, no gating required.

2. **`src/index-gated.ts`**  
   Shows **token gating** in action using `createTokenGateVerifier` from `@strawberryprotocol/str-toolserver`. This server requires a user to hold at least 1 token (configurable) of your specified contract before they can use the “echo” tool.

3. **`Dockerfile`**  
   A ready-to-go Docker build for easily deploying your tool server on services like **Railway**, **AWS**, **Azure**, or **GCP**.

4. **`package.json`**  
   Includes scripts to build, run, or develop your server locally, plus dependencies on MCP and Strawberry libraries.

---

## Getting Started

### 1. Clone & Install

```bash
git clone https://github.com/<yourusername>/toolserver-starter.git
cd toolserver-starter
npm install
```

### 2. Choose Your Entry Point

- **Open Access**: Use `src/index.ts`
  ```bash
  npx tsx src/index.ts
  ```
- **Token-Gated**: Use `src/index-gated.ts`
  ```bash
  npx tsx src/index-gated.ts
  ```

### 3. Configure Environment (for Token Gating)

If you’re using `index-gated.ts`, you can set up a `.env` file (or environment variables) to specify:

| Variable                | Description                                                |
| ----------------------- | ---------------------------------------------------------- |
| `RPC_URL`               | The chain RPC URL (e.g., https://sepolia.base.org)         |
| `STRAWBERRY_NETWORK_ID` | The numeric chain ID (e.g., `84531` for Base Goerli, etc.) |
| `LOCALHOST_TOKEN`       | The address of your tool’s token (ERC-20)                  |

Example `.env`:

```
RPC_URL=https://sepolia.base.org
STRAWBERRY_NETWORK_ID=11155111
LOCALHOST_TOKEN=0x123456789abcdef123456789abcdef1234567890
```

### 4. Test Locally

1. **Launch** the server:

   ```bash
   # For the open version
   npx tsx src/index.ts

   # Or the token-gated version
   npx tsx src/index-gated.ts
   ```

2. **Interact** via an MCP-compatible client (e.g., `mcp-cli`):
   ```bash
   npx @wong2/mcp-cli --sse http://localhost:3000/sse
   ```
   - For the open server, you can simply send an `echo` request.
   - For the gated server, ensure you have a valid EIP-712 signature and hold tokens in your wallet.

### 5. Deploy to Production (Railway, Docker, etc.)

#### Docker

Build and run the included Dockerfile:

```bash
docker build -t my-toolserver .
docker run -p 3000:3000 my-toolserver
```

Your server will start on port 3000.

#### Railway

We’ve included a `Deploy on Railway` button in the original `README.md`. If you forked this repo or set up your own GitHub project, you can add:

```
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new)
```

and configure your environment variables on Railway’s dashboard.

---

## Usage & Integration

1. **Register Your Tool**  
   Once your server is running, you can list it on Strawberry.fun by setting your tool’s `apiURI` on-chain (e.g., `https://your-hosted-url.com/sse`).

   - This makes it discoverable for AI agents using Strawberry’s on-chain registry.

2. **Experiment with Gating**

   - If you want a simple gating approach, check out `src/index-gated.ts` for an example.
   - By changing `minTokenBalance: 1n` to another value, you can require different balances for usage.
   - For pay-per-request or advanced billing, see the Strawberry docs for next-level examples.

3. **Extend or Replace the Echo Tool**
   - Add more complex routes or logic in your MCP server.
   - If you want multiple tools in the same server, include them under `server.setRequestHandler(ListToolsRequestSchema, ...)`.

---

## Contributing & Support

- **Strawberry.fun Docs**: Check out the official [Gitbook documentation](https://strawberry.fun/docs) for more details on how AI agents, tokens, and bonding curves work.
- **Issues / Feature Requests**: Please open a GitHub issue if you encounter a bug or want to suggest an improvement.
- **Community**: Join the Strawberry community (Discord, Telegram, etc.) to get support from fellow developers and the core team.

---

## License

This project is licensed under the [MIT License](./LICENSE). You are free to modify, distribute, and commercialize your tool server in accordance with the license terms.
