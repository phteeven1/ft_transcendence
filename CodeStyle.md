# Code Style & Naming Guidelines

This document defines mandatory naming conventions, structural rules, and architectural best practices for the project.

---

# 1. Naming Conventions

Consistency is mandatory. Mixed naming styles are not allowed.

## 1.1 General Naming Rules

* Code must be written in English.
* Names must describe intent, not implementation details.
* Avoid unnecessary abbreviations.
* No single-letter variables except small loop counters (`i`, `j`).
* Do not encode types into variable names (`userObj`, `userStr` → forbidden).

Bad:

```ts
const d = getData()
const usr = new UserService()
```

Good:

```ts
const userProfile = getUserProfile()
const userService = new UserService()
```

---

## 1.2 Casing Rules

### Variables & Functions

→ camelCase

```ts
const userName = "Name"
function calculateScore() {}
```

### Classes

→ PascalCase

```ts
class UserService {}
class GameController {}
```

### Interfaces

→ PascalCase (with "I" prefix)

```ts
interface ICreateUserDto {}
```

### Types

→ PascalCase

```ts
type GameState = "WAITING" | "RUNNING"
```

### Enums

* Enum name → PascalCase
* Enum values → UPPER_SNAKE_CASE

```ts
enum UserRole {
  ADMIN = "ADMIN",
  STANDARD_USER = "STANDARD_USER"
}
```

### Constants

→ UPPER_SNAKE_CASE

```ts
const MAX_RETRY_COUNT = 3
const DEFAULT_TIMEOUT_MS = 5000
```

### File Names

→ kebab-case

Examples:

```
user.service.ts
auth.controller.ts
game-state.util.ts
jwt.guard.ts
```

---

# 2. Function & Method Structure

## 2.1 Core Rules

* One function → one responsibility.
* Prefer early returns.
* Avoid nesting deeper than 3 levels.
* Functions should generally stay under 30 lines.
* Extract complex logic into private helper functions.

Bad:

```ts
function process(user: User) {
  if (user) {
    if (user.active) {
      // logic
    }
  }
}
```

Good:

```ts
function process(user: User) {
  if (!user) return
  if (!user.active) return

  // logic
}
```

---

## 2.2 Parameter Rules

* Maximum ~3–4 parameters.
* If more → use a DTO or configuration object.
* Avoid boolean flag parameters (`createUser(true, false)`).

Bad:

```ts
createUser(true, false)
```

Good:

```ts
createUser({ isAdmin: true, sendEmail: false })
```

---

# 3. Readability Best Practices

## 3.1 Formatting

* Always use Prettier.
* One blank line between logical blocks.
* No large vertical code walls.
* No commented-out dead code.

## 3.2 Boolean Naming

Boolean variables must read like questions:

```ts
const isAuthenticated = true
const hasPermission = false
const shouldRetry = true
```

Not:

```ts
const auth = true
```

---

## 3.3 Avoid Magic Values

Never hardcode unexplained numbers or strings.

Bad:

```ts
if (retryCount > 3) {}
```

Good:

```ts
const MAX_RETRY_COUNT = 3

if (retryCount > MAX_RETRY_COUNT) {}
```

---

## 3.4 Error Handling

* Never swallow errors silently.
* Always log meaningful context.
* Never expose internal stack traces to clients.
* Wrap infrastructure errors into domain errors where appropriate.

---

# 4. Dependency Injection (Mandatory for Services)

## 4.1 Do NOT Instantiate Services Manually

This is forbidden:

```ts
const userService = new UserService()
```

Reason:

* Breaks inversion of control
* Makes testing difficult
* Couples implementation tightly
* Prevents mocking
* Reduces flexibility

---

## 4.2 Always Use Dependency Injection

Services must be injected via constructor.

Example (NestJS):

```ts
@Injectable()
export class UserController {
  constructor(private readonly userService: UserService) {}
}
```

Benefits:

* Loose coupling
* Easier testing (mock providers)
* Better scalability
* Cleaner architecture
* Centralized lifecycle management

---

## 4.3 General Rule

If a class depends on another class:

→ It must receive it via constructor injection.
→ It must not create it itself.

This ensures long-term flexibility and maintainability.

---

# 5. Folder & Module Structure Principles

* Prefer grouping by feature when practical.
* Keep related logic close together.
* Avoid giant `utils/` folders.
* Avoid circular dependencies.
* Split modules when responsibility grows too large.

Example:

```
user/
  user.controller.ts
  user.service.ts
  user.module.ts
  user.repository.ts
```

---

# 6. Code Quality Expectations

Every developer must:

* Write code that another teammate understands immediately.
* Refactor unclear code when touching it.
* Avoid clever one-liners.
* Remove duplication proactively.
* Keep architecture simple and consistent.

Code is written for humans first, machines second.
