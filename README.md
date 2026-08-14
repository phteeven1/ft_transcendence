*This project has been created as part of the 42 curriculum by `<login1>`, `<login2>`, `<login3>`, `<login4>`.*

# Dicteé — ft_transcendence

Dicteé is a web application that helps children practice vocabulary through multiplayer language games. Parents create **groups**, import or photograph **vocabulary lists**, invite other families by email, and start supervised **Play Now** sessions for their children. Kids join a real-time **game lobby**, complete optional warm-up puzzles, and play **Word Building** — a collaborative crossword synced over WebSockets.

---

## Table of contents

- [Description](#description)
- [Instructions](#instructions)
- [Features](#features)
- [Modules (eval)](#modules-eval)
- [Technical stack](#technical-stack)
- [Database schema](#database-schema)
- [Team information](#team-information)
- [Project management](#project-management)
- [Individual contributions](#individual-contributions)
- [Resources & AI usage](#resources--ai-usage)
- [Documentation index](#documentation-index)
- [Known limitations](#known-limitations)

---

## Description

### Goal

Make language homework engaging by turning shared vocabulary lists into live, group-based word games that parents can supervise.

### Key features (implemented)

| Area | Feature |
|------|---------|
| **Auth** | Parent registration, sign-in, profile settings |
| **Groups** | Create/join/leave, admin roles, email invitations |
| **Chat** | Group messaging + automatic activity log with filters |
| **Players** | Parent-managed child profiles, passphrase, Play Now sessions |
| **Vocabulary** | CRUD, set active list for games, **AI import** (photo OCR + PDF) |
| **Lobby** | Real-time game list, pre-game puzzles (Scramble, Means-What) |
| **Word Building** | Multiplayer crossword, WebSockets, scores, cell locking, drag-and-drop tiles |
| **Design** | Claymorphism UI, 14 reusable components, design tokens | `components/ui/`, [design-system.md](./docs/modules/design-system.md) |
| **i18n** | English, German, French via next-intl + flag switcher | [i18n.md](./docs/modules/i18n.md) |
| **Health** | `GET /health` API + `/status` dashboard | [health-check.md](./docs/modules/health-check.md) |
| **DevOps** | Docker Compose, GitHub Actions CI, local dev script |

See [PRODUCT_DESCRIPTION.md](./PRODUCT_DESCRIPTION.md) for the full product vision and [EVAL_MODULES.md](./EVAL_MODULES.md) for eval planning notes.

---

## Instructions

### Prerequisites

- **Docker** & **Docker Compose**
- **Node.js 22** (matches CI; use `nvm use 22` if needed)
- **npm**
- Copy environment files from [.env.example](./.env.example):
  - `packages/database/.env` — `DATABASE_URL`
  - `apps/backend/.env` — database, `JWT_SECRET`, `OPENAI_API_KEY`, `MAIL_*`, `APP_URL`
  - `apps/frontend/.env` — `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_URL`

### Recommended: local dev (Postgres in Docker only)

```bash
npm run dev:local
```

This script ([`scripts/dev-local.sh`](./scripts/dev-local.sh)):

1. Installs npm dependencies if missing (`packages/database`, `apps/backend`, `apps/frontend`)
2. Starts **PostgreSQL** in Docker
3. Runs Prisma migrations
4. Starts **NestJS** on [http://localhost:4000](http://localhost:4000)
5. Starts **Next.js** on [http://localhost:3000](http://localhost:3000)

Stop Node apps with `Ctrl+C` (Postgres keeps running). Stop everything:

```bash
npm run dev:stop
```

### Full Docker stack

```bash
docker compose up --build
```

Runs frontend, backend, PostgreSQL, and Redis. Backend runs migrations on container start.

### Database commands (repo root)

```bash
npm run db:generate
npm run db:migrate          # create migration (dev)
npm run db:migrate:deploy   # apply migrations (CI / prod)
npm run db:studio           # Prisma Studio GUI
```

### CI

GitHub Actions (`.github/workflows/ci.yml`): database migrate → backend build & test → frontend lint & build.

---

## Features

| Feature | Description | Main paths |
|---------|-------------|------------|
| Registration / sign-in | Parent accounts with email | `app/register`, `app/signin` |
| Dashboard | Group list, settings | `app/dashboard` |
| Create / manage group | Members, chat, admin tools | `app/create_group`, `app/manage_group` |
| Email invitations | Tokenized invite links + Gmail SMTP | `app/accept_invitation`, `invitations.service.ts` |
| Group chat | Messages + event log, visibility filters | `chat.service.ts`, `group-chat.tsx` |
| Manage players | CRUD, Play Now, session tokens | `app/manage_players`, `players.service.ts` |
| Manage vocabulary | CRUD, set active list | `app/manage_vocabulary` |
| AI vocabulary import | OCR (images) + PDF extract + GPT-4o | [docs/modules/image-recognition.md](./docs/modules/image-recognition.md) |
| Game lobby | Pending/ongoing games, puzzles | `app/select_game` |
| Word Building | Real-time crossword multiplayer | [gaming-word-building.md](./docs/modules/gaming-word-building.md) |
| Player sessions | Time-limited Play Now tokens | `PlayerSession` model, `PLAYER_SESSION_TOKENS.md` |
| Language picker | en / de / fr flag menu (UI strings not fully translated) | `language-context.tsx`, `flag-menu.tsx` |
| Legal pages | Privacy Policy and Terms of Service (site footer links) | `app/privacy`, `app/terms`, `site-footer.tsx` |

**In progress / stub:** Word Soup scaffold, Correction puzzle, legacy counter demo in backend.

---

## Modules (eval)

**Target: 14+ points** (Major = 2 pts, Minor = 1 pt). Only fully working modules should be claimed at evaluation.

### Implemented modules (eval-ready)

| Module | Type | Pts | Implementation | Details |
|--------|------|-----|----------------|---------|
| Use frontend + backend frameworks | Major (Web) | 2 | Next.js 16 + NestJS 11 | [web-frameworks.md](./docs/modules/web-frameworks.md) |
| Real-time features (WebSockets) | Major (Web) | 2 | Socket.IO gateway, game + group hooks | [websockets-realtime.md](./docs/modules/websockets-realtime.md) |
| ORM | Minor (Web) | 1 | Prisma 7 + PostgreSQL | [orm-prisma.md](./docs/modules/orm-prisma.md) |
| File upload | Minor (Web) | 1 | Multer, type/size validation, vocab import | [file-upload.md](./docs/modules/file-upload.md) |
| Custom design system | Minor (Web) | 1 | Claymorphism, 14 UI components, tokens | [design-system.md](./docs/modules/design-system.md) |
| i18n (3 languages) | Minor (Accessibility) | 1 | next-intl, en/de/fr, flag switcher | [i18n.md](./docs/modules/i18n.md) |
| Health check | Minor (Devops) | 1 | `GET /health`, `/status` page, DB probe | [health-check.md](./docs/modules/health-check.md) |
| Organization system | Major (User) | 2 | Groups, roles, invitations | [groups-and-chat.md](./docs/modules/groups-and-chat.md) |
| Image recognition | Minor (AI) | 1 | Tesseract OCR + GPT-4o structuring | [image-recognition.md](./docs/modules/image-recognition.md) |
| Complete web-based game | Major (Gaming) | 2 | Word Building crossword | [gaming-word-building.md](./docs/modules/gaming-word-building.md) |
| Remote players | Major (Gaming) | 2 | Live sync over WebSockets | [gaming-remote-players.md](./docs/modules/gaming-remote-players.md) |
| Multiplayer 3+ | Major (Gaming) | 2 | Multiple `GamePlayer` records per game | [gaming-multiplayer-3-plus.md](./docs/modules/gaming-multiplayer-3-plus.md) |

**Total: 18 points** (above the 14-point minimum)

### Close / not yet claimed

| Module | Pts | Status |
|--------|-----|--------|
| SSR | 1 | Next.js App Router; most pages are client components |
| LLM interface | 2 | GPT-4o extraction works; no streaming/rate-limit UI yet |
| Gamification | 1 | Live scores only; no badges/XP/leaderboard |
| User interaction (chat + profile + **friends**) | 2 | Chat + profiles yes; **no friends system** |
| Standard user management | 2 | Missing avatars, friends, online status; passwords not hashed |

### Point calculation

```
Web:     Frameworks (2) + WebSockets (2) + ORM (1) + File upload (1) + Design system (1)
         + i18n (1) = 8
User:    Organization / groups (2)                                       = 2
AI:      Image recognition (1)                                           = 1
Gaming:  Game (2) + Remote (2) + Multiplayer 3+ (2)                     = 6
Devops:  Health check (1)                                                = 1
                                                              Total = 18
```

---

## Technical stack

| Layer | Technology | Why |
|-------|------------|-----|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4 | App Router, SSR capability, typed UI |
| Backend | NestJS 11, TypeScript | Modular API, WebSocket support |
| Database | PostgreSQL 16, Prisma 7 | Relational data, migrations, type-safe client |
| Real-time | Socket.IO | Game state, lobby updates, cell locks |
| AI / OCR | OpenAI GPT-4o, Tesseract.js | Vocabulary extraction from photos and PDFs |
| Mail | Nodemailer + Gmail SMTP | Group invitation emails |
| Infra | Docker Compose, GitHub Actions | Single-command deploy, CI |

More detail: [TECHSTACK.md](./TECHSTACK.md), [BUILDING_THE_APP.md](./BUILDING_THE_APP.md).

---

## Database schema

PostgreSQL via Prisma. Core models:

```
User ──┬── GroupMembership ── Group ──┬── Player
       │                              ├── Vocabulary
       ├── Player                     ├── Game ── GamePlayer
       └── Vocabulary                 ├── Invitation
                                        └── GroupChatEntry

Player ── PlayerSession (Play Now token)
```

Full schema: [`packages/database/prisma/schema.prisma`](./packages/database/prisma/schema.prisma)  
Setup guide: [DATABASE_SETUP.md](./DATABASE_SETUP.md)

---

## Team information

> **Update with 42 logins before evaluation.**

| Member | Role(s) | Responsibilities |
|--------|---------|------------------|
| `<tsternbe>` | Product Owner | Vision, backlog, feature priorities |
| `<kmooney>` | Project Manager | Meetings, deadlines, coordination |
| `<smanthey>` | Technical Lead | Architecture, code review, stack decisions |
| `<avarghes>` | Developer | Backend, database, API |
| `<sgavrilo>` | Developer | Frontend, games, UI |

*Contributors in git history: Sergej Gavrilov, Steven Manthey, Kevin Mooney, Alvin Abraham Varghese, tsternbe, phteeven1.*

---

## Project management

- **Workflow:** Git feature branches → pull requests → `development` / `main`
- **Task tracking:** GitHub Issues / team board *(update with your tool)*
- **Communication:** Discord / WhatsApp *(update)*
- **Code review:** Peer review on important PRs
- **CI:** Automated build, lint, and test on push/PR

---

## Individual contributions

> **Each member must fill in their section before evaluation.**

### `<login1>`

- Features:
- Modules:
- Challenges overcome:

### `<login2>`

- Features:
- Modules:
- Challenges overcome:

*(Add one subsection per team member.)*

---

## Resources & AI usage

### References

- [Next.js documentation](https://nextjs.org/docs)
- [NestJS documentation](https://docs.nestjs.com)
- [Prisma documentation](https://www.prisma.io/docs)
- [Socket.IO documentation](https://socket.io/docs/v4/)
- [OpenAI API](https://platform.openai.com/docs)
- [Tesseract.js](https://tesseract.projectnaptha.com/)
- [42 ft_transcendence subject](./docs/) *(subject PDF in team drive)*

### How AI was used

| Task | Tool | Where |
|------|------|-------|
| Vocabulary extraction from text/OCR | OpenAI GPT-4o | `extraction.service.ts` |
| OCR on uploaded photos | Tesseract.js | `extraction.service.ts` |
| Development assistance | Cursor / Copilot | Code review, debugging, documentation drafts |
| Puzzle / game logic design | Team + AI brainstorming | Word Building engine |

All AI-generated code was reviewed, tested, and understood by the team before merge.

---

## Documentation index

| Document | Purpose |
|----------|---------|
| [README.md](./README.md) | Eval entry point (this file) |
| [EVAL_MODULES.md](./EVAL_MODULES.md) | Module planning & demo scripts |
| [PRODUCT_DESCRIPTION.md](./PRODUCT_DESCRIPTION.md) | Product vision & user flows |
| [BUILDING_THE_APP.md](./BUILDING_THE_APP.md) | Frontend/backend architecture |
| [DATABASE_SETUP.md](./DATABASE_SETUP.md) | Database & migrations |
| [PLAYER_SESSION_TOKENS.md](./PLAYER_SESSION_TOKENS.md) | Play Now session design |
| [MAKE_GAME_USING_SCAFFOLD.md](./MAKE_GAME_USING_SCAFFOLD.md) | Adding new games |
| [design-system/dicteé/MASTER.md](./design-system/dicteé/MASTER.md) | Design tokens & Clay UI |
| [docs/modules/](./docs/modules/) | Per-module eval deep dives |

---

## Known limitations

These items are **not yet production-ready** and may block parts of the eval if not fixed:

1. **No JWT auth guards** on API routes — parent auth is client-side context
2. **Friends system** — not implemented (groups used instead)
3. **Redis** — in Docker Compose but not used by application logic yet

---

## Project structure

```
ft_transcendence/
├── apps/
│   ├── frontend/          # Next.js app
│   └── backend/           # NestJS API + WebSockets
├── packages/
│   └── database/          # Prisma schema & migrations
├── scripts/
│   ├── dev-local.sh       # Postgres in Docker + local Nest/Next
│   └── dev-stop.sh        # Stop dev environment
├── docs/modules/          # Eval module documentation
├── design-system/         # Claymorphism tokens
├── docker-compose.yml
└── .github/workflows/ci.yml
```
