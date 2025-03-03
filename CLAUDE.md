# Strawberry Toolserver Starter Commands & Conventions

## Build & Run Commands

- Build: `npm run build` - Compiles TypeScript to JavaScript
- Start: `npm run start` - Runs the compiled code
- Development: `npm run dev` - Uses tsx for direct TS execution
- Linting: `npm run lint` and `npm run lint-fix` - Uses ESLint
- Formatting: `npm run format` and `npm run format-check` - Uses Prettier

## Code Style Guidelines

- **TypeScript**: Strict typing enabled, no implicit any
- **Imports**: ES Module style with full paths, destructuring when appropriate
- **Naming**: camelCase for variables/functions, PascalCase for types/interfaces
- **Formatting**: Uses Prettier, 2-space indentation
- **Error Handling**: Try/catch blocks with descriptive error messages
- **File Organization**: Source code in src/, compiled output to dist/
- **Environment Variables**: Uses dotenv for configuration

# Intro

The codebase is a boilerplate Node.js TypeScript application using the Model Context Protocol (MCP) SDK and Strawberry Protocol for building blockchain tooling services.

If the user wants you to create an MCP or Strawberry server, read the `PROMPT.md` file for clear examples on how to convert an existing API to a Strawberry-compatible MCP server.
