# Areacodes Monorepo Coding Standards

## File & Folder Organization

- Route files use TanStack Router convention: files in `app/routes/` are automatically routed via file name patterns (`__root.tsx`, `_layout.tsx`, `$.tsx` for catch-all)
- Components live in `app/components/`, organized by feature (e.g., `form-steps/`, `voucher/`)
- Schemas (Zod validation) live in `app/schemas/` alongside their consumers
- Hooks live in `app/hooks/` and use `use-` prefix with kebab-case filenames (e.g., `use-file-upload.ts`)
- Utilities and lib functions live in `app/lib/` (e.g., `parse-address.ts`, `utils.ts`)
- Convex functions live in `packages/convex/convex/functions/` organized by entity (e.g., `businesses.ts`, `vouchers.ts`, `industries.ts`)

## Naming Conventions

- **Components**: PascalCase, exported as `export const ComponentName = () => {}`
- **Functions/Hooks**: camelCase for functions, kebab-case for hook filenames (e.g., function `useFileUpload` in file `use-file-upload.ts`)
- **Types/Interfaces**: PascalCase (e.g., `FileMetadata`, `BusinessProfileFormValues`)
- **Variables/Constants**: camelCase for mutable state, UPPER_SNAKE_CASE for immutable constants
- **Files**: kebab-case for component/hook/utility files; PascalCase for route files with file-based routing
- **Schema variables**: camelCase ending in `Schema` or specific suffix (e.g., `businessProfileFormSchema`, `voucherFormSchema`)

## Imports & Exports

- Use named exports exclusively; no default exports from components or hooks
- Barrel files re-export from subfolders (e.g., `packages/ui/src/index.ts` exports all components)
- Use path aliases: `~/*` for app-relative imports, `@repo/*` for monorepo package imports
- Import order: external libs, monorepo packages (`@repo/`), relative paths (`~/`)
- Convex exports centralized in `packages/convex/src/index.ts` as `export { api } from "../convex/_generated/api"`

## Component Patterns

- React function components with `export const ComponentName = () => {}` signature
- Props typed inline with destructuring: `({ prop1, prop2 }: { prop1: string; prop2?: number })` for simple cases
- Complex props use separate interface: `interface ComponentProps { ... }` defined above component
- Render conditionals use early returns: check loading/null states first, then render success state
- Container/Section components export const with capitalized names (e.g., `DashboardTop`, `StatsSection`)

## Types & TypeScript

- Use `type` over `interface` for type aliases
- Use `interface` only for domain models and protocol-like structures (e.g., `Business`, `Voucher`)
- Export form/schema types using `z.infer<typeof schema>`: `export type FormValues = z.infer<typeof formSchema>`
- Import types with `type` keyword: `import type { Id } from "@repo/convex"`
- Use `as const` for literal string/number definitions in Zod or component variants
- DOM element types use `React.ComponentProps<"element">` pattern for type-safe event handlers

## Schema & Validation (Zod)

- Define schemas at module level: `export const schemaName = z.object({ ... })`
- Chain methods for validation clarity: `z.string().min(1, "error message")`
- Use `z.union()` with `z.literal()` for enum-like strings
- Use `.refine()` for custom validation (e.g., UK postcode regex)
- Use `.transform()` for data transformation before validation (e.g., whitespace trimming)
- Optionals use `.optional()` not `?:` in schema, then infer the type

## Convex Patterns

- Define schema with `defineSchema()`, tables with `defineTable()` using Convex server API
- Define queries/mutations with `query()` and `mutation()` wrapper functions
- Authentication check via helper function: `async function requireAuth(ctx: QueryCtx | MutationCtx): Promise<string>`
- Throw descriptive errors for auth failures: `if (!identity) throw new Error("Unauthenticated")`
- Index frequently queried fields: `.index("by_field_name", ["fieldName"])` on tables
- Soft delete pattern: store `deletedAt?: v.number()` and filter with `q.eq(q.field("deletedAt"), undefined)`
- Slugify text consistently (normalize case, remove special chars, deduplicate separators)
- Always fetch and return full document after insert/update via `ctx.db.get(id)`

## Styling & Tailwind

- Use Tailwind v4 with `@import "tailwindcss"` in globals.css
- Define custom utilities in `@utility` blocks (e.g., `@utility container-app {}`)
- Use CVA (`class-variance-authority`) for component variants with `cva()` and `VariantProps`
- Organize classes: layout (flex, grid, size), spacing (p-, m-, gap-), colors (bg-, text-, border-)
- Dark mode: use `className="dark"` on html element; utility classes adapt automatically (`dark:bg-input/30`)
- Minimum touch target sizing: `min-h-[44px] min-w-[44px]` for buttons on mobile

## Hooks

- Use tuple destructuring return pattern: `[state, actions]` for compound hooks like `useFileUpload`
- Return readonly state tuple with `as const` assertion
- Clean up resources: revoke blob URLs with `URL.revokeObjectURL()`
- Use refs (`useRef`) for imperative DOM access (e.g., file input clearing)

## Error Handling

- Throw descriptive Error strings at boundaries (Convex mutations): `throw new Error("Unauthorized")`
- Return `null` for not-found queries, check explicitly: `if (business === null) return <ErrorComponent />`
- Use `undefined` to signal loading state: `if (business === undefined) return <Skeleton />`
- Client-side: use `toast.error()` for user feedback on mutations

## Component State

- Local state with `useState()` for UI state (modals, forms, toggles)
- Form state via react-hook-form with Zod resolver
- Server state via Convex `useQuery()` + `useMutation()`
- Loading states: distinguish `undefined` (loading) from `null` (not found) from value (ready)
- Conditional queries: pass `"skip"` to skip execution until data is available

## Testing

- Use Playwright for e2e tests in `apps/e2e/tests/` with descriptive test names
- Use Vitest + convex-test for Convex function tests in `packages/convex/convex/__tests__/`
- Test naming: describe feature, then specific behavior (e.g., `"getAllIndustries returns empty array initially"`)

## Accessibility

- Use semantic HTML (fieldset, legend, label elements in forms)
- ARIA attributes: `aria-haspopup="dialog"`, `aria-expanded`, `aria-hidden="true"` for decorative icons
- Min touch targets: 44px minimum

## Monorepo Tooling

- Package manager: Bun; build tool: Turbo with tasks defined in `turbo.json`
- TypeScript v5.x with shared configs from `@repo/typescript-config` (e.g., `tanstack.json`)
- ESLint flat config format with shared configs from `@repo/eslint-config`
- Env handling: use `.env*` files, expose only necessary vars via Vite/Turbo config

---

## Effect Style Guide (TypeScript Business Logic)

All business logic in TypeScript must be written using Effect following the patterns below.

### Core Principle

Use **`Effect.gen` for business logic** and **`.pipe()` for composition**.

### Use `Effect.gen` For

**Sequential business logic** — prefer when operations depend on previous results:

```ts
return Effect.gen(function* () {
  const user = yield* UserRepo.get(id)
  const account = yield* AccountRepo.get(user.accountId)
  return yield* BillingService.charge(account)
})
```

**Conditional logic** — prefer whenever branching is involved:

```ts
return Effect.gen(function* () {
  const user = yield* UserRepo.get(id)
  if (!user.isActive) {
    return yield* Effect.fail(new UserInactiveError())
  }
  return yield* UserService.process(user)
})
```

**Dependency retrieval** — retrieve services inside generators:

```ts
return Effect.gen(function* () {
  const userRepo = yield* UserRepo
  const billing = yield* BillingService
  // business logic
})
```

Avoid long chains of `Effect.map` / `Effect.flatMap` / `Effect.andThen` for imperative business workflows.

### Use `.pipe()` For

- **Layer composition**: `DatabaseLive.pipe(Layer.provide(LoggerLive), Layer.provide(ConfigLive))`
- **Error handling**: `effect.pipe(Effect.catchTag("DatabaseError", handleDatabaseError))`
- **Tracing**: `effect.pipe(Effect.withSpan("create-user"))`
- **Simple transforms**: `getUser(id).pipe(Effect.map(user => user.email))`

Do not introduce `Effect.gen` when a simple transform is sufficient.

### Combining Both Styles

Keep business logic inside `Effect.gen`; apply cross-cutting concerns outside with `.pipe()`:

```ts
Effect.gen(function* () {
  const user = yield* UserRepo.get(id)
  if (!user.isActive) {
    return yield* Effect.fail(new UserInactiveError())
  }
  return yield* UserService.process(user)
}).pipe(
  Effect.withSpan("process-user"),
  Effect.catchTags({ UserInactiveError: handleInactiveUser })
)
```

### Decision Matrix

| Concern                | Style         |
| ---------------------- | ------------- |
| Dependency retrieval   | `Effect.gen`  |
| Conditional logic      | `Effect.gen`  |
| Sequential operations  | `Effect.gen`  |
| Multi-step workflows   | `Effect.gen`  |
| Error handling         | `.pipe()`     |
| Tracing / logging      | `.pipe()`     |
| Metrics                | `.pipe()`     |
| Layer construction     | `.pipe()`     |
| Simple transformations | `.pipe()`     |

### Anti-Patterns

Avoid pipe chains for sequential logic — prefer `Effect.gen` over nested `flatMap`:

```ts
// Bad
getUser(id).pipe(
  Effect.flatMap(user => getAccount(user.accountId)),
  Effect.flatMap(account => charge(account))
)

// Good
Effect.gen(function* () {
  const user = yield* getUser(id)
  const account = yield* getAccount(user.accountId)
  return yield* charge(account)
})
```

Avoid `Effect.gen` for simple transforms — `pipe(Effect.map(...))` is sufficient.

---

## React Native / Expo

### File Structure

- App code lives in `app/` with subdirectories: `routes/`, `components/`, `hooks/`, `lib/`, `schemas/`
- Use Expo Router v4 file-based routing in `app/routes/`; files map to navigation routes automatically
- Shared UI components that work across native and web live in `@repo/ui` with NativeWind v4 (avoid web-only deps like `cmdk`, `sonner`, Radix UI)
- Platform-specific code: use `.native.ts` / `.web.ts` extensions for platform-specific implementations
- Assets in `app/assets/`; global theme config in `app/styles/` (NativeWind CSS)

### Navigation

- Use Expo Router v4 dynamic routing: `[id].tsx` for dynamic segments, `(...tabs)` for tab groups
- Navigation state managed via Expo Router's built-in stack; avoid nested navigation context providers
- Links: use `<Link href="...">` from `expo-router` with typed route paths
- Layouts: define in `_layout.tsx` with `<Tabs>` or `<Stack>` from `expo-router`

### Styling

- NativeWind v4 with Tailwind config in `tailwind.config.ts`; mirror web app Tailwind classes for consistency
- Custom CSS variables via `@apply` blocks; component variants via `cva()` (works on native via NativeWind)
- Dark mode: use `useColorScheme()` from `react-native` or `expo-system-ui`; apply `dark:` utility classes
- Minimum touch targets: `min-h-[48px] min-w-[48px]` (native needs larger targets than web's 44px)

### Data & Auth

- Data: Convex React Native client with `useQuery()` / `useMutation()` hooks
- Auth: Clerk Expo SDK (`@clerk/expo`) with `ClerkProvider` wrapping app; `useAuth()` / `useUser()` for auth state
- Session persistence: Clerk Expo handles token storage via Expo SecureStore automatically
- Environment variables: define in `app.json` under `extra`, access via `Constants.expoConfig?.extra` (not `process.env`)
- Conditional queries: pass `"skip"` when data unavailable

### Components

- Same functional component signature as web: `export const ComponentName = ({ prop }: Props) => { ... }`
- Use React Native primitives (`View`, `Text`, `FlatList`, `ScrollView`) instead of DOM elements
- No web-only components on native (avoid Radix UI, headless UI); use native alternatives
- Form state: react-hook-form + Zod (same as web; no platform differences in validation)

### Platform Differences

- Platform-specific logic: check via `Platform.OS === 'ios' | 'android' | 'web'` or use `.native.ts` extensions
- Safe area: wrap screen content in `<SafeAreaView>` from `react-native-safe-area-context`
- Keyboard handling: use `KeyboardAvoidingView` on iOS/Android; not needed on web
- Navigation header: Expo Router's `<Stack.Screen options={{ headerTitle: '...' }} />` (not layout files)
- Assets: use `require()` or static `import`; Expo bundles automatically (no `public/` folder)
