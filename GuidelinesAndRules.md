# 🏗 Engineering Guidelines & Git Workflow

This document defines the mandatory workflow and engineering standards for this project.

The repository follows a **three-branch model**:

* `main` → Major stable releases only
* `development` → Stable integration branch
* `feature/*` → Active development

---

# 1. Branch Strategy

## `main`

* Contains only major, stable milestones
* No direct pushes allowed
* Only updated via Pull Request from `development`
* Requires 2 approvals before merge
* Squash merge only

## `development`

* Stable integration branch
* All features merge here first
* Requires Pull Request
* Requires 1 approval before merge
* Squash merge only

## `feature/*`

* Created from `development`
* Used for single features or fixes
* Must be merged back into `development`
* Naming format:

```bash
feature/auth-system
feature/game-logic
fix/prisma-connection
refactor/user-service
```

---

# 2. Development Workflow

## Creating a Feature

```bash
git checkout development
git pull
git checkout -b feature/your-feature-name
```

After completion:

1. Push branch
2. Open PR → `development`
3. Get 1 approval
4. Resolve all review comments
5. Squash merge

---

## Creating a Major Release

When `development` is stable:

1. Open PR → `main`
2. Get 2 approvals
3. Resolve all discussions
4. Squash merge
5. Tag release:

```bash
git tag v1.0.0
git push --tags
```

---

# 3. Mandatory Pre-Merge Checklist (No CI Setup)

Since no CI is configured, every developer must manually ensure:

Before merging into `development` or `main`:

```bash
npm install
npm run lint
npm run build
docker compose up --build
```

Rules:

* No TypeScript errors
* No lint errors
* Application builds successfully
* Docker starts without crashes

If you do not verify this, you risk breaking the entire team environment.

---

# 4. Commit Standards

Use structured commit messages:

```bash
feat: add JWT authentication
fix: correct prisma schema error
refactor: simplify game state logic
chore: update dependencies
```

Rules:

* One logical change per commit
* No meaningless messages
* No unrelated changes in a single commit

Forbidden:

* `asdf`
* `fix stuff`
* `final`
* `update`

---

# 5. Clean Code Rules

## General

* Code must be readable.
* Prefer clarity over cleverness.
* Keep functions small.
* Avoid duplication.
* If you touch code, improve it.

---

## TypeScript Rules

* `"strict": true` must remain enabled
* No `any` unless justified
* Explicit return types for exported functions
* No implicit `any`
* No ignoring TypeScript errors

Forbidden:

```ts
let data: any
```

---

## Backend Rules (NestJS)

* Controllers handle HTTP only
* Services contain business logic
* No database calls inside controllers
* Always use Dependency Injection
* Never instantiate services manually

Forbidden:

```ts
const userService = new UserService()
```

---

## Prisma & Database Rules

* All schema changes require migrations
* Never manually modify production DB
* Use `prisma migrate dev` in development
* Never use `prisma db push` for releases

---

## Frontend Rules (Next.js / React)

* Keep components small
* Separate logic from UI
* Avoid large monolithic components
* Avoid unnecessary global state
* No complex logic directly inside JSX

---

## Tailwind Rules

* Utility-first approach only
* No inline CSS
* Reusable patterns must become components
* Avoid arbitrary random values without reason

---

# 6. Forbidden Actions

* Direct push to `main`
* Direct push to `development`
* Force push on protected branches
* Committing `.env`
* Committing `node_modules`
* Ignoring TypeScript errors
* Merging without review
* “Temporary” hacks without issue tracking

---

# 7. Definition of Done

A feature is complete when:

* Code compiles
* Lint passes
* Docker starts successfully
* No TypeScript errors
* PR approved
* All review comments resolved
* Migration created (if DB changed)

---

# 8. Team Standard

We are 4 developers learning and building together.

Therefore:

* Keep architecture understandable.
* Prefer simple solutions.
* Ask before adding dependencies.
* Document important decisions.
* Never break shared branches.

---

Stable branches are the responsibility of the entire team.
