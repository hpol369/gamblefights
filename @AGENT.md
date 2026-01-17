# Agent Context & Instructions

## Project: GambleFights

### Build Commands
*   **Bootstrap**: `make install` (Installs npm deps and Go mods)
*   **Run Frontend**: `make dev-web` (Next.js on localhost:3000)
*   **Run Backend**: `make dev-server` (Go server on localhost:8080)
*   **Run Tests**: `go test ./...` (Runs all backend tests)

### Directory Structure
*   `web/`: Next.js frontend application.
*   `server/`: Go backend API and game server.
*   `unity/`: Unity project files (Animation Engine).
*   `specs/`: Detailed documentation and plans.

### Critical Rules
1.  **Provably Fair First**: Never compromise on the RNG verification logic.
2.  **Type Safety**: Ensure strict typing in Go and TypeScript.
3.  **Error Handling**: No silent failures. Log everything.
