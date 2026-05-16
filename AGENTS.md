# AGENTS.md

## Keeping This File Updated

Update this file whenever code structure changes or new rules are imposed by the user. An agent should consult AGENTS.md first before making assumptions about the codebase.

## Dev Commands

```bash
bun run lint          # ESLint check
bun run lint:fix      # Auto-fix linting
bun run build         # Build to dist/
bun run start:dev     # Watch mode (dev server)
bun run start:prod    # Production (from dist/)
bun run test          # Jest unit tests
bun run test:e2e      # Jest e2e tests
bun run migration:generate   # Generate pending migrations
bun run migration:run        # Apply migrations to DB
bun run seed                  # Seed database with test data
```

## Setup

1. Copy `.env.example` to `.env` and fill in values
2. `docker-compose up` (starts MySQL 8.0 on port from `.env`)
3. `bun install`
4. `bun run migration:generate` then `bun run migration:run`
5. `bun run start:dev`

## Path Aliases

| Alias | Resolves to |
|-------|-------------|
| `@utils` | `src/utils` |
| `@errors` | `src/errors` |
| `@db` | `src/db` |
| `@modules/*` | `src/modules/*` |
| `@providers/*` | `src/providers/*` |

## Module Structure

Each feature module follows this pattern:
```
src/modules/<feature>/
  ├── <feature>.module.ts
  ├── <feature>.service.ts
  ├── dto/
  │   └── index.ts
  ├── errors/
  │   └── index.ts        # (optional)
  └── index.ts
```

## Entity Pattern

1. Create entity in `src/db/entities/<name>.entity.ts`
2. Export from `src/db/entities/index.ts`
3. Re-run `bun run migration:generate` then `bun run migration:run`

## Error Handling

Errors extend `ApiError` (from `@errors`) and are caught by the global exception filter:
```ts
export class MyError extends ApiError<MyData> {
  constructor(data: MyData) {
    super({ code: 'my_err', message: 'My error', detail: data })
  }
}
```

## API Response Format

Return `ApiResponseDto` for standardized responses:
```ts
return new ApiResponseDto(data, pagination, message)
```

## Database

- TypeORM with MySQL 8.0
- Use `nestjs-cls` for request-scoped transactions
- Entity files use decorators (`@Entity`, `@Column`, etc.)
- Ban-pick special-cost inputs live on `match_state` as `blueSpecialCost` and `redSpecialCost`, and session-cost recalculation reads those values when computing time bonus.
- BO3/BO5 session completion should leave the match in `WAITING`; the host chooses the next session blue participant through `continue-session`, and match-side carry-over must remap from the just-finished session at that point instead of auto-swapping on completion.