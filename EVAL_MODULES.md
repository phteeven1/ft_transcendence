# Dicteé — Eval modules summary (WhatsApp)

*42 ft_transcendence · need **14 points** to pass (Major = 2 pts, Minor = 1 pt)*

---

## ✅ What we already have (strong)

| Module | Pts |
|--------|-----|
| Web Major — Next.js + NestJS frameworks | 2 |
| Web Major — WebSockets (real-time games + lobby) | 2 |
| Web Minor — ORM (Prisma + PostgreSQL) | 1 |
| Web Minor — File upload (vocab import: images/PDF/text) | 1 |
| Gaming Major — Word Building game (full gameplay) | 2 |
| Gaming Major — Remote players (WebSockets) | 2 |
| Gaming Major — Multiplayer 3+ players | 2 |

**Subtotal: ~12 points** — solid base if we demo it well.

---

## 🟡 Close — small polish needed

| Module | Pts | What's missing |
|--------|-----|----------------|
| User Major — Organization system | 2 | Groups already do this — need README + eval demo |
| Web Minor — Custom design system | 1 | Clay UI exists — document 10+ components + tokens |
| Web Minor — SSR | 1 | Next.js supports it — show/explain usage |
| AI Minor — Image recognition | 1 | OCR on vocab photos already works — document it |
| AI Major — LLM interface | 2 | OpenAI extraction works — needs streaming + rate limits |
| Gaming Minor — Gamification | 1 | Scores exist — need 3 of: badges, XP, leaderboard, etc. |
| Devops Minor — Health check | 1 | Add `GET /health` + simple status page |

**+2 to +4 points possible** with relatively little new code.

---

## ❌ Not ready / not started

- **Friends system** (blocks Web Major “user interaction”)
- **i18n** — flag switcher only, UI not translated (blocks 3-language minor)
- **Public API** — no API key, rate limit, or Swagger docs
- OAuth, 2FA, avatars, tournaments, spectator mode, AI opponent, RAG
- ELK, Prometheus, microservices, blockchain, WAF/Vault

---

## 🚨 Mandatory blockers (can fail whole project)

1. **Privacy Policy + Terms of Service** pages (footer links, real content)
2. **Password hashing** — passwords still plain text today
3. **No console errors** in Chrome during eval
4. **README** — team roles, module list, point calculation, who did what

---

## 🎯 Fastest path to 14+ points

```
Already strong:                    12 pts

Add next:
  + Organization system (groups)    2 pts  ← mostly done
  + Health check endpoint           1 pt   ← quick win
  + Image recognition (OCR)         1 pt   ← already built

Fix blockers:
  Privacy/Terms + password hashing + README
```

**Target: ~16 points** if evaluators accept the above.

---

## 📋 Suggested next tasks (priority order)

1. Privacy + Terms pages
2. Password hashing (bcrypt)
3. README modules section (points + justifications)
4. `/health` endpoint
5. Document groups as “organization system” for eval
6. Wire i18n into UI OR add gamification (pick one for +1 pt)

---

## 💬 One-liner for the group

> We’re at **~12 eval points** with Word Building + WebSockets + upload + Prisma. Add **groups-as-orgs**, **health check**, and **legal pages + password hashing**, and we’re safely at **14+**. Friends + full i18n are the next bigger modules if we want more buffer.

---

*Last updated: March 2026 · branch `feature/upload-file`*
