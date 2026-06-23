tsternbe: To enable sending email invites from our app, I set up the following:

@nestjs-modules/mailer with Nodemailer transport and Gmail SMTP

I ran this inside apps/backend

npm install @nestjs-modules/mailer nodemailer
npm install --save-dev @types/nodemailer
npm install @nestjs/config


Gmail account for personal use, Tobias (no last name) my birth date.
dictee.app@gmail.com
gmail password: gek/329-BEX*586?
2 step verification to 0176 7862 1094

App passwords on
name: Dictee
app password: ciyv rpoq nssx qlhy


INSTRUCTIONS TO BACKEND FOR SESSION TOKENS

# Player Session Token System

## Background

Currently, player sessions are tracked via `currentGameId` on the Player record. This only tracks whether a player is in a game, not whether they have an active browser session. This allows edge cases like a parent starting two Play Now sessions for the same player in different tabs.

We need a proper session token system that tracks active player browser sessions independently of game state.

---

## How session expiry works

Token expiry is enforced at `select_game` on mount. This page is the natural entry point after every puzzle skip, next, game over, and leave game action. The player always finishes their current puzzle or game before expiry is checked — we never interrupt mid-game or mid-puzzle.

This means no heartbeat is needed. The frontend simply validates the token when entering `select_game`. If the token is missing or expired, the player is redirected to `/`.

---

## Requirements

### Play Now
- On session start, backend first checks if an unexpired token already exists for that player
- If one exists → return error, do not issue a new token
- If none exists → issue a new unique session token tied to the player
- Token stores: `playerId`, `expiresAt` (based on the minute countdown the parent set), `createdAt`
- Frontend stores token in `sessionStorage` (per-tab, auto-cleared on tab close)
- `select_game` validates token on mount — if missing or expired, redirect to `/`
- Tab or browser close automatically clears `sessionStorage`, which orphans the token — these are cleaned up by the backend expiry job and do not permanently block the player

### Create Play Button and Send Invite to Play (future)
- These generate persistent links tied to a player and a calendar of allowed playing times
- Clicking a link checks: is it within an allowed time window, AND does no unexpired token exist for this player?
- If both conditions are met → issue a session token as above
- If either condition fails → block, do not issue a token
- Important: session termination must be fault-tolerant. A session ending due to tab close, network drop, or device shutdown must not permanently block the player. Orphaned tokens expire automatically via `expiresAt`.

### End Game Session (already implemented on frontend)
- Calls `POST /players/clearSession` which currently sets `currentGameId` to null
- This endpoint should also immediately delete any active session token for that player

---

## Session token rules

- Session tokens live in a new `PlayerSession` table (or Redis if preferred)
- One active token per player maximum
- Tokens have a hard `expiresAt` timestamp — this is the only expiry mechanism
- A cleanup job runs periodically to delete tokens past their `expiresAt`, keeping the table clean
- `clearSession` deletes the token immediately regardless of `expiresAt`

---

## What is already in place

- `POST /players/clearSession` — clears `currentGameId`, needs to also invalidate session token
- `Player.currentGameId` — tracks active game, separate from session tracking
- Frontend `sessionStorage` — ready to store token once backend issues it
- `useSessionGuard` hook — currently checks session timer locally, can be extended to validate token against backend
- `select_game` mount check — already fetches fresh player state, natural place to add token validation

---

## What is NOT in scope

- Heartbeat or `lastSeen` tracking — not needed given the navigation checkpoint model
- Interrupting a player mid-game or mid-puzzle — expiry is only checked at `select_game` mount
- Sharing sessions across tabs — `sessionStorage` is intentionally per-tab