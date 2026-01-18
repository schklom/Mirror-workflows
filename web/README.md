# FMD Server Web

Modern web interface for FMD Server built with React, TypeScript, Vite and Tailwind.

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

In another terminal, start Vite dev server:

```bash
pnpm dev
```

Vite will proxy `/api/v1/*` requests to the Go server on port 8080.

You can also proxy to an external server for testing by modifying the proxy configuration:

```typescript
destination: 'https://server.fmd-foss.org/api/v1/:path*';
```

## Build

```bash
pnpm build
```

## Scripts

- `pnpm check` - Run type-check, lint, and format checks
- `pnpm analyze` - Analyze bundle size

## UI Components

We use [shadcn/ui](https://ui.shadcn.com/) for UI components. With shadcn/ui components are copied directly into the project's codebase in `app/components/ui/`.

### Adding New Components

To add a new shadcn/ui component:

```bash
npx shadcn@latest add <component-name>
```

For example:

```bash
npx shadcn@latest add button
npx shadcn@latest add dialog
```

### Updating Components

Since added shadcn/ui components live in the codebase:

- Their imported `@radix-ui/*` packages can be updated normally with `pnpm update`
- Component code itself can be manually updated by re-running the add command or manually editing files in `app/components/ui/`
