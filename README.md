# Webhook Tester

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE) [![Node.js](https://img.shields.io/badge/Node.js-20%2B-green.svg)](https://nodejs.org/) [![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)](https://www.typescriptlang.org/) [![Docker](https://img.shields.io/badge/Docker-ready-blue.svg)](Dockerfile) [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

A self-hosted tool for testing webhook delivery, retry logic, and failure handling.

## What It Does

Webhook Tester lets you create isolated channels that receive webhooks and respond with configurable behaviors. Point your webhook producer at a channel URL, then simulate successes, errors, timeouts, slow responses, and more. Use it to verify retry logic, test circuit breaker behavior, validate JWT signatures, and run predefined test scenarios -- all through a web UI or REST API.

## Features

- Create isolated webhook channels, each with a unique URL, behavior config, and history
- Simulate responses: 200 OK, 400/401/404/429, 500, timeouts, slow responses, redirects
- Behavior sequences -- rotate through a list of responses across consecutive requests
- JWT signature verification (RS256) via configurable public key per channel
- 24 predefined test scenarios covering retry logic, circuit breakers, exponential backoff, edge cases, and more
- Real-time event stream via Server-Sent Events (SSE)
- Full webhook history with request headers, body, and response details
- Delivery analysis that groups attempts by event ID and computes retry gaps
- Docker-ready with embedded PostgreSQL -- single container, no external dependencies

## Quick Start

### Docker (single command)

```sh
docker build -t webhook-tester . && docker run -p 4100:4100 webhook-tester
```

Open `http://localhost:4100`. Create a channel, then send webhooks to `http://localhost:4100/api/webhook/{slug}`.

### Local Development

Requires Node.js 20+ and Docker (for PostgreSQL).

```sh
./start.sh dev
```

This starts PostgreSQL in Docker, runs migrations, and launches the dev server with hot reload on port 4100.

## Local Development Setup

```sh
# Clone the repository
git clone <repo-url> && cd webhook-tester

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Start PostgreSQL
docker compose up -d db

# Run database migrations
DATABASE_URL="postgres://webhook:webhook_local@localhost:5433/webhook_tester" npx prisma db push

# Generate Prisma client
npx prisma generate

# Start the dev server
DATABASE_URL="postgres://webhook:webhook_local@localhost:5433/webhook_tester" npm run dev
```

Or simply run `./start.sh` which handles all of the above automatically.

## Usage

1. **Create a channel** -- Open the UI at `http://localhost:4100` and create a channel with a slug (e.g., `my-test`).
2. **Send webhooks** -- Point your webhook producer at `http://localhost:4100/api/webhook/my-test`.
3. **Configure behavior** -- Use the UI or API to set how the channel responds (success, error, timeout, sequence, etc.).
4. **Observe results** -- Watch incoming webhooks in real time. Review history, retry patterns, and delivery analysis.
5. **Run scenarios** -- Activate a predefined scenario to test specific patterns like retry exhaustion or circuit breaker tripping.

## API Reference

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check and uptime |

### Channel Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/channels` | List all channels |
| POST | `/api/channels` | Create a channel (`{ slug, name }`) |
| GET | `/api/channels/:slug` | Get channel details and state |
| DELETE | `/api/channels/:slug` | Delete a channel and all its data |
| GET | `/api/channels/:slug/status` | Get current channel state |
| POST | `/api/channels/:slug/behavior` | Set response behavior (`{ behavior, delayMs?, statusCode? }`) |
| POST | `/api/channels/:slug/sequence` | Set behavior sequence (`{ steps: [{ behavior, delayMs? }] }`) |
| POST | `/api/channels/:slug/public-key` | Set public key for JWT verification (`{ publicKey }`) |
| POST | `/api/channels/:slug/reset` | Reset channel to defaults and clear history |

### Webhook Receiver

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/webhook/:slug` | Receive a webhook (this is the URL you give to producers) |
| POST | `/api/webhook/:slug/*` | Receive a webhook on any sub-path |

### History and Analysis

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/channels/:slug/history` | Get webhook history (`?limit=&offset=&event=`) |
| DELETE | `/api/channels/:slug/history` | Clear webhook history |
| GET | `/api/channels/:slug/history/last` | Get the most recent webhook |
| GET | `/api/channels/:slug/history/:id` | Get a specific webhook by ID |
| GET | `/api/channels/:slug/observe` | Delivery analysis (grouped by event ID) |
| GET | `/api/channels/:slug/observe/:eventId` | Delivery analysis for a specific event |

### Scenarios

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/scenarios` | List all predefined scenarios |
| POST | `/api/channels/:slug/scenarios/:name/activate` | Activate a scenario on a channel |

### Real-Time Events

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/channels/:slug/events` | SSE stream (events: `webhook`, `state-change`, `reset`, `history-cleared`) |

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgres://webhook:webhook_local@localhost:5433/webhook_tester` | PostgreSQL connection string |
| `PORT` | `4100` | Server port |

## Security Note

Management endpoints (channel creation, behavior configuration, history) have no authentication. This tool is intended for local development and internal test environments. If you deploy it on a publicly accessible server, put it behind a reverse proxy with authentication.

## Tech Stack

Next.js, React, PostgreSQL, Prisma, TypeScript, Tailwind CSS

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
