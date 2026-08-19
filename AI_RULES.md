# AI Development Rules

## Tech Stack and Library Rules

- **Package management:** This is a pnpm monorepo. Use pnpm workspace packages and the shared dependency catalog; do not introduce npm/yarn lockfiles or shell-specific lifecycle scripts.
- **Frontend:** Build the main app in `artifacts/super-computer` with React 19, TypeScript, and Vite. Keep application source in its `src/` directory and define routes in `src/App.tsx` using Wouter.
- **Styling:** Use Tailwind CSS 4 utility classes for layout and visual styling. Put only shared tokens, resets, and truly global styles in `src/index.css`.
- **UI components:** Prefer the existing shadcn/ui components in `src/components/ui` and their Radix UI primitives. Do not edit generated UI primitives when a wrapper or feature component can provide the required customization.
- **Icons and motion:** Use `lucide-react` for icons and `framer-motion` only for meaningful animation. Do not add another icon or animation library for functionality these packages already cover.
- **Forms and validation:** Use `react-hook-form` for form state, `@hookform/resolvers` with Zod for validation, and keep validation schemas reusable where client/server boundaries share the same data contract.
- **Data and APIs:** Use TanStack React Query and the generated `@workspace/api-client-react` package for server state. Keep API contracts in `lib/api-spec`, generated validation in `lib/api-zod`, and avoid hand-written duplicate request types.
- **Backend and persistence:** Use Express for the workspace API server, Vercel functions for existing serverless endpoints, Drizzle ORM for database access, and Firebase only for the authentication/data flows already built around it. Never expose secrets in frontend code; validate all external input at the server boundary.

## General Implementation Rules

- Keep pages in `src/pages`, reusable feature components in `src/components`, context providers in `src/contexts`, hooks in `src/hooks`, and utilities in `src/lib`.
- Reuse existing dependencies and project patterns before adding packages. Keep changes focused, fully typed, accessible, responsive, and free of placeholders or unfinished TODOs.
- Preserve workspace package boundaries and import shared code through `@workspace/*` packages rather than deep relative paths across packages.
