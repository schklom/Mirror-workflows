# FMD Server Web

Modern web interface for FMD Server built with Next.js, TypeScript, and Tailwind CSS.

## Requirements

- Node.js 24+ (see `.nvmrc`)

## Setup

Enable corepack to use pnpm:

```bash
corepack enable
```

Then install dependencies:

```bash
pnpm install
```

## Development

Start the Go backend (in project root):

```bash
cd .. && go run . serve
```

In another terminal, start Next.js dev server:

```bash
pnpm dev
```

Next.js will proxy `/api/v1/*` requests to the Go server on port 8080.

You can also proxy to an external server for testing by modifying the proxy configuration:

```typescript
destination: 'https://fmd.nulide.de:1008/api/v1/:path*';
```

## Build

```bash
pnpm build
```

## Scripts

- `pnpm check` - Run type-check, lint, and format checks
- `pnpm analyze` - Analyze bundle size
