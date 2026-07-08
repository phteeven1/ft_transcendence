# Dicteé — Eval modules summary (WhatsApp)

*42 ft_transcendence · need **14 points** to pass (Major = 2 pts, Minor = 1 pt)*

> **Official eval documentation:** see [README.md](./README.md) (Modules, Features, Instructions) and [docs/modules/](./docs/modules/) for deep dives.

---

## ✅ Implemented modules (eval-ready)

| Module | Pts | Doc |
|--------|-----|-----|
| Web Major — Next.js + NestJS frameworks | 2 | [web-frameworks.md](./docs/modules/web-frameworks.md) |
| Web Major — WebSockets (real-time games + lobby) | 2 | [websockets-realtime.md](./docs/modules/websockets-realtime.md) |
| Web Minor — ORM (Prisma + PostgreSQL) | 1 | [orm-prisma.md](./docs/modules/orm-prisma.md) |
| Web Minor — File upload (vocab import) | 1 | [file-upload.md](./docs/modules/file-upload.md) |
| Web Minor — Custom design system | 1 | [design-system.md](./docs/modules/design-system.md) |
| User Major — Organization system (groups) | 2 | [groups-and-chat.md](./docs/modules/groups-and-chat.md) |
| AI Minor — Image recognition (OCR) | 1 | [image-recognition.md](./docs/modules/image-recognition.md) |
| Gaming Major — Word Building game | 2 | [gaming-word-building.md](./docs/modules/gaming-word-building.md) |
| Gaming Major — Remote players | 2 | [gaming-remote-players.md](./docs/modules/gaming-remote-players.md) |
| Gaming Major — Multiplayer 3+ players | 2 | [gaming-multiplayer-3-plus.md](./docs/modules/gaming-multiplayer-3-plus.md) |

**Total: 16 points** — above the 14-point minimum. Full index: [docs/modules/README.md](./docs/modules/README.md)

---

## 🟡 Close — polish for extra points or stronger eval

| Module | Pts | What's missing |
|--------|-----|----------------|
| Web Minor — SSR | 1 | Next.js supports it — show/explain usage |
| AI Major — LLM interface | 2 | OpenAI extraction works — needs streaming + rate limits |
| Gaming Minor — Gamification | 1 | Scores exist — need 3 of: badges, XP, leaderboard, etc. |
| Devops Minor — Health check | 1 | Add `GET /health` + simple status page |

---

## ❌ Not ready / not started

- **Friends system** (blocks Web Major “user interaction”)
- **i18n** — flag switcher only, UI not translated (blocks 3-language minor)
- **Public API** — no API key, rate limit, or Swagger docs
- OAuth, 2FA, avatars, tournaments, spectator mode, AI opponent, RAG
- ELK, Prometheus, microservices, blockchain, WAF/Vault

---

## 🚨 Mandatory blockers (can fail whole project)

1. ~~**Privacy Policy + Terms of Service** pages (footer links, real content)~~ — done (`/privacy`, `/terms`)
2. **Password hashing** — passwords still plain text today
3. **No console errors** in Chrome during eval
4. **README** — team roles, module list, point calculation, who did what

---

## 🎯 Path to eval

```
Implemented modules:               16 pts  ✓ (above 14 minimum)

Optional extras:
  + Health check                   1 pt
  + Design system / SSR / etc.

Fix blockers before eval:
  password hashing + team README contributions
```

---

## 📋 Suggested next tasks (priority order)

1. Password hashing (bcrypt)
2. ~~Privacy + Terms pages~~ — done at `/privacy` and `/terms`
3. ~~README modules section~~ — done in [README.md](./README.md)
4. `/health` endpoint
5. Wire i18n into UI OR add gamification (pick one for +1 pt)

---

## 📷 Module deep dives

OCR / image recognition: [docs/modules/image-recognition.md](./docs/modules/image-recognition.md)  
Groups / organization system: [docs/modules/groups-and-chat.md](./docs/modules/groups-and-chat.md)

---

## 💬 One-liner for the group

> We’re at **16 eval points** (frameworks, WebSockets, ORM, upload, design system, groups, OCR, Word Building ×3). Fix **password hashing**, then polish demos.

---

*Last updated: March 2026 · branch `feature/upload-file`*
