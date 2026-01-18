# FMD Server Web

Modern web interface for FMD Server built with React, TypeScript, Vite and Tailwind.

## Setup

- Install [NodeJS](https://nodejs.org/en/download/)
- Enable pnpm: `corepack enable`
- Install dependencies: `pnpm install`

## Development

Start the Go backend (in project root):

```bash
cd .. && go run . serve
```

In another terminal, start the Vite dev server:

```bash
pnpm dev
```

Vite will proxy `/api` requests to the locally running Go backend.
You can also proxy to an external server for testing by modifying the proxy configurationin [vite.config.ts](vite.config.ts).

## Build

```bash
pnpm build
```

## Scripts

- `pnpm check` - Run type-check, lint, and format checks
- `pnpm analyze` - Analyze bundle size

## UI Components

We use [shadcn/ui](https://ui.shadcn.com/) for UI components.
These components are copied directly into the project's codebase in `src/components/ui/`.
See the shadcn/ui documentation for details.

Since added shadcn/ui components live in the codebase:

- Their imported `@radix-ui/*` packages can be updated normally with `pnpm update`
- Component code itself can be manually updated by re-running the add command or manually editing files in `app/components/ui/`
- The components can be lightly modified, to build a project-specific base component library.
  For heavier modifications, please define separate new components.
