Strawberry.fun is a crypto-powered marketplace specifically designed for AI agents, allowing them to autonomously discover, purchase, and utilize specialized tools and services through a seamless, tokenized ecosystem. Each available AI tool is associated with a unique crypto token, creating a frictionless machine-to-machine commerce environment where payments and tool access occur automatically without human intervention.

This document outlines how to build a _tool server_ using the Strawberry SDK.

I'm going to give you a few examples, then I want you to implement my new toolserver following my instructions.

Strawberry Tool Servers follow the Model Context Protocol API.

# Example 1: Hello World

This is a "hello world" example server:

<example>

```ts
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
```

</example>

Explanation:

When creating an MCP (Model Context Protocol) server with the Strawberry SDK, you configure it with two main components:

1. **Tool Definitions (ListTools Handler)**:
   This acts as a "prompt" for the LLM, telling it what tools are available and how to use them. You define:

   - The name of each tool
   - A description of what the tool does
   - A Zod schema describing the expected arguments

   In the example above, this is implemented in the `ListToolsRequestSchema` handler, which defines an "echo" tool that takes a "message" parameter.

2. **Tool Implementation (CallTool Handler)**:
   This is where you implement the actual functionality of your tools. When a tool is called, you:

   - Receive the request with the tool name and arguments
   - Process the arguments and perform the tool's function
   - Return a response object, typically containing text

   In the example, this is implemented in the `CallToolRequestSchema` handler, which simply returns the message that was sent.

The server handles the routing between different tools based on the tool name specified in the request. For more complex servers, you would typically switch on the tool name in the CallTool handler to execute different functionality for each tool.

# Adding Token Gating

One of the main advantages of Strawberry is you can monetize your MCP server. The main way we do this now is _token gating_ where we check to make sure the client has ownership of tokens that allow them access

Example two:

<example>

```ts
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
```

</example>

Explanation:

This second example demonstrates how to implement token gating in your MCP server, which allows you to monetize your tools by requiring users to hold a specific token to access them. Here are the key new components:

1. **Token Gate Verifier Setup**:

   - The server imports additional dependencies for blockchain interaction (`viem`, `createTokenGateVerifier`)
   - It creates a blockchain client that connects to a specific network (Base Sepolia in this case)
   - It configures verification options including:
     - The blockchain domain information
     - The token contract address that users must hold
     - The minimum token balance required (1 token in this example)

2. **Modified Tool Schema**:

   - The tool definition now includes an additional required parameter: `strawberry_signature`
   - This signature parameter is an EIP-712 cryptographic signature that proves the user owns the wallet with the required tokens
   - The tool description now indicates that it requires token ownership to use

3. **Token Verification in the Handler**:
   - The CallTool handler now wraps its functionality in a try/catch block
   - It calls the verifier function with the request, which:
     - Validates the signature is authentic
     - Checks the token balance of the signer
     - Throws an error if either validation fails
   - If verification succeeds, it returns the signer's address and token balance along with the echo response
   - If verification fails, it returns a user-friendly error message

This token gating pattern enables you to create tools that require token ownership for access, creating a monetization model for your MCP server. Users must hold the specified token in their wallet and sign their requests cryptographically to prove ownership.

# More complex actions

Of course, both of these examples show simple servers that don't do much. Here's an example that uses a weather API to have several different tools and arguments:

<example>

```ts
#!/usr/bin/env node

/**
 * Weather Tool Server
 *
 * This server implements the Model Context Protocol (MCP) to provide weather forecast data
 * from the National Weather Service (NWS) API. It exposes a single tool "get-forecast"
 * that returns detailed weather information for US locations.
 *
 * @see https://modelcontextprotocol.io/quickstart
 * @module WeatherToolServer
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ServerResult
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { strawberry } from "@strawberryprotocol/str-toolserver";
import getPort, { portNumbers } from "get-port";

/** Base URL for the National Weather Service API */
const NWS_API_BASE = "https://api.weather.gov";
/** User agent string for NWS API requests */
const USER_AGENT = "weather-app/1.0";

/** Base URL for the OpenStreetMap Nominatim API */
const NOMINATIM_API_BASE = "https://nominatim.openstreetmap.org";

/**
 * Interface for MCP tool response content
 */
interface ToolResponseContent {
  type: string;
  text: string;
}

/**
 * Interface for MCP tool response
 */
interface ToolResponse {
  content: ToolResponseContent[];
}

/**
 * Interface for MCP server response
 */
interface MCPResponse {
  result: ToolResponse;
}

/**
 * Schema for validating forecast request arguments
 * @property {number} latitude - The latitude coordinate, must be between -90 and 90 degrees
 * @property {number} longitude - The longitude coordinate, must be between -180 and 180 degrees
 */
const ForecastArgumentsSchema = z.object({
  latitude: z.number().min(-90.0).max(90.0),
  longitude: z.number().min(-180.0).max(180.0)
});

/**
 * Schema for validating location name request arguments
 * @property {string} location - The name of the location to get weather for
 */
const LocationArgumentsSchema = z.object({
  location: z.string().min(1)
});

/**
 * Creates and configures the MCP server instance
 * The server exposes a single tool "get-forecast" that provides weather forecasts
 * for US locations using the National Weather Service API.
 */
function createServer() {
  const server = new Server(
    {
      name: "weather",
      version: "1.0.0"
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );

  /**
   * Handles the ListTools request by returning metadata about available tools
   * Currently exposes a single tool "get-forecast" that accepts latitude/longitude coordinates
   *
   * To add more tools, add them to the tools array
   */
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "get-forecast",
          description:
            "Get weather forecast for a location in the US using coordinates",
          inputSchema: {
            type: "object",
            properties: {
              latitude: {
                type: "number",
                description: "Latitude of the location"
              },
              longitude: {
                type: "number",
                description: "Longitude of the location"
              }
            },
            required: ["latitude", "longitude"]
          }
        },
        {
          name: "get-forecast-by-name",
          description:
            "Get weather forecast for a location in the US using its name",
          inputSchema: {
            type: "object",
            properties: {
              location: {
                type: "string",
                description:
                  "Name of the location (e.g. 'New York City' or 'Los Angeles, CA')"
              }
            },
            required: ["location"]
          }
        }
      ]
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      if (name === "get-forecast") {
        const { latitude, longitude } = ForecastArgumentsSchema.parse(args);
        const forecast = await getForecastForCoordinates(latitude, longitude);
        return {
          content: forecast.content
        } as ServerResult;
      } else if (name === "get-forecast-by-name") {
        const { location } = LocationArgumentsSchema.parse(args);

        const geocodingResult = await geocodeLocation(location);
        if (!geocodingResult) {
          return {
            content: [
              {
                type: "text",
                text: `Could not find coordinates for location: ${location}`
              }
            ]
          } as ServerResult;
        }

        const latitude = parseFloat(geocodingResult.lat);
        const longitude = parseFloat(geocodingResult.lon);
        const forecast = await getForecastForCoordinates(latitude, longitude);

        // Add the resolved location name to the result
        if (forecast.content?.[0]?.text) {
          forecast.content[0].text = `Location: ${geocodingResult.display_name}\n\n${forecast.content[0].text}`;
        }

        return {
          content: forecast.content
        } as ServerResult;
      } else {
        throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          content: [
            {
              type: "text",
              text: `Invalid arguments: ${error.errors
                .map((e) => `${e.path.join(".")}: ${e.message}`)
                .join(", ")}`
            }
          ]
        } as ServerResult;
      }
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: "text",
            text: `Error: ${errorMessage}`
          }
        ]
      } as ServerResult;
    }
  });

  return server;
}

/**
 * Makes a request to the NWS API with appropriate headers
 * @template T - The expected response type
 * @param {string} url - The NWS API endpoint URL
 * @returns {Promise<T | null>} The parsed response data or null if the request fails
 */
async function makeNWSRequest<T>(url: string): Promise<T | null> {
  const headers = {
    "User-Agent": USER_AGENT,
    Accept: "application/geo+json"
  };

  try {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return (await response.json()) as T;
  } catch (error) {
    console.error("Error making NWS request:", error);
    return null;
  }
}

/**
 * Interface describing the structure of a forecast period from the NWS API
 * @interface ForecastPeriod
 */
interface ForecastPeriod {
  name?: string;
  temperature?: number;
  temperatureUnit?: string;
  windSpeed?: string;
  windDirection?: string;
  shortForecast?: string;
}

/**
 * Interface for the response from the NWS Points endpoint
 * @interface PointsResponse
 */
interface PointsResponse {
  properties: {
    /** URL for the forecast data */
    forecast?: string;
  };
}

/**
 * Interface for the response from the NWS Forecast endpoint
 * @interface ForecastResponse
 */
interface ForecastResponse {
  properties: {
    periods: ForecastPeriod[];
  };
}

/**
 * Interface for the response from the Nominatim geocoding API
 * @interface GeocodingResponse
 */
interface GeocodingResponse {
  lat: string;
  lon: string;
  display_name: string;
}

/**
 * Gets the forecast for a specific latitude and longitude
 * @param {number} latitude - The latitude coordinate
 * @param {number} longitude - The longitude coordinate
 * @returns {Promise<ToolResponse>} The formatted forecast result
 */
async function getForecastForCoordinates(
  latitude: number,
  longitude: number
): Promise<ToolResponse> {
  // Get grid point data
  const pointsUrl = `${NWS_API_BASE}/points/${latitude.toFixed(
    4
  )},${longitude.toFixed(4)}`;
  const pointsData = await makeNWSRequest<PointsResponse>(pointsUrl);

  if (!pointsData) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to retrieve grid point data for coordinates: ${latitude}, ${longitude}. This location may not be supported by the NWS API (only US locations are supported).`
        }
      ]
    };
  }

  const forecastUrl = pointsData.properties?.forecast;
  if (!forecastUrl) {
    return {
      content: [
        {
          type: "text",
          text: "Failed to get forecast URL from grid point data"
        }
      ]
    };
  }

  // Get forecast data
  const forecastData = await makeNWSRequest<ForecastResponse>(forecastUrl);
  if (!forecastData) {
    return {
      content: [
        {
          type: "text",
          text: "Failed to retrieve forecast data"
        }
      ]
    };
  }

  const periods = forecastData.properties?.periods || [];
  if (periods.length === 0) {
    return {
      content: [
        {
          type: "text",
          text: "No forecast periods available"
        }
      ]
    };
  }

  // Format forecast periods
  const formattedForecast = periods.map((period: ForecastPeriod) =>
    [
      `${period.name || "Unknown"}:`,
      `Temperature: ${period.temperature || "Unknown"}°${
        period.temperatureUnit || "F"
      }`,
      `Wind: ${period.windSpeed || "Unknown"} ${period.windDirection || ""}`,
      `${period.shortForecast || "No forecast available"}`,
      "---"
    ].join("\n")
  );

  return {
    content: [
      {
        type: "text",
        text: `Forecast for ${latitude}, ${longitude}:\n\n${formattedForecast.join(
          "\n"
        )}`
      }
    ]
  };
}

/**
 * Makes a request to the Nominatim API to geocode a location name
 * @param {string} location - The location name to geocode
 * @returns {Promise<GeocodingResponse | null>} The geocoding response or null if the request fails
 */
async function geocodeLocation(
  location: string
): Promise<GeocodingResponse | null> {
  const url = `${NOMINATIM_API_BASE}/search?q=${encodeURIComponent(
    location
  )}&format=json&limit=1`;
  const headers = {
    "User-Agent": USER_AGENT
  };

  try {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const results = (await response.json()) as GeocodingResponse[];
    return results[0] || null;
  } catch (error) {
    console.error("Error geocoding location:", error);
    return null;
  }
}

/**
 * Initializes and starts the Express server with SSE transport
 * Sets up endpoints for SSE connection and message handling
 *
 * MCP works by maintaining a connection to the /sse endpoint. Your client sends
 * messages to the /messages endpoint and receives responses from the open /sse
 * endpoint
 *
 * @throws {Error} If server initialization fails
 */
async function main() {
  const app = strawberry(createServer);
  app.connect();

  const port = await getPort({ port: portNumbers(3000, 3100) });
  app.listen(port, () => {
    console.error(`Weather MCP Server running on http://localhost:${port}`);
  });
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
```

</example>

Explanation:

This third example demonstrates a more complex MCP server that implements multiple tools and interacts with external APIs. Here are the key components that make this example more advanced:

1. **Multiple Tool Definitions**:

   - The server defines two distinct tools in the `ListToolsRequestSchema` handler:
     - `get-forecast`: Gets weather data using latitude/longitude coordinates
     - `get-forecast-by-name`: Gets weather data using a location name
   - Each tool has its own unique input schema with different required parameters
   - The tools are related but serve different use cases, giving the LLM options for how to access the weather data

2. **Tool Routing in the Handler**:

   - The `CallToolRequestSchema` handler uses a conditional structure to route requests to the appropriate implementation:
     ```typescript
     if (name === "get-forecast") {
       // Handle coordinate-based forecast
     } else if (name === "get-forecast-by-name") {
       // Handle name-based forecast
     } else {
       throw new Error(`Unknown tool: ${name}`);
     }
     ```
   - This pattern allows you to implement different functionality for each tool while sharing a single handler

3. **Input Validation**:

   - Each tool uses a dedicated Zod schema to validate its arguments:
     - `ForecastArgumentsSchema` for coordinate-based requests
     - `LocationArgumentsSchema` for location name requests
   - The validation ensures that inputs meet requirements before processing
   - Error handling returns user-friendly messages when validation fails

4. **External API Integration**:

   - The server interacts with two external APIs:
     - National Weather Service API for weather data
     - OpenStreetMap Nominatim API for geocoding location names
   - Helper functions abstract the API interactions (`makeNWSRequest`, `geocodeLocation`)
   - Error handling gracefully manages API failures

5. **Data Transformation**:
   - The server transforms the raw API responses into a user-friendly format
   - The `getForecastForCoordinates` function processes and formats the weather data
   - For location-based requests, it enriches the response with the resolved location name

This example shows how you can create a more sophisticated MCP server that:

- Offers multiple related tools with different interfaces
- Implements proper routing between tools
- Validates inputs and handles errors gracefully
- Interacts with external APIs
- Transforms data into user-friendly formats

By offering multiple tools in a single server, you can provide a more comprehensive service that gives LLMs flexibility in how they access your functionality, while maintaining a clean separation of concerns in your implementation.

# Making Your Own

To make your own you need to:

- Decide what tools you're doing to expose
- Define the schema and metadata for ListToolsRequestSchema
- Define the implementations in the callback for CallToolRequestSchema
- Implement any token gating necessary

# Tips

The MCP protocol is stateful and supports sessions. Use the session ID whenever you need to reference long-lasting or session data.

Your MCP client should connect to the /sse route as in: http://localhost:3000/sse

You can test it out with the `mcp-cli` tool as in: `npx @strawberryprotocol/mcp-cli --sse http://localhost:3000/sse`

# Deployment

You can deploy these servers anywhere where sse is supported. A Dockerfile is included
