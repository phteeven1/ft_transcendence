*This project has been created as part of the 42 curriculum by* `tsternbe`*,* `kmooney`*,* `smanthey`*,* `avarghes`*,* `sgavrilo`*.*

# Dicteé — ft_transcendence

Dicteé helps children practice vocabulary through multiplayer language games. Parents create **groups**, import or photograph **vocabulary lists**, invite other families by email, and start supervised **Play Now** sessions. Kids join a real-time **lobby** and play **Word Building** (collaborative crossword) and **Word Soup** (word search), synced over WebSockets.

Day-to-day development: [DEV.md](./DEV.md). Agent rules: [AGENTS.md](./AGENTS.md).

---

## Table of contents

- [Description](#description)
- [Instructions](#instructions)
- [Features](#features)
- [Modules (eval)](#modules-eval)
- [Eval demo](#eval-demo)
- [Technical stack](#technical-stack)
- [Database schema](#database-schema)
- [Team information](#team-information)
- [Project management](#project-management)
- [Individual contributions](#individual-contributions)
- [Resources and AI usage](#resources-and-ai-usage)
- [Known limitations](#known-limitations)
- [Legal and credits](#legal-and-credits)
- [Project structure](#project-structure)

---

## Description

Turn shared vocabulary homework into live, group-based word games that parents can supervise.

There are two kinds of account:

- **Parent (**`User`**)** — registers, creates or joins a group, manages children and vocabulary. Sign-in issues one `UserSession` token; a second login on another browser or tab replaces it and kicks the previous parent client.
- **Child (**`Player`**)** — a profile owned by a parent. Play Now issues a time-limited `PlayerSession` so the child can reach the lobby and games. A second Play Now for the same child replaces the token and kicks the previous device.

---

## Instructions

### Prerequisites

- Docker and Docker Compose
- Node.js 26 (matches CI; use `nvm use 26` if needed)
- npm
- Create `apps/backend/.env` (Compose requires this file even if some values are empty):

```
OPENAI_API_KEY=
MAIL_USER=your-gmail@example.com
MAIL_PASS=your-gmail-app-password
MAIL_FROM=your-gmail@example.com
```

Optional: repo-root `.env` for `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` (Compose defaults to `postgres` / `postgres` / `transcendence`). For Prisma CLI on the host (`npm run db:migrate`, `db:studio`), also set `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/transcendence` in `packages/database/.env`. The frontend does not need a `.env` — the browser calls `/api` on the current origin.

`OPENAI_API_KEY` is required for AI vocabulary import. Mail uses Gmail SMTP via `MAIL_*` (app password, not the account password). In Docker, invitation links use `https://<this-machine>` (`PUBLIC_HOST` from `scripts/docker-up.sh`); that overrides `APP_URL` in `apps/backend/.env`.

### Recommended: local dev (Postgres in Docker only)

```bash
npm run dev:local
```

`[scripts/dev-local.sh](./scripts/dev-local.sh)` installs dependencies if missing, starts PostgreSQL, runs Prisma migrations, then starts NestJS on [http://localhost:4000](http://localhost:4000) and Next.js on [http://localhost:3000](http://localhost:3000). The UI talks to `/api` on that origin (Next rewrites it to Nest). Sockets go to port 4000 on the same hostname. The script stops leftover `backend`, `frontend`, and `nginx` containers so they do not hold those ports.

Stop the Node apps with `Ctrl+C` (Postgres keeps running). Stop everything:

```bash
npm run dev:stop
```

### Full Docker stack (HTTPS)

```bash
npm run build          # rebuild images, then start (prints LAN URLs)
npm run dev            # start without rebuilding
npm run down           # stop the stack
```

`npm run build` / `npm run dev` run `[scripts/docker-up.sh](./scripts/docker-up.sh)` (not a TypeScript compile). That starts Nginx on ports 80/443, plus frontend, backend, and PostgreSQL. Nest and Next are not published on the host — only Nginx is. Postgres is bound to `127.0.0.1:5432`.

The script prints this computer's addresses, for example `https://localhost` and `https://192.168.0.152`. Any phone or laptop on the **same Wi-Fi** can open the LAN URL. Pick **one** address and use it on every device (`https://localhost` and `https://192.168.x.x` are different origins, so sessions do not carry over). A printed `https://<hostname>.local` address only works if that name already resolves on your network (nothing in this stack runs mDNS).

The first visit uses a self-signed certificate — accept the browser warning. A new cert is generated each time the Nginx container starts, so the warning can return after a restart. HTTP on port 80 redirects to HTTPS. Backend applies migrations on container start.

### Database commands (repo root)

```bash
npm run db:generate
npm run db:migrate          # create migration (dev)
npm run db:migrate:deploy   # apply migrations (CI / prod)
npm run db:studio           # Prisma Studio GUI
```

### CI

GitHub Actions (`.github/workflows/ci.yml`): database migrate → backend build and test → frontend lint and build.

---

## Features


| Feature                | Description                                     | Paths                                             |
| ---------------------- | ----------------------------------------------- | ------------------------------------------------- |
| Registration / sign-in | Parent accounts; bcrypt passwords; exclusive `UserSession` | `app/register`, `app/signin`, `users.service.ts` |
| Dashboard              | Group list, members, players, profile settings  | `app/dashboard`                                   |
| Groups                 | Create, join, leave, admin roles                | `app/dashboard`                                   |
| Email invitations      | Tokenized invite links, Gmail SMTP              | `app/accept_invitation`, `invitations.service.ts` |
| Players                | Child CRUD, Play Now                            | `app/dashboard` (Players tab), `players.service.ts` |
| Vocabulary             | Add/edit in one dialog; hidden starter fallback | `app/dashboard` (Vocabulary tab)                  |
| AI import              | GPT-4o on photos (`image_url`) and PDFs (file parts, not pdf-parse) | `extraction.service.ts`, `add-vocabulary.tsx` |
| Game lobby             | Pending/ongoing games, optional warm-up puzzles | `app/select_game`                                 |
| Word Building          | Multiplayer crossword, cell locks, scores       | `word_building/`, `word-building.service.ts`      |
| Word Soup              | Multiplayer word search                         | `word_soup/`, `word-soup.service.ts`              |
| Player sessions        | One active Play Now token per child; replace kicks the previous client | `PlayerSession` model, `players.service.ts` |
| Parent sessions        | One active token per parent; replace kicks the previous client         | `UserSession` model, `users.service.ts`     |
| Language picker        | en / de / fr via next-intl                      | `language-context.tsx`, `flag-menu.tsx`           |
| Legal                  | Privacy Policy and Terms of Service             | `app/privacy`, `app/terms`                        |


XP, avatars, and a lobby leaderboard live under `progression/` and are claimed as gamification plus game statistics (see Modules below).

**Exclusive sessions.** There is at most one live parent token (`UserSession`) and one live Play Now token (`PlayerSession`) at a time. Sign-in and Play Now **replace** the stored token and emit Socket.IO `session:replaced` so the previous tab or browser is kicked. Mutating parent REST calls send `x-user-id` and `x-user-session-token`; child game/lobby calls send `x-player-id` and `x-player-session-token` (`@/lib/api` attaches them). Play Now wipes parent credentials in **this browser** (`logout({ localOnly: true })`) so a child cannot open dashboard settings; the server `UserSession` stays, so a parent on another device is not kicked. Other same-browser parent tabs lose `localStorage` and are signed out. Leave session goes to `/session_over`. Changing the password rotates the parent token and returns the new one to that tab. `GET /players/:id/activeSession` is parent-guarded and returns `{ expiresAt }` only. Apply migration `20260819140000_add_user_session` (`npm run db:migrate` / `db:migrate:deploy`). Details: [DEV.md](./DEV.md#player-sessions-play-now).

---

## Modules (eval)

**Target: 14+ points** (Major = 2, Minor = 1). Claim only modules that demo without errors.


| Module                        | Type                  | Pts | What it is                             | Key files                                                    |
| ----------------------------- | --------------------- | --- | -------------------------------------- | ------------------------------------------------------------ |
| Frontend + backend frameworks | Major (Web)           | 2   | Next.js 16 + NestJS 11                 | `apps/frontend/`, `apps/backend/`                            |
| Real-time (WebSockets)        | Major (Web)           | 2   | Socket.IO lobby + in-game              | `games/game.gateway.ts`, `use-game-socket.ts`                |
| ORM                           | Minor (Web)           | 1   | Prisma 7 + PostgreSQL 16               | `packages/database/prisma/schema.prisma`                     |
| Custom design system          | Minor (Web)           | 1   | Claymorphism, 10 UI components         | `app/components/ui/`, `design-tokens.json`                   |
| i18n (3 languages)            | Minor (Accessibility) | 1   | next-intl, en / de / fr, flag switcher | `messages/{en,de,fr}.json`, `flag-menu.tsx`                  |
| Organization system           | Major (User)          | 2   | Groups, ADMIN/MEMBER, invitations      | `groups.service.ts`, `invitations.service.ts`                |
| Game statistics               | Minor (User)          | 1   | Wins, streaks, last 5 games, per type  | `progression-stats.service.ts`, `progression-my-stats.tsx`   |
| Image recognition             | Minor (AI)            | 1   | GPT-4o on photos and PDFs (file parts) | `extraction.service.ts`                                      |
| Complete web-based game       | Major (Gaming)        | 2   | Word Building crossword                | `word-building.service.ts`, `word-building-puzzle-engine.ts` |
| Remote players                | Major (Gaming)        | 2   | Live board sync over WebSockets        | `game.gateway.ts`, `use-game-socket.ts`                      |
| Multiplayer 3+                | Major (Gaming)        | 2   | Several `GamePlayer` rows per game     | `games.service.ts`, `select_game/page.tsx`                   |
| Add another game              | Major (Gaming)        | 2   | Word Soup + lobby join pending         | `word_soup/`, `word-soup.service.ts`, `select_game/page.tsx` |
| Gamification                  | Minor (Gaming)        | 1   | XP, avatar tiers, leaderboard          | `progression/`, lobby `ProgressionPanel`                     |


**Total: 20 points** (above the 14-point minimum; bonus cap 5).

```
Web:     Frameworks (2) + WebSockets (2) + ORM (1) + Design system (1) + i18n (1) = 7
User:    Organization (2) + Game statistics (1)                                  = 3
AI:      Image recognition (1)                                                   = 1
Gaming:  Game (2) + Remote (2) + Multiplayer 3+ (2) + Another game (2)
         + Gamification (1)                                                      = 9
                                                              Total = 20
```

Not claimed: SSR, LLM streaming UI, friends system, standard user management (no JWT, no online status). File upload exists in the product (vocab import) but is **not claimed** — import is not a file-management system. Game statistics history shows date, score, and win; it does not list opponent names.

---

## Eval demo

Walk these in order. Use Chrome with the console open — no red errors.

1. **Frameworks** — show `apps/frontend/` (Next.js App Router) and `apps/backend/src/app.module.ts` (Nest modules). Run `npm run dev:local`.
2. **Design system** — Dashboard panels, Chip tabs, `app/components/ui/index.ts`, tokens in `app/design-tokens.json`.
3. **i18n** — home in English, flag menu → Deutsch, then Français. Refresh; language stays. Legal pages (`/privacy`, `/terms`) switch too.
4. **Auth + groups** — register, create a group, Dashboard (members, promote). Send an invite email, open `/accept_invitation`.
5. **ORM** — `schema.prisma` and a service using Prisma (e.g. `groups.service.ts`). Optional: `npm run db:studio`.
6. **Image recognition** — Dashboard Vocabulary tab → Add vocabulary → PNG/JPEG or PDF (max 10 MB) → review ≥5 word pairs → save → set as active list.
7. **Players + Play Now** — create 3 child profiles, start Play Now (minutes). Child lands on Select Game.
8. **WebSockets + Word Building + remote** — two browsers, same group. Start Word Building. Place a letter in A; B updates without refresh. Show cell lock. Finish puzzle.
9. **Multiplayer 3+** — third player joins the same pending game (or force-start). Scoreboard shows three names on one grid.
10. **Add another game** — from the lobby, create a pending Word Soup. Second player joins that pending game, then start. Show live word-search sync.
11. **Gamification + statistics** — after a finished game, lobby `ProgressionPanel`: XP / avatar tier, leaderboard, wins and last games (date, score, win).

Talking points: server owns the crossword solution; Socket.IO rooms are `group:{id}` and `game:{id}`; Word Soup join-pending is the matchmaking demo; stats history does not list opponent names.

---

## Technical stack


| Layer       | Technology                                       | Role                                  |
| ----------- | ------------------------------------------------ | ------------------------------------- |
| Frontend    | Next.js 16, React 19, TypeScript, Tailwind CSS 4 | UI, App Router                        |
| Backend     | NestJS 11, TypeScript                            | REST API, WebSocket gateway           |
| Database    | PostgreSQL 16, Prisma 7                          | Persistence, migrations, typed client |
| Real-time   | Socket.IO                                        | Lobby, grid, scores, cell locks       |
| AI / import | OpenAI GPT-4o                                    | Vocabulary extraction                 |
| Mail        | Nodemailer + Gmail SMTP                          | Group invitations                     |
| Infra       | Docker Compose, Nginx, GitHub Actions            | HTTPS stack, local stack, and CI      |


Parent auth is a server `UserSession` token stored in `localStorage` (`parent-session.ts`), not JWT. Child Play Now uses `PlayerSession` in `sessionStorage`.

---

## Database schema

PostgreSQL via Prisma. Core models:

```
User ──┬── UserSession (one parent token; replaced on new sign-in)
       ├── GroupMembership ── Group ──┬── Player
       ├── Player                     ├── Vocabulary
       └── Vocabulary                 ├── Game ── GamePlayer
                                      ├── Invitation
                                      └── Crossword (Word Building)

Player ── PlayerSession (one Play Now token; replaced on a second start)
```

Full schema: `[packages/database/prisma/schema.prisma](./packages/database/prisma/schema.prisma)`.

---

## Team information

> **Update with 42 logins before evaluation.**


| Member     | Role(s)         | Responsibilities                           |
| ---------- | --------------- | ------------------------------------------ |
| `tsternbe` | Product Owner   | Vision, backlog, feature priorities        |
| `kmooney`  | Project Manager | Meetings, deadlines, coordination, games   |
| `smanthey` | Technical Lead  | Architecture, code review, stack decisions |
| `avarghes` | Developer       | Games                                      |
| `sgavrilo` | Developer       | Vocab-Import, Design System                |


*Contributors in git history: Sergej Gavrilov, Steven Manthey, Kevin Mooney, Alvin Abraham Varghese, tsternbe, phteeven1.*

---

## Project management

- **Workflow:** Git feature branches → pull requests → `development` / `main` (see [AGENTS.md](./AGENTS.md))
- **Task tracking:** GitHub Issues / team board
- **Communication:** Discord / WhatsApp
- **Code review:** Peer review on important PRs
- **CI:** Automated build, lint, and test on push/PR

---

## Individual contributions

> **Each member must fill in their section before evaluation.**

### `tsternbe` (Tobias Sternberg)

- Features: overall product design. User management system. Basic frontend structure. Setting up website navigation and frontend directory structure. Admins/Users/players. Invite, Game lobby, mini games for game lobby. Language and sign in buttons.
- Modules: Organization system, Frontend/Backend (partly), setup for games (websockets, multiplayer, remote players, session tokens)
- Challenges overcome: learning to work with entirely new technical stack. Communicating and handing over. Keeping overall vision and still contributing specific code.

### `kmooney` (Kevin Mooney)

- Features:
- Modules:
- Challenges overcome:

### `smanthey` (Steven Manthey)

- Features: technical leadership and stack decisions (Next.js, NestJS, Prisma, PostgreSQL, Docker). Monorepo layout, local/CI scripts, and coding guidelines. PostgreSQL/Prisma integration and general work on the backend (services, wiring, reviews). Docker Compose stack with Nginx reverse proxy and HTTPS so frontend, API, and WebSockets share one secure host.
- Modules: 
- Challenges overcome: choosing and orchestrating a stack the team had not used together. Keeping reviews and PRs moving while still writing backend and infra. Putting HTTPS, REST, and Socket.IO behind one reverse proxy without breaking local `npm run dev:local`.

### `avarghes` (Alvin Abraham Varghese)

- Features: Multiplayer crossword game (Word Building) — drag-and-drop or keyboard tile placement, per-cell scoring, live scoreboard.
- Modules: Puzzle generator and game service (backend), Word Building game UI (frontend), `Crossword` DB model.
- Challenges overcome: Generating well-formed crosswords from random vocab lists; handling concurrent players editing the same puzzle in real time.

### `sgavrilo` (Sergej Gavrilov)

- Features:
- Modules:
- Challenges overcome:

---

## Resources and AI usage

- [Next.js](https://nextjs.org/docs), [NestJS](https://docs.nestjs.com), [Prisma](https://www.prisma.io/docs), [Socket.IO](https://socket.io/docs/v4/)
- [OpenAI API](https://platform.openai.com/docs)


| Task                                   | Tool                    | Where                                   |
| -------------------------------------- | ----------------------- | --------------------------------------- |
| Vocabulary extraction from photos/PDFs | OpenAI GPT-4o           | `extraction.service.ts` (images as `image_url`, PDFs as file parts) |
| Development assistance                 | Cursor / Copilot        | Review, debugging, documentation drafts |
| Puzzle / game logic design             | Team + AI brainstorming | Word Building engine                    |


All AI-generated code was reviewed, tested, and understood by the team before merge.

---

## Known limitations

1. **Parent session is token-based, not JWT** — sign-in returns `{ user, session }`. The token is stored in `localStorage` (`dicteeUserSessionToken`) and sent on mutating parent requests. A second sign-in replaces the token and kicks the previous client. Fine for a local/school demo.
2. **Tab-close vs refresh** — child tokens live in `sessionStorage` (cleared on tab close). Closing the tab schedules `POST /players/clearSession` with that token after a 2s grace window via a `localStorage` pending flag; a refresh cancels that pending end. A parent can still force-clear from the Play Now dialog. A stale pending end cannot delete a newer Play Now token. Do not sendBeacon on `pagehide`: that event also fires on refresh.
3. **Friends system** — not implemented; groups are the social unit.
4. Chrome **console errors** during the demo fail the eval — check before staff arrive.
5. **Self-signed TLS** — phones and laptops on the LAN must accept the certificate warning. Use the same printed URL on every device.

---

## Legal and credits

- Privacy Policy: `/privacy`
- Terms of Service: `/terms`
- Flag icons: [flagicons.lipis.dev](https://flagicons.lipis.dev/), MIT license

---

## Project structure

```
ft_transcendence/
├── apps/
│   ├── frontend/          # Next.js app
│   └── backend/           # NestJS API + WebSockets
├── packages/
│   └── database/          # Prisma schema and migrations
├── scripts/
│   ├── docker-up.sh       # HTTPS stack + LAN URLs
│   ├── dev-local.sh
│   └── dev-stop.sh
├── nginx/                 # Reverse proxy + self-signed TLS
├── docker-compose.yml
└── .github/workflows/ci.yml
```

